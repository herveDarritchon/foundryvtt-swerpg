import { logger } from './logger.mjs'
import { composeEntries, makeEntry, captureSnapshot } from './audit-diff.mjs'
import { buildAuditLogDescriptionFromRegistry, getAuditLogTypeLabelKey } from '../lib/audit/taxonomy.mjs'
import { buildNextSegmentedState, computeAuditLogMetrics } from '../lib/audit/storage.mjs'

/* -------------------------------------------- */
/*  Constantes                                  */
/* -------------------------------------------- */

const AUDIT_LOG_KEY = 'flags.swerpg.logs'
const AUDIT_LOG_SEGS_KEY = 'flags.swerpg.auditLogSegs'
const AUDIT_LOG_INDEX_KEY = 'flags.swerpg.auditLogIndex'
const PENDING_TTL_MS = 30000
const MAX_PENDING = 50
const MAX_RETRIES = 1
const RETRY_DELAY_MS = 1000
const pendingOldStates = new Map()
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/* -------------------------------------------- */
/*  Gardes                                      */
/* -------------------------------------------- */

/**
 * Return true if the changes object only modifies the audit log flag path.
 * @param {object} changes
 */
function isOnlyAuditChange(changes) {
  const flat = _flattenObject(changes)
  const keys = Object.keys(flat)
  return keys.length === 1 && keys[0] === AUDIT_LOG_KEY
}

/**
 * Return true if the actor document is of type "character".
 * @param {object} actor
 */
function isCharacterActor(actor) {
  return actor?.type === 'character'
}

/**
 * Return true if the update options flag this as an internal audit log write.
 * @param {object} options
 */
function isAuditInternalUpdate(options) {
  return options?.swerpgAuditLog === false
}

/**
 * Return true when the local client is the one that initiated the action.
 * Mirrors the pattern used in SwerpgActor._onUpdate to prevent duplicate side-effects
 * across all connected clients in a multiplayer session.
 * @param {string} userId The userId argument provided by the Foundry hook.
 */
function isInitiatingClient(userId) {
  return game.userId === userId
}

/* -------------------------------------------- */
/*  Clone utilitaire                            */
/* -------------------------------------------- */

/**
 * Deep-clone a value using Foundry utilities when available, falling back to structuredClone.
 * @param {*} value
 */
function cloneValue(value) {
  if (value === undefined) return undefined
  return foundry.utils.deepClone?.(value) ?? structuredClone(value)
}

/* -------------------------------------------- */
/*  Anti-fuite mémoire                          */
/* -------------------------------------------- */

/**
 * Remove expired pending entries from the pending state map and warn when the total count is high.
 */
function pruneExpiredPending() {
  const now = Date.now()
  for (const [key, queue] of pendingOldStates) {
    const remaining = queue.filter((p) => now - p.timestamp <= PENDING_TTL_MS)
    if (remaining.length === 0) {
      pendingOldStates.delete(key)
    } else if (remaining.length !== queue.length) {
      pendingOldStates.set(key, remaining)
    }
  }

  const total = countPendingEntries()
  if (total > 100) {
    logger.warn(`[AuditLog] pendingOldStates has ${total} entries. Possible leak.`)
  }
}

/**
 * Return the total number of pending state entries across all actor/user queues.
 */
function countPendingEntries() {
  let count = 0
  for (const queue of pendingOldStates.values()) count += queue.length
  return count
}

/**
 * Evict the oldest pending entries when the pending map would exceed MAX_PENDING after adding incomingCount new entries.
 * @param {number} incomingCount
 */
function evictOldestIfNeeded(incomingCount = 1) {
  const overflow = countPendingEntries() + incomingCount - MAX_PENDING
  if (overflow <= 0) return

  const entries = []
  for (const [key, queue] of pendingOldStates) {
    for (let idx = 0; idx < queue.length; idx++) {
      entries.push({ key, idx, timestamp: queue[idx].timestamp })
    }
  }
  entries.sort((a, b) => a.timestamp - b.timestamp)

  for (const { key, idx } of entries.slice(0, overflow)) {
    const queue = pendingOldStates.get(key)
    if (!queue) continue
    const removed = queue.splice(idx, 1)
    if (queue.length === 0) {
      pendingOldStates.delete(key)
    }
  }
}

/* -------------------------------------------- */
/*  File pending par actor:userId               */
/* -------------------------------------------- */

/**
 * Build the composite map key for a pending entry keyed by actor UUID and user ID.
 * @param {object} actor
 * @param {string} userId
 */
function getPendingKey(actor, userId) {
  return `${actor.uuid}:${userId}`
}

/**
 * Append an old-state entry to the pending queue for the given actor and user.
 * @param {object} actor
 * @param {string} userId
 * @param {object} entry
 */
function pushPendingEntry(actor, userId, entry) {
  const key = getPendingKey(actor, userId)
  const queue = pendingOldStates.get(key) ?? []
  queue.push(entry)
  pendingOldStates.set(key, queue)
}

/**
 * Remove and return the oldest pending entry for the given actor and user, or undefined when the queue is empty.
 * Used as a fallback when no operation ID is available.
 * @param {object} actor
 * @param {string} userId
 */
function shiftPendingEntry(actor, userId) {
  const key = getPendingKey(actor, userId)
  const queue = pendingOldStates.get(key)
  if (!queue?.length) return undefined
  const entry = queue.shift()
  if (queue.length === 0) pendingOldStates.delete(key)
  return entry
}

/**
 * Remove and return the pending entry matching the given operation ID for the given actor and user.
 * Returns undefined when no matching entry is found.
 * Entries that do not match are left in the queue so they can be claimed by their own update or expired by the TTL.
 * @param {object} actor
 * @param {string} userId
 * @param {string} opId
 */
function popPendingEntryByOpId(actor, userId, opId) {
  const key = getPendingKey(actor, userId)
  const queue = pendingOldStates.get(key)
  if (!queue?.length) return undefined
  const idx = queue.findIndex((e) => e.opId === opId)
  if (idx === -1) return undefined
  const [entry] = queue.splice(idx, 1)
  if (queue.length === 0) pendingOldStates.delete(key)
  return entry
}

/* -------------------------------------------- */
/*  Capture old state (générique par chemins)   */
/* -------------------------------------------- */

/**
 * Return true if the dot-notation path contains a Foundry deletion segment (".-=").
 * @param {string} path
 */
function isDeletionPath(path) {
  return path.includes('.-=')
}

/**
 * Return the dot-notation path of the parent object targeted by a Foundry deletion segment, or null when not found.
 * @param {string} path
 */
function getDeletionParentPath(path) {
  const segments = path.split('.')
  const deletionIndex = segments.findIndex((segment) => segment.startsWith('-='))
  if (deletionIndex <= 0) return null
  return segments.slice(0, deletionIndex).join('.')
}

/**
 * Capture the old values of every path present in changes from the document source, handling deletion paths.
 * @param {object} source
 * @param {object} changes
 */
function snapshotOldState(source, changes) {
  const oldState = {}
  const flatChanges = _flattenObject(changes)

  for (const path of Object.keys(flatChanges)) {
    if (!path.startsWith('system.')) continue

    if (isDeletionPath(path)) {
      const parentPath = getDeletionParentPath(path)
      if (!parentPath) continue

      const parentValue = _getProperty(source, parentPath)
      if (parentValue !== undefined) {
        _setProperty(oldState, parentPath, cloneValue(parentValue))
      }
      continue
    }

    const value = _getProperty(source, path)
    if (value !== undefined) {
      _setProperty(oldState, path, cloneValue(value))
    }
  }

  return oldState
}

/* -------------------------------------------- */
/*  Gestion d'erreur                            */
/* -------------------------------------------- */

/**
 * Log a write failure, notify the user, and send a GM whisper with the error details.
 * @param {object} actor
 * @param {Error} err
 */
async function handleWriteError(actor, err) {
  logger.error(`[AuditLog] Write failed for actor "${actor.name}" (${actor.id})`, err)
  ui.notifications?.warn?.(game.i18n.format('SWERPG.AUDIT.WRITE_FAILED', { actor: actor.name }))

  if (game.user?.isGM) {
    try {
      const content = await foundry.applications.handlebars.renderTemplate('systems/swerpg/templates/chat/audit-log-warning.hbs', {
        actorName: actor.name,
        errorMessage: err.message,
      })
      await ChatMessage.create({
        content,
        speaker: ChatMessage.getSpeaker({ actor }),
        whisper: ChatMessage.getWhisperRecipients('GM'),
        type: 'whisper',
      })
    } catch (chatErr) {
      logger.warn('[AuditLog] Failed to send GM whisper for write error:', chatErr)
    }
  }
}

/* -------------------------------------------- */
/*  Écriture batch fire-and-forget              */
/* -------------------------------------------- */

/**
 * Append audit entries to the actor's log using segmented storage, trimming to the configured max, with retry on failure.
 * Migrates legacy flat-format actors transparently on first write.
 * Emits a volume warning when the journal approaches the configured ceiling.
 * @param {object} actor
 * @param {object[]} entries
 */
async function writeLogEntries(actor, entries) {
  if (!entries.length) return

  const maxEntries = readMaxLogEntries()

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const actorFlags = cloneValue(_getProperty(actor, 'flags.swerpg') ?? {})

      const { auditLogSegs, auditLogIndex, clearLegacy } = buildNextSegmentedState(actorFlags, entries, maxEntries)

      const updatePayload = {
        [AUDIT_LOG_SEGS_KEY]: auditLogSegs,
        [AUDIT_LOG_INDEX_KEY]: auditLogIndex,
      }

      // When migrating from legacy flat format, clear the old key to avoid duplicates on future reads.
      if (clearLegacy) {
        updatePayload[AUDIT_LOG_KEY] = null
      }

      await actor.update(updatePayload, { swerpgAuditLog: false })

      // Volume observability: warn when nearing the configured ceiling.
      const metrics = computeAuditLogMetrics({ ...actorFlags, auditLogSegs, auditLogIndex }, maxEntries)
      if (metrics.isNearLimit) {
        logger.warn(
          `[AuditLog] Journal for actor "${actor.name}" (${actor.id}) is at ${Math.round(metrics.usageRatio * 100)}% capacity` +
            ` (${metrics.totalCount}/${maxEntries} entries, ~${metrics.approximatePayloadSize} bytes, ${metrics.segmentCount} segments).`,
        )
      }

      sendChatForAuditEntries(actor, entries)
      return
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      await handleWriteError(actor, err)
    }
  }
}

/**
 * Read the configured maximum number of audit log entries from game settings, defaulting to 500.
 */
function readMaxLogEntries() {
  try {
    return game.settings.get('swerpg', 'auditLogMaxEntries') ?? 500
  } catch {
    return 500
  }
}

/**
 * Return true when the GM has enabled the audit chat summary mode.
 * Defaults to false (historical one-card-per-entry behaviour) on any error.
 */
function readAuditChatSummaryEnabled() {
  try {
    return game.settings.get('swerpg', 'auditLogChatSummary') ?? false
  } catch {
    return false
  }
}

/* -------------------------------------------- */
/*  Helpers exportés pour tests                 */
/* -------------------------------------------- */

export {
  isOnlyAuditChange,
  isInitiatingClient,
  snapshotOldState,
  cloneValue,
  evictOldestIfNeeded,
  flushPending,
  countPendingEntries,
  getPendingKey,
  shiftPendingEntry,
  pushPendingEntry,
  popPendingEntryByOpId,
  isDeletionPath,
  writeLogEntries,
  handleWriteError,
  pruneExpiredPending,
  readMaxLogEntries,
  readAuditChatSummaryEnabled,
  sendChatForAuditEntries,
  onCreateItem,
  recordTalentNodePurchase,
  recordTalentNodeOperation,
  recordItemPurchase,
  recordItemSale,
  AUDIT_LOG_SEGS_KEY,
  AUDIT_LOG_INDEX_KEY,
}

/* -------------------------------------------- */
/*  Handlers (exportés)                         */
/* -------------------------------------------- */

/**
 * Capture the old actor state before an update and push it to the pending queue.
 * Stamps a unique operation ID onto `options._swerpgOpId` so the matching `onUpdateActor`
 * call can retrieve this specific snapshot, even when a preceding update was rejected and
 * left an orphaned entry in the queue.
 * @param {object} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
export function onPreUpdateActor(actor, changes, options, userId) {
  if (!isInitiatingClient(userId)) return
  if (isAuditInternalUpdate(options)) return
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  pruneExpiredPending()
  evictOldestIfNeeded(1)

  const opId = _generateOpId()
  // Stamp the operation ID onto the shared options object so Foundry forwards it
  // to the companion updateActor hook call for this same operation.
  options._swerpgOpId = opId

  const oldState = snapshotOldState(actor._source, changes)

  pushPendingEntry(actor, userId, {
    opId,
    oldState,
    changes: cloneValue(changes),
    userId,
    timestamp: Date.now(),
  })
}

/**
 * Compare the applied changes against the previously captured state and write the resulting audit entries.
 * Uses the operation ID stamped by `onPreUpdateActor` to retrieve the correct pending snapshot,
 * preventing a successful update from consuming the oldState of a previously rejected update.
 * @param {object} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
export function onUpdateActor(actor, changes, options, userId) {
  if (!isInitiatingClient(userId)) return
  if (isAuditInternalUpdate(options)) return
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  const opId = options?._swerpgOpId
  const pending = opId ? popPendingEntryByOpId(actor, userId, opId) : shiftPendingEntry(actor, userId)
  if (!pending) return
  if (Date.now() - pending.timestamp > PENDING_TTL_MS) return

  const entries = composeEntries(pending.oldState, changes, actor, pending.userId)
  if (!entries.length) return

  writeLogEntries(actor, entries)
}

/* -------------------------------------------- */
/*  createItem handler (talent detection)        */
/* -------------------------------------------- */

/**
 * Record a talent purchase audit entry when a talent item is created on a character actor.
 * @param {object} item
 * @param {object} data
 * @param {object} options
 * @param {string} userId
 */
function onCreateItem(item, data, options, userId) {
  if (!isInitiatingClient(userId)) return
  if (item.parent?.type !== 'character') return
  if (item.type !== 'talent') return

  const ts = Date.now()
  const snapshot = captureSnapshot(item.parent)
  const user = game.users?.get(userId) ?? null
  const cost = item.system?.cost ?? 5
  const ranks = item.system?.ranks ?? 1

  const entry = makeEntry({
    type: 'talent.purchase',
    data: {
      talentId: item.id,
      talentName: item.name,
      cost,
      ranks,
    },
    xpDelta: -cost,
    ts,
    userId,
    user,
    snapshot,
  })

  writeLogEntries(item.parent, [entry])
}

/* -------------------------------------------- */
/*  Shared talent node audit bridge             */
/* -------------------------------------------- */

/**
 * Build entry data for a talent node operation.
 * @param {object} actor
 * @param {object} data
 * @returns {object}
 */
function buildTalentNodeEntryData(actor, data) {
  return {
    actorId: actor.id,
    specializationId: data.specializationId,
    treeId: data.treeId,
    treeUuid: data.treeUuid ?? null,
    nodeId: data.nodeId,
    talentId: data.talentId,
    talentUuid: data.talentUuid ?? null,
    cost: data.cost,
    source: 'specialization-tree',
    ...(data.previousXp !== undefined ? { previousXp: data.previousXp } : {}),
    ...(data.nextXp !== undefined ? { nextXp: data.nextXp } : {}),
    ...(data.reasonCode !== undefined ? { reasonCode: data.reasonCode } : {}),
    ...(data.reason !== undefined ? { reason: data.reason } : {}),
  }
}

/**
 * Record a talent node operation (purchase or forget) in the audit log.
 * Non-blocking: failures are caught internally without throwing.
 *
 * @param {object} actor The actor document instance.
 * @param {'purchase'|'forget'} operation The operation type.
 * @param {'succeeded'|'failed'} status The operation outcome.
 * @param {object} data
 * @param {string} data.specializationId
 * @param {string} data.treeId
 * @param {string|null} [data.treeUuid]
 * @param {string} data.nodeId
 * @param {string} data.talentId
 * @param {string|null} [data.talentUuid]
 * @param {number} data.cost
 * @param {number} [data.previousXp]
 * @param {number} [data.nextXp]
 * @param {string} [data.reasonCode]
 * @param {string} [data.reason]
 */
async function recordTalentNodeOperation(actor, operation, status, data) {
  const type = `talent-node-${operation}-${status}`
  const xpDelta = operation === 'purchase' ? -data.cost : data.cost

  const ts = Date.now()
  const snapshot = captureSnapshot(actor)
  const user = game.users?.get(game.user?.id) ?? null

  const entry = makeEntry({
    type,
    data: buildTalentNodeEntryData(actor, data),
    xpDelta,
    ts,
    userId: game.user?.id,
    user,
    snapshot,
  })

  await writeLogEntries(actor, [entry])
}

/**
 * Record a talent node purchase in the audit log (backward-compatible wrapper).
 * @param {object} actor
 * @param {object} purchaseData
 */
async function recordTalentNodePurchase(actor, purchaseData) {
  return recordTalentNodeOperation(actor, 'purchase', 'succeeded', purchaseData)
}

/**
 * Record an item purchase audit entry when an item is bought via Market.
 * Non-blocking: failures are caught internally without throwing.
 *
 * @param {object} actor The actor document instance.
 * @param {object} purchaseData
 * @param {string} purchaseData.itemName
 * @param {string} purchaseData.itemType
 * @param {number} purchaseData.price
 * @param {number} [purchaseData.quantity=1]
 * @param {number} purchaseData.creditsAfter
 * @param {string} [purchaseData.itemId] The ID of the purchased item document (optional, for audit traceability).
 * @param {import('../lib/market/commerce-outcomes.mjs').CommerceOutcome|null} [purchaseData.outcome=null]
 *   Optional commerce outcome from a narrative dice test. When present, the audit entry
 *   carries `priceModifier`, `narrativeKeys`, and `outcomeLabel` for chat display.
 */
async function recordItemPurchase(actor, { itemName, itemType, price, quantity = 1, creditsAfter, itemId, outcome = null }) {
  const ts = Date.now()
  const creditsBefore = actor.system?.creditBudget?.availableCredits ?? actor.system?.credits ?? null
  const creditsDelta = creditsBefore !== null && creditsAfter !== null ? creditsBefore - creditsAfter : null
  const snapshot = { creditsBefore, creditsAfter, creditsDelta }
  const user = game.users?.get(game.user?.id) ?? null
  const creditDelta = -(price * quantity)

  const entry = {
    ...makeEntry({
      type: 'item.purchase',
      data: {
        itemName,
        itemType,
        price,
        quantity,
        itemId,
      },
      xpDelta: 0,
      ts,
      userId: game.user?.id,
      user,
      snapshot,
    }),
    creditDelta,
    ...(outcome !== null ? { outcome } : {}),
  }

  await writeLogEntries(actor, [entry])
}

/**
 * Record an item sale audit entry when an item is sold via Market.
 * Non-blocking: failures are caught internally without throwing.
 *
 * @param {object} actor The actor document instance.
 * @param {object} saleData
 * @param {string} saleData.itemName
 * @param {string} saleData.itemType
 * @param {number} saleData.basePrice
 * @param {number} saleData.resalePrice      Total resale credit received (resaleUnitPrice × quantity).
 * @param {number} saleData.fraction
 * @param {number} [saleData.quantity=1]     Number of units sold.
 * @param {string} [saleData.negotiationOutcome='failure']
 * @param {number} saleData.creditsAfter
 * @param {string} [saleData.itemId]
 */
async function recordItemSale(
  actor,
  { itemName, itemType, basePrice, resalePrice, fraction, quantity = 1, negotiationOutcome = 'failure', creditsAfter, itemId },
) {
  const ts = Date.now()
  const creditsBefore = actor.system?.creditBudget?.availableCredits ?? actor.system?.credits ?? null
  const creditsDelta = creditsBefore !== null && creditsAfter !== null ? creditsAfter - creditsBefore : null
  const snapshot = { creditsBefore, creditsAfter, creditsDelta }
  const user = game.users?.get(game.user?.id) ?? null

  const entry = {
    ...makeEntry({
      type: 'item.sale',
      data: {
        itemName,
        itemType,
        basePrice,
        resalePrice,
        fraction,
        quantity,
        negotiationOutcome,
        itemId,
      },
      xpDelta: 0,
      ts,
      userId: game.user?.id,
      user,
      snapshot,
    }),
    creditDelta: resalePrice,
  }

  await writeLogEntries(actor, [entry])
}

/* -------------------------------------------- */
/*  Émission de messages chat depuis l'audit    */
/* -------------------------------------------- */

/* -------------------------------------------- */
/*  Chat context helpers                        */
/* -------------------------------------------- */

/**
 * Canonical glyph (FontAwesome) for each audit log variant.
 * Local copy so `utils/audit-log.mjs` has no dependency on `applications/`.
 */
const CHAT_VARIANT_GLYPHS = Object.freeze({
  add: 'fa-solid fa-plus',
  remove: 'fa-solid fa-minus',
  gain: 'fa-solid fa-arrow-down',
  change: 'fa-solid fa-arrows-rotate',
  fail: 'fa-solid fa-xmark',
})

/**
 * Return the glyph CSS class for a given audit log variant.
 * @param {string} variant
 * @returns {string}
 */
function getChatVariantGlyph(variant) {
  return CHAT_VARIANT_GLYPHS[variant] ?? CHAT_VARIANT_GLYPHS.change
}

/**
 * Build the i18n helpers object for the taxonomy registry using game globals.
 * @returns {import('../lib/audit/taxonomy.mjs').I18nHelpers}
 */
function buildI18nHelpers() {
  return {
    localize: (key) => game.i18n.localize(key),
    format: (key, data) => game.i18n.format(key, data),
    characteristics: game.system?.config?.CHARACTERISTICS ?? null,
  }
}

/* -------------------------------------------- */
/*  Chat context handlers per type              */
/* -------------------------------------------- */

/**
 * @typedef {object} ChatContext
 * @property {string}      actorImg
 * @property {string}      actorName
 * @property {string}      eventLabel
 * @property {string|null} previousValue
 * @property {string}      nextValue
 * @property {string|null} description
 * @property {string|null} metaLeft
 * @property {string|null} metaRight
 * @property {boolean}     hasMeta
 * @property {string}      variant
 * @property {string}      variantGlyph
 */

/**
 * Map of per-type chat context handlers.
 * Each handler receives (context, entry, data, snapshot) and mutates context in place.
 * All type-specific logic lives here — no fallback switch required.
 *
 * @type {Record<string, (context: ChatContext, entry: object, data: object, snapshot: object) => void>}
 */
const CHAT_HANDLERS = {
  'skill.train'(context, entry, data) {
    const isFree = data.isFree === true
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN')
    context.previousValue = String(data.oldRank)
    context.nextValue = String(data.newRank)
    context.variant = isFree ? 'gain' : 'add'
    context.metaLeft = isFree ? game.i18n.localize('SKILL.CHAT.FREE_COST') : game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
  },

  'skill.forget'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET')
    context.previousValue = String(data.oldRank)
    context.nextValue = String(data.newRank)
    context.variant = 'remove'
    context.metaLeft = game.i18n.format('SKILL.CHAT.REFUND', { cost: data.cost })
  },

  'characteristic.increase'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE')
    context.previousValue = String(data.oldValue)
    context.nextValue = String(data.newValue)
    context.variant = 'add'
    context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
  },

  'xp.spend'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.XP_SPEND')
    context.nextValue = `-${data.amount} XP`
    context.variant = 'remove'
    context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.amount })
  },

  'xp.refund'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.XP_REFUND')
    context.nextValue = `+${data.amount} XP`
    context.variant = 'gain'
    context.metaLeft = game.i18n.format('SKILL.CHAT.REFUND', { cost: data.amount })
  },

  'xp.grant'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.XP_GRANT')
    context.nextValue = `+${data.amount} XP`
    context.variant = 'gain'
    context.metaLeft = game.i18n.format('SKILL.CHAT.REFUND', { cost: data.amount })
  },

  'xp.remove'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.XP_REMOVE')
    context.nextValue = `-${data.amount} XP`
    context.variant = 'remove'
    context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.amount })
  },

  'species.set'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SPECIES_SET')
    const noneLabel = game.i18n.localize('SWERPG.AUDIT_LOG.NONE')
    context.previousValue = data.oldSpecies ?? noneLabel
    context.nextValue = data.newSpecies ?? noneLabel
    context.variant = 'change'
  },

  'career.set'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.CAREER_SET')
    const noneLabel = game.i18n.localize('SWERPG.AUDIT_LOG.NONE')
    context.previousValue = data.oldCareer ?? noneLabel
    context.nextValue = data.newCareer ?? noneLabel
    context.variant = 'change'
  },

  'specialization.add'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD')
    context.nextValue = data.specializationName ?? data.specializationId ?? ''
    context.variant = 'add'
    if (data.cost) {
      context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
    }
  },

  'specialization.remove'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE')
    context.nextValue = data.specializationName ?? data.specializationId ?? ''
    context.variant = 'remove'
    if (data.cost) {
      context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
    }
  },

  'talent.purchase'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE')
    context.nextValue = data.talentName ?? data.talentId ?? ''
    context.variant = 'add'
    context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
  },

  'talent-node-purchase'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE')
    context.nextValue = data.talentId ?? data.nodeId ?? ''
    context.variant = 'add'
    if (data.cost) {
      context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
    }
  },

  'talent-node-purchase-succeeded'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_SUCCEEDED')
    context.nextValue = data.talentId ?? data.nodeId ?? ''
    context.variant = 'add'
    if (data.cost) {
      context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
    }
  },

  'talent-node-purchase-failed'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE_FAILED')
    context.nextValue = data.nodeId ?? ''
    context.description = game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED', {
      reasonCode: data.reasonCode ?? '',
      nodeId: data.nodeId ?? '',
    })
    context.variant = 'fail'
  },

  'talent-node-forget-succeeded'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_SUCCEEDED')
    context.nextValue = data.talentId ?? data.nodeId ?? ''
    context.variant = 'remove'
    if (data.cost) {
      context.metaLeft = game.i18n.format('SKILL.CHAT.REFUND', { cost: data.cost })
    }
  },

  'talent-node-forget-failed'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_FORGET_FAILED')
    context.nextValue = data.nodeId ?? ''
    context.description = game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_FORGET_FAILED', {
      reasonCode: data.reasonCode ?? '',
      nodeId: data.nodeId ?? '',
    })
    context.variant = 'fail'
  },

  'advancement.level'(context, entry, data) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL')
    context.previousValue = String(data.oldLevel)
    context.nextValue = String(data.newLevel)
    context.variant = 'change'
  },

  'item.purchase'(context, entry, data, snapshot) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE')
    context.nextValue = `${data.itemName ?? ''} (${data.itemType ?? ''})`
    context.variant = 'add'
    context.metaLeft = game.i18n.format('SWERPG.AUDIT_LOG.META.PRICE', { price: data.price ?? 0 })

    // Enrich with commerce outcome narrative when present (from availability check narrative dice).
    // AppliedModifier is routed to description to avoid overwriting the credits-remaining slot (metaRight).
    const outcome = entry.outcome ?? null
    if (outcome) {
      const descriptionParts = []
      if (outcome.priceModifier !== 0) {
        const modifierPct = Math.round(outcome.priceModifier * 100)
        const modifierStr = modifierPct > 0 ? `+${modifierPct}%` : `${modifierPct}%`
        descriptionParts.push(game.i18n.format('MARKET.CommerceOutcome.AppliedModifier', { modifier: modifierStr }))
      }
      if (outcome.narrativeKeys?.length > 0) {
        const narratives = outcome.narrativeKeys.map((k) => game.i18n.localize(k)).join('; ')
        descriptionParts.push(narratives)
      }
      if (descriptionParts.length > 0) {
        context.description = descriptionParts.join(' — ')
      }
    }

    if (snapshot.creditsAfter !== undefined && snapshot.creditsAfter !== null) {
      context.metaRight = game.i18n.format('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING', { credits: snapshot.creditsAfter })
    }
    context.hasMeta = true
  },

  'item.sale'(context, entry, data, snapshot) {
    context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ITEM_SALE')
    context.nextValue = `${data.itemName ?? ''} (${data.itemType ?? ''})`
    context.variant = 'gain'
    context.metaLeft = game.i18n.format('SWERPG.AUDIT_LOG.META.SOLD_FOR', { price: data.resalePrice ?? 0 })
    if (snapshot.creditsAfter !== undefined && snapshot.creditsAfter !== null) {
      context.metaRight = game.i18n.format('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING', { credits: snapshot.creditsAfter })
    }
    context.hasMeta = true
  },
}

/**
 * Build the template context for a chat message from a single audit entry.
 *
 * Produces a generic audit-entry view-model with explicit fields:
 * - eventLabel: human-readable event label
 * - previousValue: old value (optional, for change events)
 * - nextValue: new value displayed prominently
 * - description: secondary description (optional)
 * - metaLeft: left footer metadata (optional)
 * - metaRight: right footer metadata (optional)
 * - hasMeta: true when at least one footer metadata is present
 * - variant: CSS modifier class ('change' | 'add' | 'remove' | 'gain' | 'fail')
 *
 * @param {object} actor The actor document
 * @param {object} entry A single audit log entry
 * @returns {ChatContext} Context for audit-entry.hbs
 */
function _buildChatContext(actor, entry) {
  const type = entry.type
  const data = entry.data ?? {}
  const snapshot = entry.snapshot ?? {}
  const xpDelta = entry.xpDelta ?? 0

  const context = {
    actorImg: actor.img,
    actorName: actor.name,
    eventLabel: '',
    previousValue: null,
    nextValue: '',
    description: null,
    metaLeft: null,
    metaRight: null,
    hasMeta: false,
    variant: 'change',
  }

  const handler = CHAT_HANDLERS[type]
  if (handler) {
    handler(context, entry, data, snapshot)
  } else {
    // Unknown type: fall back to registry description
    const i18nHelpers = buildI18nHelpers()
    const desc = buildAuditLogDescriptionFromRegistry(entry, i18nHelpers)
    context.eventLabel = game.i18n.localize(getAuditLogTypeLabelKey(type))
    context.nextValue = desc
    context.variant = xpDelta > 0 ? 'gain' : xpDelta < 0 ? 'remove' : 'change'
    if (xpDelta !== 0) {
      context.metaLeft =
        xpDelta > 0 ? game.i18n.format('SKILL.CHAT.REFUND', { cost: xpDelta }) : game.i18n.format('SKILL.CHAT.COST', { cost: Math.abs(xpDelta) })
    }
  }

  if (context.metaLeft !== null && snapshot.xpAvailable !== undefined) {
    context.metaRight = game.i18n.format('SKILL.CHAT.REMAINING', { xp: snapshot.xpAvailable })
  }

  context.hasMeta = context.metaLeft !== null || context.metaRight !== null
  context.variantGlyph = getChatVariantGlyph(context.variant)

  return context
}

/**
 * Send a single summary chat card for a batch of audit entries.
 * Non-blocking: failures are caught internally.
 * @param {object} actor
 * @param {object[]} entries
 */
async function _sendSummaryChatCard(actor, entries) {
  try {
    const items = entries.map((entry) => _buildChatContext(actor, entry))
    const summaryContext = {
      actorImg: actor.img,
      actorName: actor.name,
      count: entries.length,
      title: game.i18n.format('SWERPG.AUDIT_LOG.CHAT_SUMMARY.TITLE', { count: entries.length }),
      items,
    }

    const content = await foundry.applications.handlebars.renderTemplate('systems/swerpg/templates/chat/audit-entry-summary.hbs', summaryContext)

    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: {
        swerpg: {
          auditChat: true,
          auditSummary: true,
          action: 'audit',
          auditEntryIds: entries.map((e) => e.id),
        },
      },
    })
  } catch (err) {
    logger.warn('[AuditLog] Failed to send summary chat card', err)
  }
}

/**
 * Send a chat message for each audit entry.
 * Non-blocking: failures are caught internally.
 * When the auditLogChatSummary setting is enabled and the batch contains more than one entry,
 * a single summary card is sent instead of one card per entry.
 * @param {object} actor
 * @param {object[]} entries
 */
async function sendChatForAuditEntries(actor, entries) {
  if (entries.length > 1 && readAuditChatSummaryEnabled()) {
    await _sendSummaryChatCard(actor, entries)
    return
  }

  for (const entry of entries) {
    try {
      const context = _buildChatContext(actor, entry)
      const content = await foundry.applications.handlebars.renderTemplate('systems/swerpg/templates/chat/audit-entry.hbs', context)

      await ChatMessage.create({
        content,
        speaker: ChatMessage.getSpeaker({ actor }),
        flags: {
          swerpg: {
            auditChat: true,
            action: 'audit',
            auditType: entry.type,
            auditEntryId: entry.id,
          },
        },
      })
    } catch (err) {
      logger.warn(`[AuditLog] Failed to send chat for ${entry.type}`, err)
    }
  }
}

/* -------------------------------------------- */
/*  Point d'entrée unique                       */
/* -------------------------------------------- */

/**
 * Register Foundry hooks for the audit log subsystem.
 */
export function registerAuditLogHooks() {
  Hooks.on('preUpdateActor', onPreUpdateActor)
  Hooks.on('updateActor', onUpdateActor)
  Hooks.on('createItem', onCreateItem)
}

/* -------------------------------------------- */
/*  Utilitaires internes                        */
/* -------------------------------------------- */

/**
 * Recursively flatten a nested object into dot-notation key/value pairs.
 * @param {object} obj
 * @param {string} prefix
 */
function _flattenObject(obj, prefix = '') {
  const result = {}
  if (obj === null || obj === undefined) return result
  for (const key of Object.keys(obj)) {
    const prefixed = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, _flattenObject(value, prefixed))
    } else {
      result[prefixed] = value
    }
  }
  return result
}

/**
 * Retrieve the value at a dot-notation path from a nested object, returning undefined when any segment is missing.
 * @param {object} object
 * @param {string} path
 */
function _getProperty(object, path) {
  const keys = path.split('.')
  let current = object
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

/**
 * Set the value at a dot-notation path on a nested object, creating intermediate objects as needed.
 * @param {object} object
 * @param {string} path
 * @param {*} value
 */
function _setProperty(object, path, value) {
  const keys = path.split('.')
  let current = object
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) current[key] = {}
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

/* -------------------------------------------- */
/*  Utilitaires exportés pour tests             */
/* -------------------------------------------- */

/**
 * Clear all pending old-state entries from the map (used for testing and reset scenarios).
 */
function flushPending() {
  pendingOldStates.clear()
}

/* -------------------------------------------- */
/*  Génération d'identifiant d'opération        */
/* -------------------------------------------- */

/**
 * Generate a unique operation identifier for correlating pre/post update hooks.
 * Uses crypto.randomUUID when available (modern browsers and Node 19+), otherwise
 * falls back to a high-resolution timestamp combined with a random suffix.
 * @returns {string}
 */
function _generateOpId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

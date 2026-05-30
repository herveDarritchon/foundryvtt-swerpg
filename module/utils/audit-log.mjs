import { logger } from './logger.mjs'
import { composeEntries, makeEntry, captureSnapshot } from './audit-diff.mjs'
import { buildAuditLogDescription } from '../applications/character-audit-log.mjs'

/* -------------------------------------------- */
/*  Constantes                                  */
/* -------------------------------------------- */

const AUDIT_LOG_KEY = 'flags.swerpg.logs'
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
 * Append audit entries to the actor's log flag, trimming to the configured max, with retry on failure.
 * @param {object} actor
 * @param {object[]} entries
 */
async function writeLogEntries(actor, entries) {
  if (!entries.length) return

  const maxEntries = readMaxLogEntries()

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const currentLogs = cloneValue(_getProperty(actor, AUDIT_LOG_KEY) ?? [])
      const nextLogs = [...currentLogs, ...entries]

      if (nextLogs.length > maxEntries) {
        nextLogs.splice(0, nextLogs.length - maxEntries)
      }

      await actor.update({ [AUDIT_LOG_KEY]: nextLogs }, { swerpgAuditLog: false })
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

/* -------------------------------------------- */
/*  Helpers exportés pour tests                 */
/* -------------------------------------------- */

export {
  isOnlyAuditChange,
  snapshotOldState,
  cloneValue,
  evictOldestIfNeeded,
  flushPending,
  countPendingEntries,
  getPendingKey,
  shiftPendingEntry,
  pushPendingEntry,
  isDeletionPath,
  writeLogEntries,
  handleWriteError,
  pruneExpiredPending,
  readMaxLogEntries,
  sendChatForAuditEntries,
  onCreateItem,
  recordTalentNodePurchase,
  recordTalentNodeOperation,
}

/* -------------------------------------------- */
/*  Handlers (exportés)                         */
/* -------------------------------------------- */

/**
 * Capture the old actor state before an update and push it to the pending queue.
 * @param {object} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
export function onPreUpdateActor(actor, changes, options, userId) {
  if (isAuditInternalUpdate(options)) return
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  pruneExpiredPending()
  evictOldestIfNeeded(1)

  const oldState = snapshotOldState(actor._source, changes)

  pushPendingEntry(actor, userId, {
    oldState,
    changes: cloneValue(changes),
    userId,
    timestamp: Date.now(),
  })
}

/**
 * Compare the applied changes against the previously captured state and write the resulting audit entries.
 * @param {object} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
export function onUpdateActor(actor, changes, options, userId) {
  if (isAuditInternalUpdate(options)) return
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  const pending = shiftPendingEntry(actor, userId)
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

/* -------------------------------------------- */
/*  Émission de messages chat depuis l'audit    */
/* -------------------------------------------- */

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
 * @returns {object} Context for audit-entry.hbs
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

  switch (type) {
    case 'skill.train': {
      const isFree = data.isFree === true
      context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN')
      context.previousValue = String(data.oldRank)
      context.nextValue = String(data.newRank)
      context.variant = isFree ? 'gain' : 'add'
      context.metaLeft = isFree ? game.i18n.localize('SKILL.CHAT.FREE_COST') : game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
      break
    }

    case 'skill.forget': {
      context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET')
      context.previousValue = String(data.oldRank)
      context.nextValue = String(data.newRank)
      context.variant = 'remove'
      context.metaLeft = game.i18n.format('SKILL.CHAT.REFUND', { cost: data.cost })
      break
    }

    case 'characteristic.increase': {
      context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE')
      context.previousValue = String(data.oldValue)
      context.nextValue = String(data.newValue)
      context.variant = 'add'
      context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
      break
    }

    case 'xp.spend':
    case 'xp.refund':
    case 'xp.grant':
    case 'xp.remove': {
      const isGain = type === 'xp.grant' || type === 'xp.refund'
      context.eventLabel = game.i18n.localize(
        `SWERPG.AUDIT_LOG.TYPE.${type === 'xp.spend' ? 'XP_SPEND' : type === 'xp.refund' ? 'XP_REFUND' : type === 'xp.grant' ? 'XP_GRANT' : 'XP_REMOVE'}`,
      )
      context.nextValue = isGain ? `+${data.amount} XP` : `-${data.amount} XP`
      context.variant = isGain ? 'gain' : 'remove'
      context.metaLeft = isGain ? game.i18n.format('SKILL.CHAT.REFUND', { cost: data.amount }) : game.i18n.format('SKILL.CHAT.COST', { cost: data.amount })
      break
    }

    case 'species.set':
    case 'career.set': {
      const isSpecies = type === 'species.set'
      context.eventLabel = game.i18n.localize(isSpecies ? 'SWERPG.AUDIT_LOG.TYPE.SPECIES_SET' : 'SWERPG.AUDIT_LOG.TYPE.CAREER_SET')
      const noneLabel = game.i18n.localize('SWERPG.AUDIT_LOG.NONE')
      const oldV = data.oldSpecies ?? data.oldCareer ?? null
      const newV = data.newSpecies ?? data.newCareer ?? null
      context.previousValue = oldV ?? noneLabel
      context.nextValue = newV ?? noneLabel
      context.variant = 'change'
      break
    }

    case 'specialization.add':
    case 'specialization.remove': {
      const isAdd = type === 'specialization.add'
      context.eventLabel = game.i18n.localize(isAdd ? 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD' : 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE')
      context.nextValue = data.specializationName ?? data.specializationId ?? ''
      context.variant = isAdd ? 'add' : 'remove'
      if (data.cost) {
        context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
      }
      break
    }

    case 'talent.purchase': {
      context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE')
      context.nextValue = data.talentName ?? data.talentId ?? ''
      context.variant = 'add'
      context.metaLeft = game.i18n.format('SKILL.CHAT.COST', { cost: data.cost })
      break
    }

    case 'talent-node-purchase-succeeded':
    case 'talent-node-purchase-failed':
    case 'talent-node-forget-succeeded':
    case 'talent-node-forget-failed': {
      const isSuccess = type.endsWith('succeeded')
      const isPurchase = type.includes('purchase')
      context.eventLabel = game.i18n.localize(`SWERPG.AUDIT_LOG.TYPE.${type.replace(/[-.]/g, '_').toUpperCase()}`)
      if (isSuccess) {
        context.nextValue = data.talentId ?? data.nodeId ?? ''
        context.variant = isPurchase ? 'add' : 'remove'
        if (data.cost) {
          context.metaLeft = isPurchase ? game.i18n.format('SKILL.CHAT.COST', { cost: data.cost }) : game.i18n.format('SKILL.CHAT.REFUND', { cost: data.cost })
        }
      } else {
        context.nextValue = data.nodeId ?? ''
        context.description = game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED', {
          reasonCode: data.reasonCode ?? '',
          nodeId: data.nodeId ?? '',
        })
        context.variant = 'fail'
      }
      break
    }

    case 'advancement.level': {
      context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL')
      context.previousValue = String(data.oldLevel)
      context.nextValue = String(data.newLevel)
      context.variant = 'change'
      break
    }

    default: {
      const desc = buildAuditLogDescription(entry)
      context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.UNKNOWN')
      context.nextValue = desc
      context.variant = xpDelta > 0 ? 'gain' : xpDelta < 0 ? 'remove' : 'change'
      if (xpDelta !== 0) {
        context.metaLeft =
          xpDelta > 0 ? game.i18n.format('SKILL.CHAT.REFUND', { cost: xpDelta }) : game.i18n.format('SKILL.CHAT.COST', { cost: Math.abs(xpDelta) })
      }
    }
  }

  if (context.metaLeft !== null && snapshot.xpAvailable !== undefined) {
    context.metaRight = game.i18n.format('SKILL.CHAT.REMAINING', { xp: snapshot.xpAvailable })
  }

  context.hasMeta = context.metaLeft !== null || context.metaRight !== null

  return context
}

/**
 * Send a chat message for each audit entry.
 * Non-blocking: failures are caught internally.
 * @param {object} actor
 * @param {object[]} entries
 */
async function sendChatForAuditEntries(actor, entries) {
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

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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* -------------------------------------------- */
/*  Gardes                                      */
/* -------------------------------------------- */

function isOnlyAuditChange(changes) {
  const flat = _flattenObject(changes)
  const keys = Object.keys(flat)
  return keys.length === 1 && keys[0] === AUDIT_LOG_KEY
}

function isCharacterActor(actor) {
  return actor?.type === 'character'
}

function isAuditInternalUpdate(options) {
  return options?.swerpgAuditLog === false
}

/* -------------------------------------------- */
/*  Clone utilitaire                            */
/* -------------------------------------------- */

function cloneValue(value) {
  if (value === undefined) return undefined
  return foundry.utils.deepClone?.(value) ?? structuredClone(value)
}

/* -------------------------------------------- */
/*  Anti-fuite mémoire                          */
/* -------------------------------------------- */

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

function countPendingEntries() {
  let count = 0
  for (const queue of pendingOldStates.values()) count += queue.length
  return count
}

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

function getPendingKey(actor, userId) {
  return `${actor.uuid}:${userId}`
}

function pushPendingEntry(actor, userId, entry) {
  const key = getPendingKey(actor, userId)
  const queue = pendingOldStates.get(key) ?? []
  queue.push(entry)
  pendingOldStates.set(key, queue)
}

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

function isDeletionPath(path) {
  return path.includes('.-=')
}

function getDeletionParentPath(path) {
  const segments = path.split('.')
  const deletionIndex = segments.findIndex((segment) => segment.startsWith('-='))
  if (deletionIndex <= 0) return null
  return segments.slice(0, deletionIndex).join('.')
}

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
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      })
    } catch (chatErr) {
      logger.warn('[AuditLog] Failed to send GM whisper for write error:', chatErr)
    }
  }
}

/* -------------------------------------------- */
/*  Écriture batch fire-and-forget              */
/* -------------------------------------------- */

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
      void sendChatForAuditEntries(actor, entries)
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

export function onUpdateActor(actor, changes, options, userId) {
  if (isAuditInternalUpdate(options)) return
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  const pending = shiftPendingEntry(actor, userId)
  if (!pending) return
  if (Date.now() - pending.timestamp > PENDING_TTL_MS) return

  const entries = composeEntries(pending.oldState, changes, actor, pending.userId)
  if (!entries.length) return

  void writeLogEntries(actor, entries)
}

/* -------------------------------------------- */
/*  createItem handler (talent detection)        */
/* -------------------------------------------- */

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

  void writeLogEntries(item.parent, [entry])
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
 * @param {object} actor - The actor document instance.
 * @param {'purchase'|'forget'} operation - The operation type.
 * @param {'succeeded'|'failed'} status - The operation outcome.
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
 * @param {object} actor - The actor document
 * @param {object} entry - A single audit log entry
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
    typeLabel: '',
    changeText: '',
    changeCssClass: 'is-change',
    showDetails: false,
    costLabel: '',
    costCssClass: '',
    contextLabel: '',
  }

  switch (type) {
    case 'skill.train': {
      const isFree = data.isFree === true
      context.typeLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_TRAIN')
      context.changeText = `${data.oldRank} → ${data.newRank}`
      context.showDetails = true
      if (isFree) {
        context.changeCssClass = 'is-free'
        context.costLabel = game.i18n.localize('SWERPG.SKILL.CHAT.FREE_COST')
        context.costCssClass = 'is-free'
      } else {
        context.changeCssClass = 'is-train'
        context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: data.cost })
      }
      break
    }

    case 'skill.forget': {
      context.typeLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.SKILL_FORGET')
      context.changeText = `${data.oldRank} → ${data.newRank}`
      context.changeCssClass = 'is-forget'
      context.showDetails = true
      context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.REFUND', { cost: data.cost })
      context.costCssClass = 'is-refund'
      break
    }

    case 'characteristic.increase': {
      context.typeLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.CHARACTERISTIC_INCREASE')
      context.changeText = `${data.oldValue} → ${data.newValue}`
      context.changeCssClass = 'is-train'
      context.showDetails = true
      context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: data.cost })
      break
    }

    case 'xp.spend':
    case 'xp.refund':
    case 'xp.grant':
    case 'xp.remove': {
      const isGain = type === 'xp.grant' || type === 'xp.refund'
      context.typeLabel = game.i18n.localize(
        `SWERPG.AUDIT_LOG.TYPE.${type === 'xp.spend' ? 'XP_SPEND' : type === 'xp.refund' ? 'XP_REFUND' : type === 'xp.grant' ? 'XP_GRANT' : 'XP_REMOVE'}`,
      )
      context.changeText = isGain ? `+${data.amount} XP` : `-${data.amount} XP`
      context.changeCssClass = isGain ? 'is-forget' : 'is-train'
      context.showDetails = true
      if (isGain) {
        context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.REFUND', { cost: data.amount })
        context.costCssClass = 'is-refund'
      } else {
        context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: data.amount })
      }
      break
    }

    case 'species.set':
    case 'career.set': {
      const isSpecies = type === 'species.set'
      context.typeLabel = game.i18n.localize(isSpecies ? 'SWERPG.AUDIT_LOG.TYPE.SPECIES_SET' : 'SWERPG.AUDIT_LOG.TYPE.CAREER_SET')
      const oldV = data.oldSpecies ?? data.oldCareer ?? game.i18n.localize('SWERPG.AUDIT_LOG.NONE')
      const newV = data.newSpecies ?? data.newCareer ?? game.i18n.localize('SWERPG.AUDIT_LOG.NONE')
      context.changeText = `${oldV} → ${newV}`
      context.changeCssClass = 'is-change'
      break
    }

    case 'specialization.add':
    case 'specialization.remove': {
      const isAdd = type === 'specialization.add'
      context.typeLabel = game.i18n.localize(isAdd ? 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_ADD' : 'SWERPG.AUDIT_LOG.TYPE.SPECIALIZATION_REMOVE')
      context.changeText = data.specializationName ?? data.specializationId ?? ''
      context.changeCssClass = isAdd ? 'is-train' : 'is-forget'
      if (data.cost) {
        context.showDetails = true
        context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: data.cost })
      }
      break
    }

    case 'talent.purchase': {
      context.typeLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.TALENT_PURCHASE')
      context.changeText = data.talentName ?? data.talentId ?? ''
      context.changeCssClass = 'is-train'
      context.showDetails = true
      context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: data.cost })
      break
    }

    case 'talent-node-purchase-succeeded':
    case 'talent-node-purchase-failed':
    case 'talent-node-forget-succeeded':
    case 'talent-node-forget-failed': {
      const isSuccess = type.endsWith('succeeded')
      const isPurchase = type.includes('purchase')
      context.typeLabel = game.i18n.localize(`SWERPG.AUDIT_LOG.TYPE.${type.replace(/[-.]/g, '_').toUpperCase()}`)
      context.changeText = isSuccess
        ? (data.talentId ?? data.nodeId ?? '')
        : game.i18n.format('SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE_FAILED', { reasonCode: data.reasonCode ?? '', nodeId: data.nodeId ?? '' })
      context.changeCssClass = isSuccess ? (isPurchase ? 'is-train' : 'is-forget') : 'is-fail'
      if (isSuccess && data.cost) {
        context.showDetails = true
        if (isPurchase) {
          context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: data.cost })
        } else {
          context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.REFUND', { cost: data.cost })
          context.costCssClass = 'is-refund'
        }
      }
      break
    }

    case 'advancement.level': {
      context.typeLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ADVANCEMENT_LEVEL')
      context.changeText = `${data.oldLevel} → ${data.newLevel}`
      context.changeCssClass = 'is-change'
      break
    }

    default: {
      const desc = buildAuditLogDescription(entry)
      context.typeLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.UNKNOWN')
      context.changeText = desc
      context.changeCssClass = xpDelta > 0 ? 'is-forget' : xpDelta < 0 ? 'is-train' : 'is-change'
      if (xpDelta !== 0) {
        context.showDetails = true
        if (xpDelta > 0) {
          context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.REFUND', { cost: xpDelta })
          context.costCssClass = 'is-refund'
        } else {
          context.costLabel = game.i18n.format('SWERPG.SKILL.CHAT.COST', { cost: Math.abs(xpDelta) })
        }
      }
    }
  }

  if (context.showDetails && snapshot.xpAvailable !== undefined) {
    context.contextLabel = game.i18n.format('SWERPG.SKILL.CHAT.REMAINING', { xp: snapshot.xpAvailable })
  }

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

export function registerAuditLogHooks() {
  Hooks.on('preUpdateActor', onPreUpdateActor)
  Hooks.on('updateActor', onUpdateActor)
  Hooks.on('createItem', onCreateItem)
}

/* -------------------------------------------- */
/*  Utilitaires internes                        */
/* -------------------------------------------- */

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

function _getProperty(object, path) {
  const keys = path.split('.')
  let current = object
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

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

function flushPending() {
  pendingOldStates.clear()
}

import { logger } from './logger.mjs'
import { composeEntries } from './audit-diff.mjs'

/* -------------------------------------------- */
/*  Constantes                                  */
/* -------------------------------------------- */

const AUDIT_LOG_KEY = 'flags.swerpg.logs'
const PENDING_TTL_MS = 30000
const MAX_PENDING = 50
const MAX_RETRIES = 1
const RETRY_DELAY_MS = 1000
const pendingOldStates = new Map()
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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
    const remaining = queue.filter(p => now - p.timestamp <= PENDING_TTL_MS)
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

function snapshotOldState(source, changes) {
  const oldState = {}
  const flatChanges = _flattenObject(changes)

  for (const path of Object.keys(flatChanges)) {
    if (!path.startsWith('system.')) continue
    if (isDeletionPath(path)) continue
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
  ui.notifications?.warn?.(
    game.i18n.format('SWERPG.AUDIT.WRITE_FAILED', { actor: actor.name })
  )

  if (game.user?.isGM) {
    try {
      const content = await foundry.applications.handlebars.renderTemplate(
        'systems/swerpg/templates/chat/audit-log-warning.hbs',
        {
          actorName: actor.name,
          errorMessage: err.message,
        }
      )
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

      await actor.update(
        { [AUDIT_LOG_KEY]: nextLogs },
        { swerpgAuditLog: false }
      )
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

export { isOnlyAuditChange, snapshotOldState, cloneValue, evictOldestIfNeeded, flushPending, countPendingEntries, getPendingKey, shiftPendingEntry, pushPendingEntry, isDeletionPath, writeLogEntries, handleWriteError, pruneExpiredPending, readMaxLogEntries }

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
/*  Point d'entrée unique                       */
/* -------------------------------------------- */

export function registerAuditLogHooks() {
  Hooks.on('preUpdateActor', onPreUpdateActor)
  Hooks.on('updateActor', onUpdateActor)
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

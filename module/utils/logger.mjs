// module/utils/logger.mjs
const PREFIX = 'SWERPG ||'
let debugEnabled = false

/**
 *
 * @param level
 */
function shouldLog(level) {
  if (debugEnabled) return true
  // Même sans debug, on laisse passer les erreurs (et éventuellement les warnings)
  return level === 'error' || level === 'warn'
}

export const logger = {
  enableDebug() {
    debugEnabled = true
  },

  disableDebug() {
    debugEnabled = false
  },

  setDebug(value) {
    debugEnabled = Boolean(value)
  },

  isDebugEnabled() {
    return debugEnabled
  },

  log(...args) {
    if (shouldLog('log')) console.log(PREFIX, ...args)
  },

  info(...args) {
    if (shouldLog('info')) console.info(PREFIX, ...args)
  },

  warn(...args) {
    if (shouldLog('warn')) console.warn(PREFIX, ...args)
  },

  error(...args) {
    if (shouldLog('error')) console.error(PREFIX, ...args)
  },

  debug(...args) {
    if (shouldLog('debug')) console.debug(PREFIX, ...args)
  },

  group(...args) {
    if (shouldLog('group')) console.group(PREFIX, ...args)
  },

  groupCollapsed(...args) {
    if (shouldLog('groupCollapsed')) console.groupCollapsed(PREFIX, ...args)
  },

  groupEnd() {
    if (shouldLog('groupEnd')) console.groupEnd()
  },

  table(...args) {
    if (shouldLog('table')) console.table(...args)
  },

  time(label) {
    if (shouldLog('time')) console.time(`${PREFIX} ${label}`)
  },

  timeEnd(label) {
    if (shouldLog('timeEnd')) console.timeEnd(`${PREFIX} ${label}`)
  },

  trace(...args) {
    if (shouldLog('trace')) console.trace(PREFIX, ...args)
  },

  assert(condition, ...args) {
    if (!condition && shouldLog('assert')) {
      console.assert(condition, PREFIX, ...args)
    }
  },
}

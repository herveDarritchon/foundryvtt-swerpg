// module/utils/logger.mjs
// Refactor du 12/11/2025 : suppression des wrappers pour préserver le callsite réel dans DevTools.
// Les méthodes sont maintenant réassignées dynamiquement vers console.* ou noop selon le mode debug.
// Le préfixe est injecté via Function.prototype.bind afin de conserver le callsite appelant.

const PREFIX = 'SWERPG ||'
let debugEnabled = false

// Niveaux supportés (ordre informatif)
const LEVELS = ['log', 'info', 'warn', 'error', 'debug', 'group', 'groupCollapsed', 'groupEnd', 'table', 'time', 'timeEnd', 'trace', 'assert']

// Niveaux toujours actifs hors debug
const ALWAYS_ON_LEVELS = new Set(['warn', 'error'])

// noop pour niveaux désactivés
const noop = () => {}

/**
 * Applique la politique de logging selon l'état debug.
 * Pour les niveaux actifs : assignation d'une fonction console.* bindée avec le PREFIX (quand approprié).
 * Pour les niveaux inactifs : noop.
 */
function applyLogPolicy() {
  for (const level of LEVELS) {
    // Supprime ancienne propriété pour redéfinition propre
    if (Object.hasOwn(logger, level)) delete logger[level]

    const isActive = debugEnabled || ALWAYS_ON_LEVELS.has(level)

    // Getter dynamique pour permettre aux tests de spy après import tout en conservant callsite utilisateur
    let getter
    if (isActive) {
      switch (level) {
        case 'log':
        case 'info':
        case 'warn':
        case 'error':
        case 'debug':
        case 'trace':
          getter = () => (console[level] ? console[level].bind(console, PREFIX) : noop)
          break
        case 'group':
          getter = () => console.group.bind(console, PREFIX)
          break
        case 'groupCollapsed':
          getter = () => console.groupCollapsed.bind(console, PREFIX)
          break
        case 'groupEnd':
          getter = () => console.groupEnd.bind(console)
          break
        case 'table':
          getter = () => console.table.bind(console)
          break
        case 'time':
          // Wrapper nécessaire pour concaténer le préfixe et respecter tests existants
          getter = () => (label) => console.time(`${PREFIX} ${label}`)
          break
        case 'timeEnd':
          getter = () => (label) => console.timeEnd(`${PREFIX} ${label}`)
          break
        case 'assert':
          // Assertion uniquement en mode debug (comportement historique)
          getter =
            () =>
            (condition, ...args) => {
              if (!condition) console.assert(condition, PREFIX, ...args)
            }
          break
        default:
          getter = () => noop
      }
    } else {
      getter = () => noop
    }

    Object.defineProperty(logger, level, {
      configurable: true,
      enumerable: true,
      get: getter,
    })
  }
}

export const logger = {
  enableDebug() {
    debugEnabled = true
    applyLogPolicy()
  },
  disableDebug() {
    debugEnabled = false
    applyLogPolicy()
  },
  setDebug(value) {
    debugEnabled = Boolean(value)
    applyLogPolicy()
  },
  isDebugEnabled() {
    return debugEnabled
  },
  // Helper optionnel pour ajouter manuellement le préfixe à des données complexes avant log
  prefixArgs(...args) {
    return [PREFIX, ...args]
  },
}

// Application initiale de la politique
applyLogPolicy()

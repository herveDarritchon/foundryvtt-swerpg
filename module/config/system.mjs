import * as ATTRIBUTES from './attributes.mjs'
import * as ACTION from './action.mjs'
import * as ADVERSARY from './adversaries.mjs'
import * as ARMOR from './armor.mjs'
import * as dice from './dice.mjs'
import { logger } from '../utils/logger.mjs'
import * as EFFECTS from './effects.mjs'
import * as SKILL from './skills.mjs'
import { MAX_RANK_AT_CREATION, MAX_RANK } from './skills.mjs'
import * as PROGRESSION from './progression.mjs'
import * as WEAPON from './weapon.mjs'
import { ENCHANTMENT_TIERS, QUALITY_TIERS, DEFAULT_QUALITY, DEFAULT_RESTRICTION_LEVEL } from './items.mjs'
import { ASCII, ASCII_DEV_MODE, DEV_MODE } from '../applications/system/constants.mjs'

export const SYSTEM_ID = 'swerpg'

/* -------------------------------------------- */

/**
 * The amount of damage resistance granted by ancestries.
 * @type {object}
 */
export const ANCESTRIES = {
  primaryAbilityStart: 3,
  secondaryAbilityStart: 2,
  resistanceAmount: 5,
}

/* -------------------------------------------- */

/**
 * The threat levels that an adversary may have.
 * @enum {number}
 */
export const THREAT_LEVELS = {
  minion: {
    id: 'minion',
    actionMax: 4,
    label: 'ADVERSARY.ThreatMinion',
    scaling: 0.5,
    icon: 'fa-solid fa-chevron-down',
  },
  normal: {
    id: 'normal',
    actionMax: 6,
    label: 'ADVERSARY.ThreatNormal',
    scaling: 1.0,
    icon: 'fa-solid fa-chevron-up',
  },
  elite: {
    id: 'elite',
    actionMax: 8,
    label: 'ADVERSARY.ThreatElite',
    scaling: 1.5,
    icon: 'fa-solid fa-chevrons-up',
  },
  boss: {
    id: 'boss',
    actionMax: 10,
    label: 'ADVERSARY.ThreatBoss',
    scaling: 2.0,
    icon: 'fa-solid fa-skull',
  },
}

/* -------------------------------------------- */

/**
 * Define the actor preparation hooks which are supported for Talent configuration.
 * @enum {{signature: string, argNames: string[]}}
 */
export const ACTOR_HOOKS = Object.freeze({
  // Action Usage
  prepareStandardCheck: {
    group: 'TALENT.HOOKS.GROUP_ACTION',
    argNames: ['rollData'],
  },
  prepareWeaponAttack: {
    group: 'TALENT.HOOKS.GROUP_ACTION',
    argNames: ['action', 'target', 'rollData'],
  },
  applyCriticalEffects: {
    group: 'TALENT.HOOKS.GROUP_ACTION',
    argNames: ['action', 'outcome', 'self'],
  },
  defendSkillAttack: {
    group: 'TALENT.HOOKS.GROUP_ACTION',
    argNames: ['action', 'origin', 'rollData'],
  },
  defendWeaponAttack: {
    group: 'TALENT.HOOKS.GROUP_ACTION',
    argNames: ['action', 'origin', 'rollData'],
  },
  applyActionOutcome: {
    group: 'TALENT.HOOKS.GROUP_ACTION',
    argNames: ['action', 'outcome', 'options'],
  },

  // Data Preparation
  prepareActions: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['actions'],
  },
  prepareResources: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['resources'],
  },
  prepareDefenses: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['defenses'],
  },
  prepareInitiativeCheck: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['rollData'],
  },
  prepareMovement: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['movement'],
  },
  prepareResistances: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['resistances'],
  },
  prepareSkillCheck: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['skill', 'rollData'],
  },
  prepareSkillAttack: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['action', 'target', 'rollData'],
  },
  prepareTraining: {
    group: 'TALENT.HOOKS.GROUP_PREPARATION',
    argNames: ['training'],
  },
})

/* -------------------------------------------- */

/**
 * Define the Action life-cycle hooks which are supported for an Action.
 * @enum {Readonly<Object<{argNames: string[]}>>}
 */
export const ACTION_HOOKS = Object.freeze({
  prepare: {
    argNames: [],
  },
  displayOnSheet: {
    argNames: ['combatant'],
  },
  canUse: {
    argNames: ['targets'],
  },
  preActivate: {
    argNames: ['targets'],
    async: true,
  },
  roll: {
    argNames: ['target', 'rolls'],
    async: true,
  },
  postActivate: {
    argNames: ['outcome'],
    async: true,
  },
  confirm: {
    argNames: [],
    async: true,
  },
})

/* -------------------------------------------- */

/**
 * Named restriction levels which are allowed by the system.
 * @enum {{id: string, label: string}}
 */
export const RESTRICTION_LEVELS = {
  none: {
    id: 'none',
    label: 'ITEM.RESTRICTION_LEVEL.NONE',
  },
  restricted: {
    id: 'restricted',
    label: 'ITEM.RESTRICTION_LEVEL.RESTRICTED',
  },
  military: {
    id: 'military',
    label: 'ITEM.RESTRICTION_LEVEL.MILITARY',
  },
  illegal: {
    id: 'illegal',
    label: 'ITEM.RESTRICTION_LEVEL.ILLEGAL',
  },
}

/* -------------------------------------------- */

/**
 * The skill catalogue extended with rank limit constants.
 * MAX_RANK_AT_CREATION and MAX_RANK are non-enumerable so that Object.values(SYSTEM.SKILLS)
 * continues to yield only skill-definition objects, preserving all existing consumer behaviour.
 * @type {typeof ATTRIBUTES.SKILLS & { MAX_RANK_AT_CREATION: number, MAX_RANK: number }}
 */
const SKILLS_WITH_RANK_LIMITS = Object.defineProperties(
  { ...ATTRIBUTES.SKILLS },
  {
    MAX_RANK_AT_CREATION: { value: MAX_RANK_AT_CREATION, enumerable: false, configurable: false, writable: false },
    MAX_RANK: { value: MAX_RANK, enumerable: false, configurable: false, writable: false },
  },
)

/**
 * Include all constant definitions within the SYSTEM global export
 * @type {Object}
 */
export const SYSTEM = {
  id: SYSTEM_ID,
  CHARACTERISTICS: ATTRIBUTES.CHARACTERISTICS,
  ACTION,
  ACTOR_HOOKS,
  ACTION_HOOKS,
  ACTOR_TYPE: ATTRIBUTES.ACTOR_TYPE,
  ADVERSARY,
  ANCESTRIES,
  ARMOR,
  ASCII,
  ASCII_DEV_MODE,
  DAMAGE_CATEGORIES: ATTRIBUTES.DAMAGE_CATEGORIES,
  DAMAGE_TYPES: ATTRIBUTES.DAMAGE_TYPES,
  DEFENSES: ATTRIBUTES.DEFENSES,
  DEV_MODE,
  EFFECTS,
  ENCHANTMENT_TIERS,
  DEFAULT_QUALITY,
  DEFAULT_RESTRICTION_LEVEL,
  PASSIVE_BASE: ATTRIBUTES.PASSIVE_BASE,
  PROGRESSION,
  QUALITY_TIERS,
  RESTRICTION_LEVELS,
  RESOURCES: ATTRIBUTES.RESOURCES,
  SKILL,
  SKILLS: SKILLS_WITH_RANK_LIMITS,
  SECONDARY_ATTRIBUTES: ATTRIBUTES.SECONDARY_ATTRIBUTES,
  TALENTS: ATTRIBUTES.TALENTS,
  TALENT_ACTIVATION: ATTRIBUTES.TALENT_ACTIVATION,
  THREAT_LEVELS,
  WEAPON,
  activeCheckFormula: '3d8',
  dice: dice,

  /**
   * Flags de dépréciation pour les logiques héritées de Crucible.
   * Chaque flag supporte `{ enabled, warn }` :
   * - enabled : true = la logique fonctionne encore, false = désactivée
   * - warn    : true = un logger.deprecated() est émis à chaque usage
   *
   * Utilisé par les guards runtime dans les modules legacy.
   * @type {Object<string, {enabled: boolean, warn: boolean}>}
   */
  DEPRECATION: {
    crucible: {
      rankTimes5: { enabled: true, warn: true },
      isCreation: { enabled: true, warn: true },
      talentPoints: { enabled: true, warn: true },
      globalTree: { enabled: true, warn: true },
      choiceWheel: { enabled: true, warn: true },
      directPurchase: { enabled: true, warn: true },
    },
  },
}

/**
 * Détecte dynamiquement si le système est en mode développement.
 * Compatible Node (build/test) et Foundry (runtime navigateur).
 */
export function detectDevelopmentMode() {
  try {
    // Mode Foundry (environnement navigateur)
    if (typeof game !== 'undefined' && game.settings?.get) {
      return Boolean(game.settings.get(SYSTEM.id, 'devMode'))
    }
  } catch (err) {
    logger.warn('⚠️ Impossible de déterminer le mode développement :', err)
  }

  // Fallback
  return false
}

/**
 * Combat Mixin Composition
 * Combines all combat-related mixins into a single CombatMixin
 */

import { AttackMixin } from './attack.mixin.mjs'
import { DefenseMixin } from './defense.mixin.mjs'
import { TurnMixin } from './turn.mixin.mjs'
import { EffectsMixin } from './effects.mixin.mjs'

/**
 * Composes all combat mixins into a single mixin
 * Order matters: EffectsMixin is the base, then TurnMixin, DefenseMixin, AttackMixin (outermost)
 */
export const CombatMixin = (Base) =>
  AttackMixin(DefenseMixin(TurnMixin(EffectsMixin(Base))))

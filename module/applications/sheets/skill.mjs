import * as SKILL from '../../config/skills.mjs'
import { CHARACTERISTICS } from '../../config/attributes.mjs'
import SwerpgBaseItemSheet from './base-item.mjs'

const { api, sheets } = foundry.applications

/**
 * The application used to view and edit a skill page in the system journal.
 */
export default class SkillSheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'skill'],
    scrollable: ['.scrollable'],
  }

  /** @inheritDoc */
  get template() {
    return `systems/swerpg/templates/sheets/skill-${this.isEditable ? 'edit' : 'view'}.hbs`
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options)

    // ✅ Standard minimum OBLIGATOIRE selon le plan Phase 2.2
    context.document = this.document
    context.system = this.document.system
    context.config = game.system.config
    context.isOwner = this.document.isOwner

    // Préparation spécifique à la skill page
    context.skills = SKILL.SKILLS
    context.skill = SKILL.SKILLS[context.document.system.skillId]
    context.tags = this.#getTags(context.skill)
    context.ranks = this.#prepareRanks(context.document.system.ranks)
    context.paths = this.#preparePaths(context.document.system.paths)
    return context
  }

  /* -------------------------------------------- */

  #getTags(skill) {
    if (!skill?.category) return {}
    const c = SKILL.CATEGORIES[skill.category]
    const a1 = CHARACTERISTICS[skill.abilities[0]]
    const a2 = CHARACTERISTICS[skill.abilities[1]]
    return [
      { type: 'category', label: c.label, color: `${c.color.css}50` },
      { type: 'ability', label: a1.label, color: `${a1.color.css}50` },
      { type: 'ability', label: a2.label, color: `${a2.color.css}50` },
    ]
  }

  /* -------------------------------------------- */

  /**
   * Prepare skill rank data for rendering.
   * @param rankData
   */
  #prepareRanks(rankData) {
    const ranks = foundry.utils.deepClone(SKILL.RANKS)
    for (const [rankId, { description }] of Object.entries(rankData)) {
      const r = ranks[SKILL.RANK_IDS[rankId]]
      r.title = `${r.label} (Rank ${r.rank})`
      r.description = description
    }
    return ranks
  }

  /* -------------------------------------------- */

  /**
   * Prepare specialization path data for rendering.
   * @param pathData
   */
  #preparePaths(pathData) {
    for (const [i, path] of Object.values(pathData).entries()) {
      path.title = `Specialization Path ${i + 1}`
      for (const [rankId, rank] of Object.entries(path.ranks)) {
        const { label, rank: n } = SKILL.RANKS[SKILL.RANK_IDS[rankId]]
        rank.title = `${label} (Rank ${n})`
      }
    }
    return pathData
  }
}

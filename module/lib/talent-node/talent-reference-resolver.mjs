import { logger } from '../../utils/logger.mjs'

/**
 * @typedef {Object} TalentDetail
 * @property {string} name - The resolved talent name (localized unknown fallback if unresolved).
 * @property {boolean} isRanked - Whether the talent is ranked.
 * @property {boolean} isActive - Whether the talent has an activation cost (active vs passive).
 */

/**
 * @typedef {Object} TalentDefinitionEntry
 * @property {string} name
 * @property {string} [activation]
 * @property {boolean} [isRanked]
 * @property {boolean} [isActive]
 */

/**
 * Resolve a talent reference by business key (system.id or oggdudeKey).
 * Searches game.items first, then falls back to compendium pack indexes.
 *
 * @param {string} normalizedKey - Lowercase trimmed key to search for.
 * @returns {{ name: string, isRanked: boolean, isActive: boolean }|null}
 */
function resolveTalentByBusinessKey(normalizedKey) {
  if (typeof game !== 'undefined' && game.items) {
    for (const item of game.items) {
      if (item.type !== 'talent') continue

      const id = item.system?.id
      if (id && typeof id === 'string' && id.toLowerCase().trim() === normalizedKey) {
        return { name: item.name, isRanked: item.system?.isRanked ?? false, isActive: !!item.system?.activation }
      }

      const oggKey = item.getFlag?.('swerpg', 'oggdudeKey')
      if (oggKey && typeof oggKey === 'string' && oggKey.toLowerCase().trim() === normalizedKey) {
        return { name: item.name, isRanked: item.system?.isRanked ?? false, isActive: !!item.system?.activation }
      }
    }
  }

  if (typeof game !== 'undefined' && game.packs) {
    for (const pack of game.packs.values()) {
      if (pack.documentName !== 'Item') continue
      if (!pack.index?.size) continue

      for (const entry of pack.index.values()) {
        if (entry.type !== 'talent') continue

        const systemId = entry.system?.id
        if (systemId && typeof systemId === 'string' && systemId.toLowerCase().trim() === normalizedKey) {
          return { name: entry.name, isRanked: entry.system?.isRanked ?? false, isActive: !!entry.system?.activation }
        }

        const oggKey = entry.flags?.swerpg?.oggdudeKey
        if (oggKey && typeof oggKey === 'string' && oggKey.toLowerCase().trim() === normalizedKey) {
          return { name: entry.name, isRanked: entry.system?.isRanked ?? false, isActive: !!entry.system?.activation }
        }
      }
    }
  }

  return null
}

/**
 * Resolve a talent reference to its detail (name + isRanked).
 *
 * Priority order:
 * 1. `fromUuidSync(talentUuid)` if available
 * 2. Business key lookup in game.items (system.id, oggdudeKey)
 * 3. Compendium index lookup by business key
 *
 * @param {string|{ talentUuid?: string|null, talentId?: string|null }} nodeRef - UUID string, or object with talentUuid/talentId.
 * @returns {TalentDetail} Resolved talent detail (unknown fallback on failure).
 */
export function resolveTalentDetail(nodeRef) {
  const unknown = game.i18n?.localize?.('SWERPG.TALENT.UNKNOWN') ?? 'Unknown talent'

  const talentUuid = typeof nodeRef === 'string' ? nodeRef : nodeRef?.talentUuid
  const talentId = typeof nodeRef === 'string' ? null : nodeRef?.talentId

  if (talentUuid) {
    try {
      const item = fromUuidSync(talentUuid)
      if (item) {
        return {
          name: item.name ?? unknown,
          isRanked: item.system?.isRanked ?? false,
          isActive: !!item.system?.activation,
        }
      }
    } catch {
      // Fall through to legacy fallback
    }
  }

  if (talentId) {
    const matched = resolveTalentByBusinessKey(talentId.toLowerCase().trim())
    if (matched) {
      return {
        name: matched.name ?? unknown,
        isRanked: matched.isRanked ?? false,
        isActive: matched.isActive ?? false,
      }
    }
  }

  return { name: unknown, isRanked: false, isActive: false }
}

/**
 * Convenience wrapper that returns only the talent name.
 * @param {string|{ talentUuid?: string|null, talentId?: string|null }} nodeRef
 * @returns {string} Resolved name or unknown fallback.
 */
export function resolveTalentItem(nodeRef) {
  return resolveTalentDetail(nodeRef).name
}

/**
 * Build a Map of talent definitions from world items for the consolidated view.
 *
 * Each talent item is indexed under two keys:
 * - `item.uuid` (for matching by purchase.talentUuid)
 * - `item.system?.id || item.id` (legacy business-key matching)
 *
 * @returns {Map<string, TalentDefinitionEntry>} Talent definitions keyed by UUID or business key.
 */
export function buildTalentDefinitionsMap() {
  const defs = new Map()
  if (!game?.items?.find) return defs

  for (const item of game.items) {
    if (item.type !== 'talent') continue

    const entry = {
      name: item.name,
      activation: item.system?.activation,
      isRanked: item.system?.isRanked,
      isActive: !!item.system?.activation,
    }

    // Index by UUID for talentUuid matching
    if (item.uuid) {
      defs.set(item.uuid, entry)
    }

    // Index by business key (system.id) or fallback to item.id for legacy matching
    const legacyKey = item.system?.id || item.id
    if (legacyKey) {
      defs.set(legacyKey, entry)
    }
  }

  return defs
}

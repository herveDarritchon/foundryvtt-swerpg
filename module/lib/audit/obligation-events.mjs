/**
 * Pure-domain helpers for obligation audit log event detection.
 * No Foundry globals, no document references — accepts plain objects and returns plain values.
 */

/* -------------------------------------------- */
/*  Normalisation des données obligation         */
/* -------------------------------------------- */

/**
 * @typedef {object} ObligationNormalized
 * @property {string|null} obligationId
 * @property {string|null} obligationName
 * @property {number} value
 * @property {number} campaignDelta
 * @property {number} extraXp
 * @property {number} extraCredits
 * @property {boolean} isExtra
 * @property {string|null} transformedTo
 * @property {string|null} campaignNote
 * @property {boolean} hasDescription
 */

/**
 * Extract the business-relevant fields from an obligation item into a plain normalized object.
 * The `description` field is intentionally excluded: only its presence is captured via `hasDescription`.
 * This prevents HTML content from leaking into the audit log payload.
 *
 * @param {object} item An obligation item (plain or Foundry document).
 * @returns {ObligationNormalized}
 */
export function normalizeObligationItem(item) {
  const s = item?.system ?? {}
  return {
    obligationId: item?.id ?? null,
    obligationName: item?.name ?? null,
    value: s.value ?? 0,
    campaignDelta: s.campaignDelta ?? 0,
    extraXp: s.extraXp ?? 0,
    extraCredits: s.extraCredits ?? 0,
    isExtra: s.isExtra ?? false,
    transformedTo: s.transformedTo ?? null,
    campaignNote: s.campaignNote ?? null,
    hasDescription: typeof s.description === 'string' ? s.description.trim().length > 0 : false,
  }
}

/**
 * @typedef {object} ObligationDiff
 * @property {boolean} hasBusinessChange - True when at least one tracked business field differs.
 * @property {boolean} valueChanged
 * @property {boolean} campaignDeltaChanged
 * @property {boolean} extraXpChanged
 * @property {boolean} extraCreditsChanged
 * @property {boolean} isExtraChanged
 * @property {boolean} transformedToChanged
 * @property {boolean} campaignNoteChanged
 * @property {boolean} descriptionChanged
 */

/**
 * Business fields tracked for audit log diff detection.
 * Description is excluded from the array because it is handled separately via hasDescription flags.
 */
const TRACKED_FIELDS = ['value', 'campaignDelta', 'extraXp', 'extraCredits', 'isExtra', 'transformedTo', 'campaignNote']

/**
 * Compare two normalized obligation snapshots and return a diff descriptor.
 * Only compares business-relevant fields; HTML description is compared as presence-only.
 *
 * @param {ObligationNormalized} oldNorm Snapshot captured before the update.
 * @param {ObligationNormalized} newNorm Snapshot captured after the update.
 * @returns {ObligationDiff}
 */
export function diffObligationNormalized(oldNorm, newNorm) {
  const diff = {
    hasBusinessChange: false,
    valueChanged: false,
    campaignDeltaChanged: false,
    extraXpChanged: false,
    extraCreditsChanged: false,
    isExtraChanged: false,
    transformedToChanged: false,
    campaignNoteChanged: false,
    descriptionChanged: false,
  }

  for (const field of TRACKED_FIELDS) {
    const changed = oldNorm[field] !== newNorm[field]
    diff[`${field}Changed`] = changed
    if (changed) diff.hasBusinessChange = true
  }

  diff.descriptionChanged = oldNorm.hasDescription !== newNorm.hasDescription
  if (diff.descriptionChanged) diff.hasBusinessChange = true

  return diff
}

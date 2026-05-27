import { logger } from './logger.mjs'
import SkillCostCalculator from '../lib/skills/skill-cost-calculator.mjs'
import { getCanonicalSpecializationKey } from '../lib/specializations/owned-specializations.mjs'

/* -------------------------------------------- */
/*  Capture instantané de l'état XP après update */
/* -------------------------------------------- */

/**
 *
 * @param actor
 */
function captureSnapshot(actor) {
  const xp = actor.system?.progression?.experience
  const freeRanks = actor.system?.progression?.freeSkillRanks
  return {
    xpAvailable: xp?.available ?? 0,
    totalXpSpent: xp?.spent ?? 0,
    totalXpGained: xp?.gained ?? 0,
    careerFreeAvailable: freeRanks?.career?.available ?? 0,
    specializationFreeAvailable: freeRanks?.specialization?.available ?? 0,
  }
}

/**
 *
 * @param newValue
 */
function computeCharacteristicCost(newValue) {
  return newValue * 10
}

/**
 * Reconstruit une ancienne valeur complète en appliquant l'ancien diff partiel
 * sur la valeur courante complète.
 *
 * Exemple :
 * - currentValue = { base: 0, trained: 2, bonus: 0 }
 * - oldPartialValue = { trained: 1 }
 * - résultat = { base: 0, trained: 1, bonus: 0 }
 * @param oldPartialValue
 * @param currentValue
 */
function reconstructPreviousValue(oldPartialValue, currentValue) {
  if (oldPartialValue === undefined) return currentValue
  if (oldPartialValue === null || currentValue === null) return oldPartialValue
  if (typeof oldPartialValue !== 'object' || typeof currentValue !== 'object') return oldPartialValue
  if (Array.isArray(oldPartialValue) || Array.isArray(currentValue)) return oldPartialValue

  const merged = foundry.utils.deepClone(currentValue)

  for (const [key, value] of Object.entries(oldPartialValue)) {
    merged[key] = reconstructPreviousValue(value, currentValue?.[key])
  }

  return merged
}

/* -------------------------------------------- */
/*  Helper de construction d'entrée             */
/* -------------------------------------------- */

/**
 *
 * @param root0
 * @param root0.type
 * @param root0.data
 * @param root0.xpDelta
 * @param root0.ts
 * @param root0.userId
 * @param root0.user
 * @param root0.snapshot
 */
function makeEntry({ type, data, xpDelta, ts, userId, user, snapshot }) {
  return {
    id: foundry.utils.randomID(),
    schemaVersion: 1,
    timestamp: ts,
    userId,
    userName: user?.name ?? 'Unknown',
    type,
    data,
    xpDelta: Object.is(xpDelta, -0) ? 0 : xpDelta,
    snapshot: { ...snapshot },
  }
}

/* -------------------------------------------- */
/*  Détecteurs                                  */
/* -------------------------------------------- */

/**
 *
 * @param oldState
 * @param changes
 * @param actor
 * @param ts
 * @param userId
 * @param user
 * @param snapshot
 */
function detectSkillChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const skillChanges = changes.system?.skills
  if (!skillChanges) return entries

  for (const [skillId, skillData] of Object.entries(skillChanges)) {
    if (!skillData?.rank) continue

    const newRank = actor.system?.skills?.[skillId]?.rank
    if (!newRank) continue

    const oldRank = reconstructPreviousValue(oldState.system?.skills?.[skillId]?.rank, newRank) ?? {}

    const oldTotal = getSkillTotalRank(oldRank)
    const newTotal = getSkillTotalRank(newRank)

    if (oldTotal === newTotal) continue

    const isIncrease = newTotal > oldTotal
    const trainedUnchanged = (newRank.trained ?? 0) === (oldRank.trained ?? 0)
    const isCareer = inferIsCareer(skillId, oldState, actor)

    /* ---- Déterminer si c'est un changement de rang purement gratuit ---- */
    const changedRankKeys = Object.keys(skillData.rank)
    const hasCareerFreeChange = changedRankKeys.includes('careerFree')
    const hasSpecFreeChange = changedRankKeys.includes('specializationFree')
    const isPureFreeRankChange = trainedUnchanged && (hasCareerFreeChange || hasSpecFreeChange)

    const isFree = isIncrease && isPureFreeRankChange

    let freeRankType = null
    if (isPureFreeRankChange) {
      freeRankType = hasCareerFreeChange ? 'career' : 'specialization'
    }

    /* ---- Coût XP ---- */
    let cost = 0
    if (!isPureFreeRankChange) {
      if (isIncrease) {
        cost = SkillCostCalculator.computeCost({ action: 'train', rankValue: oldTotal + 1, isSpecialized: isCareer })
      } else {
        cost = SkillCostCalculator.computeCost({ action: 'forget', rankValue: oldTotal - 1, isSpecialized: isCareer })
      }
    }

    /* ---- Champs enrichis ---- */
    const skillMeta = actor.system?.skills?.[skillId]
    const skillName = skillMeta?.label ?? skillId
    const skillCategory = skillMeta?.type ?? null

    entries.push(
      makeEntry({
        type: isIncrease ? 'skill.train' : 'skill.forget',
        data: {
          skillId,
          skillName,
          skillCategory,
          oldRank: oldTotal,
          newRank: newTotal,
          cost,
          isFree,
          isCareer,
          freeRankType,
        },
        xpDelta: isIncrease ? -cost : cost,
        ts,
        userId,
        user,
        snapshot,
      }),
    )
  }

  return entries
}

/**
 *
 * @param rank
 */
function getSkillTotalRank(rank) {
  return (rank.base ?? 0) + (rank.careerFree ?? 0) + (rank.specializationFree ?? 0) + (rank.trained ?? 0)
}

/**
 *
 * @param skillId
 * @param _oldState
 * @param actor
 */
function inferIsCareer(skillId, _oldState, actor) {
  return getCareerSkillIds(actor).has(skillId)
}

/**
 *
 * @param actor
 */
function getCareerSkillIds(actor) {
  const ids = new Set()

  const careerSkills = actor.system?.details?.career?.careerSkills ?? []
  for (const skill of careerSkills) {
    ids.add(skill.id ?? skill)
  }

  const specializations = actor.system?.details?.specializations ?? {}
  for (const spec of Object.values(specializations)) {
    const specCareerSkills = spec?.careerSkills ?? []
    for (const skill of specCareerSkills) {
      ids.add(skill.id ?? skill)
    }
  }

  return ids
}

/**
 *
 * @param oldState
 * @param changes
 * @param actor
 * @param ts
 * @param userId
 * @param user
 * @param snapshot
 */
function detectCharacteristicChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const characteristicChanges = changes.system?.characteristics
  if (!characteristicChanges) return entries

  for (const [charId, charData] of Object.entries(characteristicChanges)) {
    if (!charData?.rank) continue

    const newRank = actor.system?.characteristics?.[charId]?.rank
    if (!newRank) continue

    const oldRank = reconstructPreviousValue(oldState.system?.characteristics?.[charId]?.rank, newRank) ?? {}

    const oldTotal = getCharacteristicTotalRank(oldRank)
    const newTotal = getCharacteristicTotalRank(newRank)

    if (newTotal <= oldTotal) continue

    const cost = computeCharacteristicCost(newTotal)

    entries.push(
      makeEntry({
        type: 'characteristic.increase',
        data: {
          characteristicId: charId,
          oldValue: oldTotal,
          newValue: newTotal,
          cost,
        },
        xpDelta: -cost,
        ts,
        userId,
        user,
        snapshot,
      }),
    )
  }

  return entries
}

/**
 *
 * @param rank
 */
function getCharacteristicTotalRank(rank) {
  return (rank.base ?? 0) + (rank.trained ?? 0) + (rank.bonus ?? 0)
}

/**
 *
 * @param oldState
 * @param changes
 * @param actor
 * @param ts
 * @param userId
 * @param user
 * @param snapshot
 */
function detectXpChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const expChanges = changes.system?.progression?.experience
  if (!expChanges) return entries

  if (expChanges.spent !== undefined) {
    const newSpent = actor.system?.progression?.experience?.spent ?? 0
    const oldSpent = reconstructPreviousValue(oldState.system?.progression?.experience?.spent, newSpent) ?? 0

    const diff = newSpent - oldSpent

    if (diff !== 0) {
      entries.push(
        makeEntry({
          type: diff > 0 ? 'xp.spend' : 'xp.refund',
          data: {
            amount: Math.abs(diff),
            oldSpent,
            newSpent,
          },
          xpDelta: -diff,
          ts,
          userId,
          user,
          snapshot,
        }),
      )
    }
  }

  if (expChanges.gained !== undefined) {
    const newGained = actor.system?.progression?.experience?.gained ?? 0
    const oldGained = reconstructPreviousValue(oldState.system?.progression?.experience?.gained, newGained) ?? 0

    const diff = newGained - oldGained

    if (diff !== 0) {
      entries.push(
        makeEntry({
          type: diff > 0 ? 'xp.grant' : 'xp.remove',
          data: {
            amount: Math.abs(diff),
            oldGained,
            newGained,
          },
          xpDelta: diff,
          ts,
          userId,
          user,
          snapshot,
        }),
      )
    }
  }

  return entries
}

/**
 *
 * @param oldState
 * @param changes
 * @param actor
 * @param ts
 * @param userId
 * @param user
 * @param snapshot
 */
function detectDetailChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const detailChanges = changes.system?.details
  if (!detailChanges) return entries

  if (detailChanges.species !== undefined) {
    const oldSpecies = oldState.system?.details?.species?.name ?? null
    const newSpecies = actor.system?.details?.species?.name ?? null

    if (oldSpecies !== newSpecies) {
      entries.push(
        makeEntry({
          type: 'species.set',
          data: { oldSpecies, newSpecies },
          xpDelta: 0,
          ts,
          userId,
          user,
          snapshot,
        }),
      )
    }
  }

  if (detailChanges.career !== undefined) {
    const oldCareer = oldState.system?.details?.career?.name ?? null
    const newCareer = actor.system?.details?.career?.name ?? null

    if (oldCareer !== newCareer) {
      entries.push(
        makeEntry({
          type: 'career.set',
          data: { oldCareer, newCareer },
          xpDelta: 0,
          ts,
          userId,
          user,
          snapshot,
        }),
      )
    }
  }

  if (detailChanges.specializations !== undefined) {
    const batchXpDelta = getXpDeltaFromChanges(oldState, changes)
    entries.push(...detectSpecializationChanges(oldState, detailChanges.specializations, actor, ts, userId, user, snapshot, batchXpDelta))
  }

  return entries
}

/**
 *
 * @param oldState
 * @param changes
 */
function getXpDeltaFromChanges(oldState, changes) {
  const newSpent = changes.system?.progression?.experience?.spent
  if (newSpent === undefined) return 0
  const oldSpent = oldState.system?.progression?.experience?.spent ?? 0
  const diff = newSpent - oldSpent
  return diff === 0 ? 0 : -diff
}

/**
 *
 * @param source
 */
function getSpecArray(source) {
  const raw = source.system?.details?.specializations
  if (!raw) return []
  if (raw instanceof Set) return [...raw]
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') return Object.values(raw)
  return []
}

/**
 *
 * @param source
 */
function buildSpecMap(source) {
  const specs = getSpecArray(source)
  const map = {}
  for (const spec of specs) {
    if (!spec || typeof spec !== 'object') continue
    const key = spec.specializationId || spec.treeUuid
    if (key) map[key] = spec
  }
  return map
}

/**
 *
 * @param oldState
 * @param specializationChanges
 * @param actor
 * @param ts
 * @param userId
 * @param user
 * @param snapshot
 * @param batchXpDelta
 */
function detectSpecializationChanges(oldState, specializationChanges, actor, ts, userId, user, snapshot, batchXpDelta) {
  const entries = []

  for (const [key] of Object.entries(specializationChanges)) {
    if (!key.startsWith('-=')) continue
    const specializationId = key.slice(2)
    if (!specializationId) continue

    const oldSpec = oldState.system?.details?.specializations?.[specializationId]

    entries.push(
      makeEntry({
        type: 'specialization.remove',
        data: {
          specializationId,
          specializationName: oldSpec?.name ?? specializationId,
        },
        xpDelta: 0,
        ts,
        userId,
        user,
        snapshot,
      }),
    )
  }

  for (const [key, changeValue] of Object.entries(specializationChanges)) {
    if (key.startsWith('-=')) continue
    if (!changeValue || typeof changeValue !== 'object') continue

    // Direct key access (works for object-style/SetField old state)
    const oldSpec = oldState.system?.details?.specializations?.[key]
    if (oldSpec !== undefined && oldSpec !== null) continue

    // For array/Set old state: fall back to canonical key matching
    const changeKey = getCanonicalSpecializationKey(changeValue)
    if (changeKey) {
      const oldSpecs = getSpecArray(oldState)
      const alreadyExists = oldSpecs.some((s) => getCanonicalSpecializationKey(s) === changeKey)
      if (alreadyExists) continue
    }

    entries.push(
      makeEntry({
        type: 'specialization.add',
        data: {
          specializationId: changeValue.specializationId || changeValue.name || key,
          specializationName: changeValue.name || key,
          ...(batchXpDelta ? { cost: Math.abs(batchXpDelta) } : {}),
        },
        xpDelta: batchXpDelta || 0,
        ts,
        userId,
        user,
        snapshot,
      }),
    )
  }

  const oldSpecMap = buildSpecMap(oldState)
  const newSpecMap = buildSpecMap(actor)

  for (const [canonicalKey, spec] of Object.entries(newSpecMap)) {
    if (oldSpecMap[canonicalKey]) continue
    const alreadyDetected = entries.some((e) => e.type === 'specialization.add' && e.data.specializationId === (spec.specializationId || canonicalKey))
    if (alreadyDetected) continue

    entries.push(
      makeEntry({
        type: 'specialization.add',
        data: {
          specializationId: spec.specializationId || canonicalKey,
          specializationName: spec.name || canonicalKey,
          ...(batchXpDelta ? { cost: Math.abs(batchXpDelta) } : {}),
        },
        xpDelta: batchXpDelta || 0,
        ts,
        userId,
        user,
        snapshot,
      }),
    )
  }

  return entries
}

/**
 *
 * @param oldState
 * @param changes
 * @param actor
 * @param ts
 * @param userId
 * @param user
 * @param snapshot
 */
function detectAdvancementChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  if (changes.system?.advancement?.level === undefined) return []

  const newLevel = actor.system?.advancement?.level ?? 0
  const oldLevel = reconstructPreviousValue(oldState.system?.advancement?.level, newLevel) ?? 0

  if (oldLevel === newLevel) return []

  return [
    makeEntry({
      type: 'advancement.level',
      data: { oldLevel, newLevel },
      xpDelta: 0,
      ts,
      userId,
      user,
      snapshot,
    }),
  ]
}

/* -------------------------------------------- */
/*  Point d'entrée unique                       */
/* -------------------------------------------- */

/**
 *
 * @param oldState
 * @param changes
 * @param actor
 * @param userId
 */
export function composeEntries(oldState, changes, actor, userId) {
  try {
    const entries = []
    const expandedChanges = foundry.utils.expandObject(changes)
    const ts = Date.now()
    const snapshot = captureSnapshot(actor)
    const user = game.users?.get(userId) ?? null

    const hasBusinessChange = Boolean(
      expandedChanges.system?.skills ||
        expandedChanges.system?.characteristics ||
        expandedChanges.system?.details?.specializations ||
        expandedChanges.system?.advancement,
    )

    if (expandedChanges.system?.skills) {
      entries.push(...detectSkillChanges(oldState, expandedChanges, actor, ts, userId, user, snapshot))
    }

    if (expandedChanges.system?.characteristics) {
      entries.push(...detectCharacteristicChanges(oldState, expandedChanges, actor, ts, userId, user, snapshot))
    }

    // Les entrées métier portent déjà le coût XP.
    // On ne logge les changements XP que s'ils sont purs.
    if (expandedChanges.system?.progression?.experience && !hasBusinessChange) {
      entries.push(...detectXpChanges(oldState, expandedChanges, actor, ts, userId, user, snapshot))
    }

    if (expandedChanges.system?.details) {
      entries.push(...detectDetailChanges(oldState, expandedChanges, actor, ts, userId, user, snapshot))
    }

    if (expandedChanges.system?.advancement) {
      entries.push(...detectAdvancementChanges(oldState, expandedChanges, actor, ts, userId, user, snapshot))
    }

    return entries
  } catch (err) {
    logger.error('[AuditDiff] composeEntries failed', err)
    return []
  }
}
/* -------------------------------------------- */
/*  Exports pour tests                          */
/* -------------------------------------------- */

export { makeEntry, captureSnapshot, computeCharacteristicCost, inferIsCareer, getCareerSkillIds, reconstructPreviousValue }

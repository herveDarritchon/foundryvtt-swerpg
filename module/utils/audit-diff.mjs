import { logger } from './logger.mjs'

/* -------------------------------------------- */
/*  Capture instantané de l'état XP après update */
/* -------------------------------------------- */

function captureXpSnapshotAfter(actor) {
  const xp = actor.system?.progression?.experience
  if (!xp) {
    return {
      available: 0,
      spent: 0,
      gained: 0,
    }
  }

  return {
    available: xp.available ?? 0,
    spent: xp.spent ?? 0,
    gained: xp.gained ?? 0,
  }
}

/* -------------------------------------------- */
/*  Helpers de coûts XP                         */
/* -------------------------------------------- */

function computeSkillTrainCost(oldTotal, isCareer) {
  const nextRank = oldTotal + 1
  return nextRank * 5 + (isCareer ? 0 : 5)
}

function computeSkillForgetRefund(oldTotal, isCareer) {
  return oldTotal * 5 + (isCareer ? 0 : 5)
}

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

function makeEntry({ type, data, xpDelta, ts, userId, user, xpAfter }) {
  return {
    id: foundry.utils.randomID(),
    schemaVersion: 1,
    timestamp: ts,
    userId,
    userName: user?.name ?? 'Unknown',
    type,
    data,
    xpDelta: Object.is(xpDelta, -0) ? 0 : xpDelta,
    snapshot: {
      xpAfter: { ...xpAfter },
    },
  }
}

/* -------------------------------------------- */
/*  Détecteurs                                  */
/* -------------------------------------------- */

function detectSkillChanges(oldState, changes, actor, ts, userId, user, xpAfter) {
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
    const isFree = isIncrease && trainedUnchanged
    const isCareer = inferIsCareer(skillId, oldState, actor)

    let cost = 0

    if (!isFree) {
      cost = isIncrease ? computeSkillTrainCost(oldTotal, isCareer) : computeSkillForgetRefund(oldTotal, isCareer)
    }

    entries.push(
      makeEntry({
        type: isIncrease ? 'skill.train' : 'skill.forget',
        data: {
          skillId,
          oldRank: oldTotal,
          newRank: newTotal,
          cost,
          isFree,
          isCareer,
        },
        xpDelta: isIncrease ? -cost : cost,
        ts,
        userId,
        user,
        xpAfter,
      }),
    )
  }

  return entries
}

function getSkillTotalRank(rank) {
  return (rank.base ?? 0) + (rank.careerFree ?? 0) + (rank.specializationFree ?? 0) + (rank.trained ?? 0)
}

function inferIsCareer(skillId, _oldState, actor) {
  return getCareerSkillIds(actor).has(skillId)
}

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

function detectCharacteristicChanges(oldState, changes, actor, ts, userId, user, xpAfter) {
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
        xpAfter,
      }),
    )
  }

  return entries
}

function getCharacteristicTotalRank(rank) {
  return (rank.base ?? 0) + (rank.trained ?? 0) + (rank.bonus ?? 0)
}

function detectXpChanges(oldState, changes, actor, ts, userId, user, xpAfter) {
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
          xpAfter,
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
          xpAfter,
        }),
      )
    }
  }

  return entries
}

function detectDetailChanges(oldState, changes, actor, ts, userId, user, xpAfter) {
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
          xpAfter,
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
          xpAfter,
        }),
      )
    }
  }

  if (detailChanges.specializations !== undefined) {
    entries.push(...detectSpecializationChanges(oldState, detailChanges.specializations, actor, ts, userId, user, xpAfter))
  }

  return entries
}

function detectSpecializationChanges(oldState, specializationChanges, actor, ts, userId, user, xpAfter) {
  const entries = []

  for (const [key, value] of Object.entries(specializationChanges)) {
    if (key.startsWith('-=')) {
      const specializationId = key.slice(2)
      if (!specializationId) continue

      entries.push(
        makeEntry({
          type: 'specialization.remove',
          data: { specializationId },
          xpDelta: 0,
          ts,
          userId,
          user,
          xpAfter,
        }),
      )

      continue
    }

    const oldSpec = oldState.system?.details?.specializations?.[key]
    const newSpec = actor.system?.details?.specializations?.[key]

    if (!oldSpec && newSpec) {
      entries.push(
        makeEntry({
          type: 'specialization.add',
          data: { specializationId: key },
          xpDelta: 0,
          ts,
          userId,
          user,
          xpAfter,
        }),
      )
    }
  }

  return entries
}

function detectAdvancementChanges(oldState, changes, actor, ts, userId, user, xpAfter) {
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
      xpAfter,
    }),
  ]
}

/* -------------------------------------------- */
/*  Point d'entrée unique                       */
/* -------------------------------------------- */

export function composeEntries(oldState, changes, actor, userId) {
  try {
    const entries = []
    const expandedChanges = foundry.utils.expandObject(changes)
    const ts = Date.now()
    const xpAfter = captureXpSnapshotAfter(actor)
    const user = game.users?.get(userId) ?? null

    const hasBusinessChange = Boolean(
      expandedChanges.system?.skills ||
        expandedChanges.system?.characteristics ||
        expandedChanges.system?.details?.specializations ||
        expandedChanges.system?.advancement,
    )

    if (expandedChanges.system?.skills) {
      entries.push(...detectSkillChanges(oldState, expandedChanges, actor, ts, userId, user, xpAfter))
    }

    if (expandedChanges.system?.characteristics) {
      entries.push(...detectCharacteristicChanges(oldState, expandedChanges, actor, ts, userId, user, xpAfter))
    }

    // Les entrées métier portent déjà le coût XP.
    // On ne logge les changements XP que s'ils sont purs.
    if (expandedChanges.system?.progression?.experience && !hasBusinessChange) {
      entries.push(...detectXpChanges(oldState, expandedChanges, actor, ts, userId, user, xpAfter))
    }

    if (expandedChanges.system?.details) {
      entries.push(...detectDetailChanges(oldState, expandedChanges, actor, ts, userId, user, xpAfter))
    }

    if (expandedChanges.system?.advancement) {
      entries.push(...detectAdvancementChanges(oldState, expandedChanges, actor, ts, userId, user, xpAfter))
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

export {
  makeEntry,
  captureXpSnapshotAfter,
  computeSkillTrainCost,
  computeSkillForgetRefund,
  computeCharacteristicCost,
  inferIsCareer,
  getCareerSkillIds,
  reconstructPreviousValue,
}

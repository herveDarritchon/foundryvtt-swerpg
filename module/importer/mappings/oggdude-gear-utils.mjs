import { sanitizeOggDudeWeaponDescription, sanitizeText } from './oggdude-weapon-utils.mjs'
import { WEAPON_RANGE_MAP } from './oggdude-weapon-range-map.mjs'

const BRAWN_BASED_SKILLS = new Set(['melee', 'meleeheavy', 'meleelight', 'brawl', 'lightsaber'])

function ensureArray(value) {
  if (!value) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return parsed
}

function toCamelCase(key) {
  if (!key) {
    return key
  }
  return key.charAt(0).toLowerCase() + key.slice(1)
}

function humanizeLabel(value) {
  if (!value) {
    return ''
  }
  const sanitized = sanitizeText(String(value))
  if (!sanitized) {
    return ''
  }
  return sanitized
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeRangeValue(range) {
  if (!range) {
    return ''
  }
  const raw = String(range)
  if (WEAPON_RANGE_MAP[raw] !== undefined) {
    return WEAPON_RANGE_MAP[raw]
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  if (WEAPON_RANGE_MAP[trimmed] !== undefined) {
    return WEAPON_RANGE_MAP[trimmed]
  }
  const lowered = trimmed.toLowerCase()
  if (WEAPON_RANGE_MAP[lowered] !== undefined) {
    return WEAPON_RANGE_MAP[lowered]
  }
  const upper = trimmed.toUpperCase()
  if (WEAPON_RANGE_MAP[upper] !== undefined) {
    return WEAPON_RANGE_MAP[upper]
  }
  return lowered
}

function isBrawnSkill(skillKey) {
  if (!skillKey) {
    return false
  }
  const normalized = sanitizeText(String(skillKey))
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return BRAWN_BASED_SKILLS.has(normalized)
}

function formatDamageLabel(baseDamage, bonusDamage, skillKey) {
  if (baseDamage <= 0 && bonusDamage <= 0) {
    if (isBrawnSkill(skillKey)) {
      return 'Brawn'
    }
    return '0'
  }

  if (baseDamage <= 0 && bonusDamage > 0) {
    if (isBrawnSkill(skillKey)) {
      return `Brawn + ${bonusDamage}`
    }
    return `${bonusDamage}`
  }

  if (baseDamage > 0 && bonusDamage > 0) {
    return `${baseDamage} + ${bonusDamage}`
  }

  return `${baseDamage}`
}

export function sanitizeOggDudeGearDescription(description) {
  return sanitizeOggDudeWeaponDescription(description)
}

export function extractGearSourceInfo(source) {
  if (!source) {
    return { name: '', page: null }
  }

  if (typeof source === 'string') {
    return { name: sanitizeText(source), page: null }
  }

  const name = sanitizeText(source._ || source.name || source.Name || '')
  const candidate = source?.$?.Page ?? source?.page ?? source?.Page
  const parsed = Number.parseInt(candidate, 10)
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : null

  return { name, page }
}

export function formatGearSourceLine({ name, page }) {
  if (!name) {
    return ''
  }
  if (page) {
    return `Source: ${name}, p.${page}`
  }
  return `Source: ${name}`
}

export function slugifyGearCategory(value) {
  if (!value) {
    return 'general'
  }

  const sanitized = sanitizeText(String(value))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  return sanitized || 'general'
}

export function extractBaseMods(baseModsNode) {
  const mods = ensureArray(baseModsNode?.Mod ?? baseModsNode)
  const descriptionLines = []
  const structuredMods = []
  let totalDieModifiers = 0

  for (const mod of mods) {
    if (!mod) {
      continue
    }

    const description = sanitizeText(mod?.MiscDesc ?? mod?.Description ?? '')
    const dieModifiersInput = ensureArray(mod?.DieModifiers?.DieModifier)
    const dieModifiers = []

    for (const modifier of dieModifiersInput) {
      if (!modifier) {
        continue
      }

      const sanitizedModifier = {}

      for (const [rawKey, rawValue] of Object.entries(modifier)) {
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          continue
        }

        if (typeof rawValue === 'object') {
          continue
        }

        if (typeof rawValue === 'string') {
          if (rawKey.endsWith('Count') || rawKey.endsWith('Value')) {
            const parsedValue = parseInteger(rawValue, 0)
            if (parsedValue !== 0) {
              sanitizedModifier[toCamelCase(rawKey)] = parsedValue
            }
            continue
          }
          sanitizedModifier[toCamelCase(rawKey)] = sanitizeText(rawValue)
          continue
        }

        if (typeof rawValue === 'number') {
          if (rawKey.endsWith('Count') || rawKey.endsWith('Value')) {
            if (rawValue !== 0) {
              sanitizedModifier[toCamelCase(rawKey)] = rawValue
            }
            continue
          }
          sanitizedModifier[toCamelCase(rawKey)] = rawValue
          continue
        }

        if (typeof rawValue === 'boolean') {
          sanitizedModifier[toCamelCase(rawKey)] = rawValue
        }
      }

      if (Object.keys(sanitizedModifier).length > 0) {
        dieModifiers.push(sanitizedModifier)
      }
    }

    totalDieModifiers += dieModifiers.length

    const structuredMod = {}
    if (description) {
      structuredMod.description = description
      descriptionLines.push(description)
    }
    if (dieModifiers.length > 0) {
      structuredMod.dieModifiers = dieModifiers
    }
    if (Object.keys(structuredMod).length > 0) {
      structuredMods.push(structuredMod)
    }
  }

  return {
    baseMods: structuredMods,
    descriptionLines,
    metrics: {
      totalMods: structuredMods.length,
      totalDieModifiers,
    },
  }
}

export function extractWeaponProfile(weaponModifiersNode) {
  const weaponModifiers = ensureArray(weaponModifiersNode?.WeaponModifier ?? weaponModifiersNode)
  if (weaponModifiers.length === 0) {
    return {
      weaponProfile: null,
      descriptionLines: [],
      metrics: {
        totalWeaponModifiers: 0,
        totalQualities: 0,
        extraModifiers: 0,
      },
    }
  }

  const [primary, ...others] = weaponModifiers
  const skillKey = sanitizeText(primary?.SkillKey ?? primary?.AllSkillKey ?? '')
  const baseDamage = parseInteger(primary?.Damage, 0)
  const damageAdd = parseInteger(primary?.DamageAdd, 0)
  const crit = parseInteger(primary?.Crit ?? primary?.CritSub, 0)
  const rangeValueRaw = primary?.RangeValue ?? primary?.Range ?? ''
  const normalizedRangeValue = normalizeRangeValue(rangeValueRaw)
  const rangeLabel = humanizeLabel(normalizedRangeValue || rangeValueRaw)

  const qualityMap = new Map()
  const qualitiesInput = ensureArray(primary?.Qualities?.Quality)
  for (const quality of qualitiesInput) {
    if (!quality) {
      continue
    }
    const key = sanitizeText(quality?.Key ?? quality)
    if (!key) {
      continue
    }
    const normalizedKey = key.toLowerCase()
    const rawCount = quality?.Count ?? quality?.count
    const parsedCount = parseInteger(rawCount, 1)
    const rank = parsedCount > 0 ? parsedCount : 1
    qualityMap.set(normalizedKey, (qualityMap.get(normalizedKey) ?? 0) + rank)
  }

  const qualities = Array.from(qualityMap.entries())
    .map(([key, rank]) => ({ key, rank }))
    .sort((a, b) => a.key.localeCompare(b.key))

  const descriptionLines = []
  const skillLabel = humanizeLabel(skillKey)
  if (skillLabel) {
    descriptionLines.push(`- Can be used as a ${skillLabel.toLowerCase()} weapon.`)
    descriptionLines.push(`- Skill: ${skillLabel}`)
  } else {
    descriptionLines.push('- Can be used as a weapon.')
  }

  const damageLabel = formatDamageLabel(baseDamage, damageAdd, skillKey)
  descriptionLines.push(`- Damage: ${damageLabel}`)
  descriptionLines.push(`- Crit: ${crit}`)
  descriptionLines.push(`- Range: ${rangeLabel || 'Unknown'}`)

  if (qualities.length > 0) {
    descriptionLines.push('- Qualities:')
    for (const quality of qualities) {
      const qualityLabel = humanizeLabel(quality.key)
      const rankLabel = quality.rank > 0 ? quality.rank : 1
      descriptionLines.push(`  - ${qualityLabel || quality.key}: ${rankLabel}`)
    }
  }

  const weaponProfile = {
    ...(skillKey && { skillKey }),
    damage: baseDamage,
    damageAdd,
    crit,
    rangeValue: normalizedRangeValue || sanitizeText(rangeValueRaw) || '',
    ...(qualities.length > 0 && { qualities }),
  }

  if (primary?.UnarmedName || primary?.Name) {
    weaponProfile.name = sanitizeText(primary?.UnarmedName ?? primary?.Name)
  }

  if (primary?.Unarmed !== undefined) {
    weaponProfile.unarmed = Boolean(primary.Unarmed)
  }

  return {
    weaponProfile,
    descriptionLines,
    metrics: {
      totalWeaponModifiers: weaponModifiers.length,
      totalQualities: qualities.length,
      extraModifiers: others.length,
    },
  }
}

export function composeGearDescription({ baseDescription, sourceLine, baseModsLines = [], weaponUseLines = [] }) {
  const sections = []
  const cleanedBase = (baseDescription ?? '').trim()
  const lowerBase = cleanedBase.toLowerCase()

  if (cleanedBase) {
    sections.push(cleanedBase)
  }

  if (sourceLine) {
    const normalizedSource = sourceLine.trim()
    if (normalizedSource && !lowerBase.includes(normalizedSource.toLowerCase())) {
      const previous = sections[sections.length - 1]
      if (previous && previous === cleanedBase) {
        sections[sections.length - 1] = `${previous}\n\n${normalizedSource}`
      } else {
        sections.push(normalizedSource)
      }
    }
  }

  if (baseModsLines.length > 0) {
    const block = ['Base Mods:', ...baseModsLines.map((line) => `- ${line}`)]
    sections.push(block.join('\n'))
  }

  if (weaponUseLines.length > 0) {
    const block = ['Weapon Use:', ...weaponUseLines]
    sections.push(block.join('\n'))
  }

  return sections.join('\n\n').trim()
}

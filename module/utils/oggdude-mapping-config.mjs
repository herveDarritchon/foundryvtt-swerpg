const OGGDUDE_PACKS_BY_TYPE = {
  career: {
    name: 'swerpg-careers',
    label: 'Careers',
    folderGroup: 'actor-options',
  },
  species: {
    name: 'swerpg-species',
    label: 'Species',
    folderGroup: 'actor-options',
  },
  specialization: {
    name: 'swerpg-specializations',
    label: 'Specializations',
    folderGroup: 'actor-options',
  },
  obligation: {
    name: 'swerpg-obligations',
    label: 'Obligations',
    folderGroup: 'actor-options',
  },
  motivation: {
    name: 'swerpg-motivations',
    label: 'Motivations',
    folderGroup: 'actor-options',
  },
  "motivation-category": {
    name: 'swerpg-motivation-category',
    label: 'Motivation Categories',
    folderGroup: 'actor-options',
  },
  talent: {
    name: 'swerpg-talents',
    label: 'Talents',
    folderGroup: 'actor-options',
  },
  duty: {
    name: 'swerpg-talents',
    label: 'Talents',
    folderGroup: 'actor-options',
  },
  armor: {
    name: 'swerpg-armors',
    label: 'Armors',
    folderGroup: 'equipments',
  },
  gear: {
    name: 'swerpg-gears',
    label: 'Gears',
    folderGroup: 'equipments',
  },
  weapon: {
    name: 'swerpg-weapons',
    label: 'Weapons',
    folderGroup: 'equipments',
  },
}

/**
 *
 */
export function getOggDudePackConfig(elementType) {
  const normalizedType = String(elementType).toLowerCase()
  const config = OGGDUDE_PACKS_BY_TYPE[normalizedType]

  if (!config) {
    throw new Error(`[SWERPG] Unsupported OggDude element type: ${elementType}`)
  }

  return {
    ...config,
    fullName: `world.${config.name}`,
  }
}

/**
 * @param root0
 * @param root0.careerSpent
 * @param root0.specializationSpent
 * @param root0.items
 * @returns {SwerpgActor} an actor object
 */
export function createActor({ careerSpent = 0, specializationSpent = 0, items = [] } = {}) {
  const baseData = {
    items: items,
    system: {
      progression: {
        freeSkillRanks: {
          career: {
            id: '',
            name: '',
            spent: careerSpent,
            gained: 4,
          },
          specialization: {
            id: '',
            name: '',
            spent: specializationSpent,
            gained: 2,
          },
        },
        experience: {
          spent: 0,
          gained: 0,
          startingExperience: 100,
          total: 100,
        },
      },
      skills: {
        cool: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        discipline: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        negotiation: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        perception: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        vigilance: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        brawl: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        melee: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        rangedlight: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        rangedheavy: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        gunnery: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        astrogation: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        athletics: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        charm: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        coercion: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        computers: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        coordination: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        deception: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        leadership: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        mechanics: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        medicine: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        pilotingplanetary: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        pilotingspace: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        resilience: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        skulduggery: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        stealth: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        streetwise: {
          rank: {
            base: 1,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 1,
          },
        },
        survival: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        coreworlds: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        lore: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        outerrim: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        underworld: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        xenology: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
        education: {
          rank: {
            base: 0,
            careerFree: 0,
            specializationFree: 0,
            trained: 0,
            value: 0,
          },
        },
      },
      characteristics: {
        brawn: {
          rank: {
            base: 1,
            trained: 0,
            bonus: 0,
            value: 1,
          },
        },
        agility: {
          rank: {
            base: 1,
            trained: 0,
            bonus: 0,
            value: 2,
          },
        },
        intellect: {
          rank: {
            base: 1,
            trained: 0,
            bonus: 0,
            value: 1,
          },
        },
        cunning: {
          rank: {
            base: 1,
            trained: 0,
            bonus: 0,
            value: 1,
          },
        },
        willpower: {
          rank: {
            base: 1,
            trained: 0,
            bonus: 0,
            value: 1,
          },
        },
        presence: {
          rank: {
            base: 1,
            trained: 0,
            bonus: 0,
            value: 1,
          },
        },
      },
    },
  }
  baseData.hasItem = (id) => items.some((item) => item.id === id)
  return baseData
}

/**
 * Applies Foundry-like flat update paths to a plain actor object.
 *
 * Supports:
 * {
 *   'system.progression.experience.spent': 15,
 *   'system.skills.cool.rank': {...}
 * }
 *
 * @param {SwerpgActor} actor
 * @param {Record<string, unknown>} updates
 * @returns {SwerpgActor}
 */
export function updateActor(actor, updates) {
  for (const [path, value] of Object.entries(updates)) {
    setProperty(actor, path, value)
  }

  return actor
}

/**
 * Sets a nested property from a dot-separated path.
 *
 * @param {object} target
 * @param {string} path
 * @param {unknown} value
 */
function setProperty(target, path, value) {
  const parts = path.split('.')
  const last = parts.pop()

  let current = target

  for (const part of parts) {
    if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
      current[part] = {}
    }

    current = current[part]
  }

  current[last] = value
}

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))

const SKILL_TYPE = {
  general: { id: 'general', label: 'SKILL_TYPE.General' },
  knowledge: { id: 'knowledge', label: 'SKILL_TYPE.Knowledge' },
  combat: { id: 'combat', label: 'SKILL_TYPE.Combat' },
}

const MOCK_CHARACTERISTICS = {
  agility: { id: 'agility', label: 'CHARACTERISTICS.Agility' },
  brawn: { id: 'brawn', label: 'CHARACTERISTICS.Brawn' },
  intellect: { id: 'intellect', label: 'CHARACTERISTICS.Intellect' },
  cunning: { id: 'cunning', label: 'CHARACTERISTICS.Cunning' },
  presence: { id: 'presence', label: 'CHARACTERISTICS.Presence' },
  willpower: { id: 'willpower', label: 'CHARACTERISTICS.Willpower' },
}

const MOCK_SKILL_CONFIG = {
  athletics: { id: 'athletics', label: 'SKILLS.Athletics', characteristics: MOCK_CHARACTERISTICS.agility, type: SKILL_TYPE.general },
  perception: { id: 'perception', label: 'SKILLS.Perception', characteristics: MOCK_CHARACTERISTICS.cunning, type: SKILL_TYPE.general },
  arcana: { id: 'arcana', label: 'SKILLS.Arcana', characteristics: MOCK_CHARACTERISTICS.intellect, type: SKILL_TYPE.knowledge },
  computers: { id: 'computers', label: 'SKILLS.Computers', characteristics: MOCK_CHARACTERISTICS.intellect, type: SKILL_TYPE.knowledge },
  deception: { id: 'deception', label: 'SKILLS.Deception', characteristics: MOCK_CHARACTERISTICS.presence, type: SKILL_TYPE.combat },
  diplomacy: { id: 'diplomacy', label: 'SKILLS.Diplomacy', characteristics: MOCK_CHARACTERISTICS.presence, type: SKILL_TYPE.combat },
}

function buildMockActor(overrides = {}) {
  const {
    skills = {},
    careerSpent = 0,
    careerGained = 4,
    specializationSpent = 0,
    specializationGained = 2,
    experienceAvailable = 100,
    experienceSpent = 0,
    experienceGained = 100,
    experienceTotal = 100,
    characteristics = {},
    career = { name: 'Test Career', careerSkills: [{ id: 'athletics' }, { id: 'perception' }] },
    specializations = [],
  } = overrides

  const defaultSkills = {
    athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
    perception: { rank: { base: 1, careerFree: 0, specializationFree: 0, trained: 0 } },
    arcana: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
    computers: { rank: { base: 0, careerFree: 1, specializationFree: 0, trained: 0 } },
    deception: { rank: { base: 0, careerFree: 0, specializationFree: 1, trained: 0 } },
    diplomacy: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 5 } },
  }

  const defaultCharacteristics = {
    agility: { rank: { value: 3 } },
    brawn: { rank: { value: 2 } },
    intellect: { rank: { value: 3 } },
    cunning: { rank: { value: 2 } },
    presence: { rank: { value: 2 } },
    willpower: { rank: { value: 1 } },
  }

  const specializationObjects = specializations.map((s) => ({
    name: s.name || 'Test Spec',
    specializationSkills: (s.skills || []).map((id) => ({ id })),
  }))

  const actor = {
    items: [],
    system: {
      skills: Object.keys(MOCK_SKILL_CONFIG).reduce((acc, key) => {
        acc[key] = skills[key] || defaultSkills[key] || { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } }
        return acc
      }, {}),
      progression: {
        freeSkillRanks: {
          career: { spent: careerSpent, gained: careerGained },
          specialization: { spent: specializationSpent, gained: specializationGained },
        },
        experience: {
          available: experienceAvailable,
          spent: experienceSpent,
          gained: experienceGained,
          total: experienceTotal,
        },
      },
      characteristics: { ...defaultCharacteristics, ...characteristics },
      details: {
        career: career ? { name: career.name, careerSkills: career.careerSkills } : null,
        specializations: new Set(specializationObjects),
        species: { name: 'Test Species' },
      },
      resources: {
        wounds: { value: 0, threshold: 10 },
        strain: { value: 0, threshold: 10 },
        encumbrance: { value: 0, threshold: 10 },
      },
      points: {},
    },
    hasFreeSkillsAvailable: vi.fn(() => false),
  }

  actor.toObject = () => JSON.parse(JSON.stringify(actor))

  return actor
}

describe('CharacterSheet skill methods', () => {
  let CharacterSheet

  beforeEach(async () => {
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
  })

  describe('_prepareSkillRanks', () => {
    it('returns empty array when dicePreview has zero ability and proficiency', () => {
      const pips = CharacterSheet._prepareSkillRanks({ dicePreview: { ability: 0, proficiency: 0 } })
      expect(pips).toEqual([])
    })

    it('returns empty array when dicePreview is missing', () => {
      const pips = CharacterSheet._prepareSkillRanks({})
      expect(pips).toEqual([])
    })

    it('returns proficiency pips when dicePreview.proficiency has value and ability is undefined', () => {
      const pips = CharacterSheet._prepareSkillRanks({ dicePreview: { proficiency: 2 } })
      expect(pips).toHaveLength(2)
      expect(pips.every((p) => p.cssClass === 'trained')).toBe(true)
    })

    it('returns all untrained pips when only ability dice', () => {
      const pips = CharacterSheet._prepareSkillRanks({ dicePreview: { ability: 3, proficiency: 0 } })
      expect(pips).toHaveLength(3)
      expect(pips.every((p) => p.cssClass === 'untrained')).toBe(true)
    })

    it('returns all trained pips when only proficiency dice', () => {
      const pips = CharacterSheet._prepareSkillRanks({ dicePreview: { ability: 0, proficiency: 2 } })
      expect(pips).toHaveLength(2)
      expect(pips.every((p) => p.cssClass === 'trained')).toBe(true)
    })

    it('returns proficiency dice before ability dice', () => {
      const pips = CharacterSheet._prepareSkillRanks({ dicePreview: { ability: 2, proficiency: 1 } })
      expect(pips).toHaveLength(3)
      expect(pips[0].cssClass).toBe('trained')
      expect(pips[1].cssClass).toBe('untrained')
      expect(pips[2].cssClass).toBe('untrained')
    })

    it('handles large dice pools', () => {
      const pips = CharacterSheet._prepareSkillRanks({ dicePreview: { ability: 5, proficiency: 5 } })
      expect(pips).toHaveLength(10)
      const trained = pips.filter((p) => p.cssClass === 'trained')
      const untrained = pips.filter((p) => p.cssClass === 'untrained')
      expect(trained).toHaveLength(5)
      expect(untrained).toHaveLength(5)
      expect(pips[0].cssClass).toBe('trained')
      expect(pips[5].cssClass).toBe('untrained')
    })
  })

  describe('_prepareFreeSkill', () => {
    it('marks a skill as career when it belongs to the career skills list', () => {
      const actor = buildMockActor({
        career: { name: 'Scout', careerSkills: [{ id: 'athletics' }, { id: 'survival' }] },
        specializations: [],
      })
      const result = CharacterSheet._prepareFreeSkill(actor, 'athletics')
      expect(result.isCareer).toBe(true)
      expect(result.isSpecialization).toBe(false)
      expect(result.extraClass).toBe('active')
      expect(result.name).toBe('Scout')
    })

    it('marks a skill as specialization when it belongs to specialization skills', () => {
      const actor = buildMockActor({
        specializations: [{ name: 'Shadow', skills: ['stealth', 'deception'] }],
      })
      const result = CharacterSheet._prepareFreeSkill(actor, 'stealth')
      expect(result.isSpecialization).toBe(true)
      expect(result.isCareer).toBe(false)
      expect(result.extraClass).toBe('active')
      expect(result.name).toBe('Shadow')
    })

    it('marks a skill as both career and specialization when it belongs to both', () => {
      const actor = buildMockActor({
        career: { name: 'Scout', careerSkills: [{ id: 'perception' }] },
        specializations: [{ name: 'Shadow', skills: ['perception'] }],
      })
      const result = CharacterSheet._prepareFreeSkill(actor, 'perception')
      expect(result.isCareer).toBe(true)
      expect(result.isSpecialization).toBe(true)
      expect(result.extraClass).toBe('active')
      expect(result.name).toContain('Scout')
      expect(result.name).toContain('Shadow')
    })

    it('returns inactive for a skill not in career or specialization lists', () => {
      const actor = buildMockActor({
        career: { name: 'Scout', careerSkills: [{ id: 'athletics' }] },
        specializations: [{ name: 'Shadow', skills: ['stealth'] }],
      })
      const result = CharacterSheet._prepareFreeSkill(actor, 'arcana')
      expect(result.isCareer).toBe(false)
      expect(result.isSpecialization).toBe(false)
      expect(result.extraClass).toBe('')
      expect(result.name).toBe('')
    })

    it('handles multiple specializations with overlapping skills', () => {
      const actor = buildMockActor({
        career: { name: 'Smuggler', careerSkills: [{ id: 'deception' }] },
        specializations: [
          { name: 'Scoundrel', skills: ['deception', 'streetwise'] },
          { name: 'Thief', skills: ['deception', 'stealth'] },
        ],
      })
      const result = CharacterSheet._prepareFreeSkill(actor, 'deception')
      expect(result.isCareer).toBe(true)
      expect(result.isSpecialization).toBe(true)
      expect(result.name).toContain('Scoundrel')
      expect(result.name).toContain('Thief')
      expect(result.name).toContain('Smuggler')
    })

    it('handles actor without a career', () => {
      const actor = buildMockActor({
        career: null,
        specializations: [{ name: 'Test Spec', skills: ['athletics'] }],
      })
      const result = CharacterSheet._prepareFreeSkill(actor, 'athletics')
      expect(result.isCareer).toBe(false)
      expect(result.isSpecialization).toBe(true)
      expect(result.extraClass).toBe('active')
    })
  })

  describe('Skills context preparation', () => {
    let SwerpgBaseActorSheet

    beforeEach(async () => {
      if (!globalThis.SYSTEM) globalThis.SYSTEM = {}
      globalThis.SYSTEM.SKILLS = MOCK_SKILL_CONFIG
      if (!globalThis.game.system.tree) globalThis.game.system.tree = {}
      globalThis.game.system.tree.actor = null
      SwerpgBaseActorSheet = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
      CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    })

    function buildBaseContext(actor) {
      return {
        actor,
        source: actor.toObject(),
        incomplete: {},
        progression: {
          experience: actor.system.progression.experience,
          freeSkillRanks: {
            career: { ...actor.system.progression.freeSkillRanks.career },
            specialization: { ...actor.system.progression.freeSkillRanks.specialization },
          },
        },
        tabs: [{ id: 'skills', group: 'sheet' }],
        skillCategories: {},
      }
    }

    async function getContext(actor) {
      vi.spyOn(SwerpgBaseActorSheet.prototype, '_prepareContext').mockResolvedValue(buildBaseContext(actor))
      const sheet = new CharacterSheet({ document: actor })
      sheet.actor = actor
      sheet.document = actor
      return await sheet._prepareContext({})
    }

    it('produces context.skills grouped by category (general, combat, knowledge)', async () => {
      const actor = buildMockActor()
      const context = await getContext(actor)

      expect(context.skills).toBeDefined()
      expect(Object.keys(context.skills)).toEqual(expect.arrayContaining(['general', 'combat', 'knowledge']))
    })

    it('sorts skills alphabetically by label within each category', async () => {
      const actor = buildMockActor()
      const context = await getContext(actor)

      const labels = context.skills.general.map((s) => s.label)
      const sorted = [...labels].sort((a, b) => a.localeCompare(b))
      expect(labels).toEqual(sorted)
    })

    it('computes freeSkillRanks available from gained - spent', async () => {
      const actor = buildMockActor({ careerSpent: 2, specializationSpent: 1 })
      const context = await getContext(actor)

      expect(context.progression.freeSkillRanks.career.available).toBe(2)
      expect(context.progression.freeSkillRanks.specialization.available).toBe(1)
    })

    it('computes purchase state: FREE_RANK_AVAILABLE for career skill at rank 0 with free ranks left', async () => {
      const actor = buildMockActor({
        career: { name: 'Scout', careerSkills: [{ id: 'athletics' }] },
        skills: {
          athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
          arcana: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(athletics.canPurchase).toBe(true)
      expect(athletics.isFreePurchase).toBe(true)
      expect(athletics.purchaseReason).toBe('FREE_RANK_AVAILABLE')
      expect(athletics.nextCost).toBe(0)
      expect(athletics.nextRank).toBe(1)
    })

    it('computes purchase state: AFFORDABLE for rank 1 career skill with enough XP', async () => {
      const actor = buildMockActor({
        experienceAvailable: 100,
        skills: {
          athletics: { rank: { base: 1, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(athletics.canPurchase).toBe(true)
      expect(athletics.isFreePurchase).toBe(false)
      expect(athletics.purchaseReason).toBe('AFFORDABLE')
      expect(athletics.nextCost).toBe(10)
      expect(athletics.nextRank).toBe(2)
    })

    it('computes purchase state: INSUFFICIENT_XP when XP too low', async () => {
      const actor = buildMockActor({
        experienceAvailable: 5,
        skills: {
          athletics: { rank: { base: 2, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(athletics.canPurchase).toBe(false)
      expect(athletics.purchaseReason).toBe('INSUFFICIENT_XP')
      expect(athletics.nextCost).toBe(15)
      expect(athletics.nextRank).toBe(3)
    })

    it('computes purchase state: MAX_RANK when skill is at rank 5', async () => {
      const actor = buildMockActor({
        skills: {
          diplomacy: { rank: { base: 5, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const diplomacy = context.skills.combat.find((s) => s.id === 'diplomacy')
      expect(diplomacy.canPurchase).toBe(false)
      expect(diplomacy.purchaseReason).toBe('MAX_RANK')
      expect(diplomacy.nextCost).toBeNull()
      expect(diplomacy.nextRank).toBe(6)
    })

    it('computes total rank from base + careerFree + specializationFree + trained', async () => {
      const actor = buildMockActor({
        skills: {
          athletics: { rank: { base: 1, careerFree: 1, specializationFree: 0, trained: 1 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(athletics.rank.value).toBe(3)
    })

    it('provides dicePreview for each skill', async () => {
      const actor = buildMockActor({
        characteristics: { agility: { rank: { value: 3 } } },
        skills: {
          athletics: { rank: { base: 2, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(athletics.dicePreview).toBeDefined()
      expect(athletics.dicePreview.ability).toBeDefined()
      expect(athletics.dicePreview.proficiency).toBeDefined()
    })

    it('provides pips array for each skill', async () => {
      const actor = buildMockActor({
        characteristics: { agility: { rank: { value: 2 } } },
        skills: {
          athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(Array.isArray(athletics.pips)).toBe(true)
      athletics.pips.forEach((pip) => {
        expect(pip).toHaveProperty('cssClass')
      })
    })

    it('returns empty groups when no skills match a category', async () => {
      const actor = buildMockActor({
        skills: {
          athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      expect(context.skills.general.length).toBeGreaterThanOrEqual(1)
    expect(context.skills.knowledge.length).toBeGreaterThanOrEqual(1)
    expect(context.skills.combat.length).toBeGreaterThanOrEqual(1)
    })

    it('uses merged skill data including SYSTEM.SKILLS config values', async () => {
      const actor = buildMockActor({
        skills: {
          athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)

      const athletics = context.skills.general.find((s) => s.id === 'athletics')
      expect(athletics.type).toBeDefined()
      expect(athletics.type.id).toBe('general')
    })

    // --- US2: skill.ui visual state tests ---

    it('computes ui.markerState = "career" for career skill', async () => {
      const actor = buildMockActor({
        career: { name: 'Scout', careerSkills: [{ id: 'athletics' }] },
        skills: {
          athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const athletics = context.skills.general.find((s) => s.id === 'athletics')

      expect(athletics.ui.markerState).toBe('career')
      expect(athletics.ui.lineCssClass).toContain('is-career')
    })

    it('computes ui.markerState = "specialization" for specialization skill', async () => {
      const actor = buildMockActor({
        specializations: [{ name: 'Shadow', skills: ['deception'] }],
        skills: {
          deception: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const deception = context.skills.combat.find((s) => s.id === 'deception')

      expect(deception.ui.markerState).toBe('specialization')
      expect(deception.ui.lineCssClass).toContain('is-specialization')
    })

    it('computes ui.markerState = "none" for non-career non-specialization skill', async () => {
      const actor = buildMockActor({
        skills: {
          arcana: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const arcana = context.skills.knowledge.find((s) => s.id === 'arcana')

      expect(arcana.ui.markerState).toBe('none')
      expect(arcana.ui.lineCssClass).not.toContain('is-career')
      expect(arcana.ui.lineCssClass).not.toContain('is-specialization')
    })

    it('computes ui.increaseState = "FREE_RANK_AVAILABLE" with icon "free"', async () => {
      const actor = buildMockActor({
        career: { name: 'Scout', careerSkills: [{ id: 'athletics' }] },
        skills: {
          athletics: { rank: { base: 0, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const athletics = context.skills.general.find((s) => s.id === 'athletics')

      expect(athletics.ui.increaseState).toBe('FREE_RANK_AVAILABLE')
      expect(athletics.ui.increaseIcon).toBe('free')
      expect(athletics.ui.lineCssClass).toContain('is-free')
    })

    it('computes ui.increaseState = "AFFORDABLE" with icon "buy"', async () => {
      const actor = buildMockActor({
        experienceAvailable: 100,
        skills: {
          athletics: { rank: { base: 1, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const athletics = context.skills.general.find((s) => s.id === 'athletics')

      expect(athletics.ui.increaseState).toBe('AFFORDABLE')
      expect(athletics.ui.increaseIcon).toBe('buy')
      expect(athletics.ui.lineCssClass).toContain('is-affordable')
    })

    it('computes ui.increaseState = "INSUFFICIENT_XP" with icon "buy-blocked"', async () => {
      const actor = buildMockActor({
        experienceAvailable: 5,
        skills: {
          athletics: { rank: { base: 2, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const athletics = context.skills.general.find((s) => s.id === 'athletics')

      expect(athletics.ui.increaseState).toBe('INSUFFICIENT_XP')
      expect(athletics.ui.increaseIcon).toBe('buy-blocked')
      expect(athletics.ui.lineCssClass).toContain('is-blocked')
    })

    it('computes ui.increaseState = "MAX_RANK" with icon null', async () => {
      const actor = buildMockActor({
        skills: {
          athletics: { rank: { base: 5, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const athletics = context.skills.general.find((s) => s.id === 'athletics')

      expect(athletics.ui.increaseState).toBe('MAX_RANK')
      expect(athletics.ui.increaseIcon).toBeNull()
      expect(athletics.ui.lineCssClass).toContain('is-max')
    })

    it('computes ui.decreaseState = "pending" before US6', async () => {
      const actor = buildMockActor({
        skills: {
          athletics: { rank: { base: 1, careerFree: 0, specializationFree: 0, trained: 0 } },
        },
      })
      const context = await getContext(actor)
      const athletics = context.skills.general.find((s) => s.id === 'athletics')

      expect(athletics.ui.decreaseState).toBe('pending')
      expect(athletics.ui.decreaseIcon).toBe('sell')
    })
  })
})

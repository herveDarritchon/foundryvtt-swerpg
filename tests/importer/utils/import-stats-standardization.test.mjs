import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetTalentImportStats,
  incrementTalentImportStat,
  getTalentImportStats,
  addTalentUnknownNode,
  addTalentUnknownActivation,
} from '../../../module/importer/utils/talent-import-utils.mjs'
import {
  resetWeaponImportStats,
  incrementWeaponImportStat,
  getWeaponImportStats,
  addWeaponUnknownSkill,
  addWeaponUnknownQuality,
} from '../../../module/importer/utils/weapon-import-utils.mjs'
import {
  resetCareerImportStats,
  incrementCareerImportStat,
  getCareerImportStats,
  addCareerUnknownSkill,
} from '../../../module/importer/utils/career-import-utils.mjs'
import {
  resetSpecializationImportStats,
  incrementSpecializationImportStat,
  getSpecializationImportStats,
  addSpecializationUnknownSkill,
} from '../../../module/importer/utils/specialization-import-utils.mjs'
import { resetArmorImportStats, incrementArmorImportStat, getArmorImportStats } from '../../../module/importer/utils/armor-import-utils.mjs'
import { resetGearImportStats, incrementGearImportStat, getGearImportStats, addGearUnknownCategory } from '../../../module/importer/utils/gear-import-utils.mjs'
import {
  resetSpeciesImportStats,
  incrementSpeciesImportStat,
  getSpeciesImportStats,
  addSpeciesUnknownTalent,
} from '../../../module/importer/utils/species-import-utils.mjs'
import {
  resetObligationImportStats,
  incrementObligationImportStat,
  getObligationImportStats,
  addUnknownObligationProperty,
} from '../../../module/importer/utils/obligation-import-utils.mjs'

/**
 * Tests de standardisation de ImportStats
 * Vérifie que tous les modules utils utilisent les conventions standard :
 * - total, rejected, imported (calculé automatiquement)
 * - métriques additionnelles spécifiques au domaine
 * - pas de fonctions _unsafeInternal*
 */

describe('Import Stats Standardization', () => {
  describe('Standard Metrics (total, rejected, imported)', () => {
    it('should provide standard metrics for talent imports', () => {
      resetTalentImportStats()
      incrementTalentImportStat('total', 10)
      incrementTalentImportStat('rejected', 2)

      const stats = getTalentImportStats()
      expect(stats.total).toBe(10)
      expect(stats.rejected).toBe(2)
      expect(stats.imported).toBe(8)
    })

    it('should provide standard metrics for weapon imports', () => {
      resetWeaponImportStats()
      incrementWeaponImportStat('total', 15)
      incrementWeaponImportStat('rejected', 3)

      const stats = getWeaponImportStats()
      expect(stats.total).toBe(15)
      expect(stats.rejected).toBe(3)
      expect(stats.imported).toBe(12)
    })

    it('should provide standard metrics for career imports', () => {
      resetCareerImportStats()
      incrementCareerImportStat('total', 5)
      incrementCareerImportStat('rejected', 1)

      const stats = getCareerImportStats()
      expect(stats.total).toBe(5)
      expect(stats.rejected).toBe(1)
      expect(stats.imported).toBe(4)
    })

    it('should provide standard metrics for armor imports', () => {
      resetArmorImportStats()
      incrementArmorImportStat('total', 8)
      incrementArmorImportStat('rejected', 0)

      const stats = getArmorImportStats()
      expect(stats.total).toBe(8)
      expect(stats.rejected).toBe(0)
      expect(stats.imported).toBe(8)
    })

    it('should provide standard metrics for gear imports', () => {
      resetGearImportStats()
      incrementGearImportStat('total', 20)
      incrementGearImportStat('rejected', 5)

      const stats = getGearImportStats()
      expect(stats.total).toBe(20)
      expect(stats.rejected).toBe(5)
      expect(stats.imported).toBe(15)
    })

    it('should provide standard metrics for species imports', () => {
      resetSpeciesImportStats()
      incrementSpeciesImportStat('total', 12)
      incrementSpeciesImportStat('rejected', 2)

      const stats = getSpeciesImportStats()
      expect(stats.total).toBe(12)
      expect(stats.rejected).toBe(2)
      expect(stats.imported).toBe(10)
    })

    it('should provide standard metrics for obligation imports', () => {
      resetObligationImportStats()
      incrementObligationImportStat('total', 6)
      incrementObligationImportStat('rejected', 1)

      const stats = getObligationImportStats()
      expect(stats.total).toBe(6)
      expect(stats.rejected).toBe(1)
      expect(stats.imported).toBe(5)
    })
  })

  describe('Domain-Specific Metrics', () => {
    it('should track talent-specific metrics', () => {
      resetTalentImportStats()
      incrementTalentImportStat('validation_failed', 3)
      incrementTalentImportStat('transform_failed', 1)
      incrementTalentImportStat('duplicates', 2)
      addTalentUnknownNode('node123')
      addTalentUnknownNode('node456')
      addTalentUnknownActivation('ACT_UNKNOWN')

      const stats = getTalentImportStats()
      expect(stats.validation_failed).toBe(3)
      expect(stats.transform_failed).toBe(1)
      expect(stats.duplicates).toBe(2)
      expect(stats.unresolvedNodes).toBe(2)
      expect(stats.unknownActivations).toBe(1)
      expect(stats.nodeDetails).toContain('node123')
      expect(stats.nodeDetails).toContain('node456')
      expect(stats.activationDetails).toContain('ACT_UNKNOWN')
    })

    it('should track weapon-specific metrics', () => {
      resetWeaponImportStats()
      addWeaponUnknownSkill('SKILL_X')
      addWeaponUnknownSkill('SKILL_Y')
      addWeaponUnknownQuality('QUAL_Z')

      const stats = getWeaponImportStats()
      expect(stats.unknownSkills).toBe(2)
      expect(stats.unknownQualities).toBe(1)
      expect(stats.skillDetails).toContain('SKILL_X')
      expect(stats.skillDetails).toContain('SKILL_Y')
      expect(stats.qualityDetails).toContain('QUAL_Z')
    })

    it('should track career-specific metrics', () => {
      resetCareerImportStats()
      addCareerUnknownSkill('UNKNOWN_SKILL')
      incrementCareerImportStat('skillCount', 5)

      const stats = getCareerImportStats()
      expect(stats.unknownSkills).toBe(1)
      expect(stats.skillCount).toBe(5)
      expect(stats.skillDetails).toContain('UNKNOWN_SKILL')
    })

    it('should track specialization-specific metrics', () => {
      resetSpecializationImportStats()
      incrementSpecializationImportStat('total', 5)
      incrementSpecializationImportStat('rejected', 1)
      addSpecializationUnknownSkill('SPEC_SKILL')
      incrementSpecializationImportStat('skillCount', 8)

      const stats = getSpecializationImportStats()
      expect(stats.total).toBe(5)
      expect(stats.rejected).toBe(1)
      expect(stats.imported).toBe(4) // total - rejected
      expect(stats.unknownSkills).toBe(1)
      expect(stats.skillCount).toBe(8)
      expect(stats.skillDetails).toContain('SPEC_SKILL')
    })

    it('should track armor-specific metrics', () => {
      resetArmorImportStats()
      incrementArmorImportStat('unknownCategories', 2)
      incrementArmorImportStat('unknownProperties', 1)

      const stats = getArmorImportStats()
      expect(stats.unknownCategories).toBe(2)
      expect(stats.unknownProperties).toBe(1)
    })

    it('should track gear-specific metrics', () => {
      resetGearImportStats()
      addGearUnknownCategory('CAT_X')
      addGearUnknownCategory('CAT_Y')

      const stats = getGearImportStats()
      expect(stats.unknownCategories).toBe(2)
      expect(stats.categoryDetails).toContain('CAT_X')
      expect(stats.categoryDetails).toContain('CAT_Y')
    })

    it('should track species-specific metrics', () => {
      resetSpeciesImportStats()
      addSpeciesUnknownTalent('TALENT_A')
      addSpeciesUnknownTalent('TALENT_B')

      const stats = getSpeciesImportStats()
      expect(stats.unknownTalents).toBe(2)
      expect(stats.talentDetails).toContain('TALENT_A')
      expect(stats.talentDetails).toContain('TALENT_B')
    })

    it('should track obligation-specific metrics', () => {
      resetObligationImportStats()
      addUnknownObligationProperty('prop1')
      addUnknownObligationProperty('prop2')

      const stats = getObligationImportStats()
      expect(stats.unknownProperties).toBe(2)
      expect(stats.propertyDetails).toContain('prop1')
      expect(stats.propertyDetails).toContain('prop2')
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all stats to initial state', () => {
      // Talent
      incrementTalentImportStat('total', 10)
      resetTalentImportStats()
      const talentStats = getTalentImportStats()
      expect(talentStats.total).toBe(0)
      expect(talentStats.rejected).toBe(0)

      // Weapon
      incrementWeaponImportStat('total', 5)
      resetWeaponImportStats()
      const weaponStats = getWeaponImportStats()
      expect(weaponStats.total).toBe(0)

      // Career
      incrementCareerImportStat('total', 3)
      resetCareerImportStats()
      const careerStats = getCareerImportStats()
      expect(careerStats.total).toBe(0)
    })
  })

  describe('Detail Deduplication', () => {
    it('should deduplicate detail entries', () => {
      resetWeaponImportStats()
      addWeaponUnknownSkill('SKILL_X')
      addWeaponUnknownSkill('SKILL_X') // Duplicate
      addWeaponUnknownSkill('SKILL_Y')

      const stats = getWeaponImportStats()
      expect(stats.unknownSkills).toBe(2) // Count should be 2, not 3
      expect(stats.skillDetails).toHaveLength(2)
      expect(stats.skillDetails).toContain('SKILL_X')
      expect(stats.skillDetails).toContain('SKILL_Y')
    })

    it('should deduplicate talent node details', () => {
      resetTalentImportStats()
      addTalentUnknownNode('node1')
      addTalentUnknownNode('node1')
      addTalentUnknownNode('node2')

      const stats = getTalentImportStats()
      expect(stats.nodeDetails).toHaveLength(2)
      expect(stats.nodeDetails).toContain('node1')
      expect(stats.nodeDetails).toContain('node2')
    })
  })
})

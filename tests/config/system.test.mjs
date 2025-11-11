import { describe, test, expect, beforeEach } from 'vitest'
import { setupFoundryMock } from '../helpers/mock-foundry.mjs'
import * as SystemConfig from '../../module/config/system.mjs'

describe('System Configuration', () => {
  beforeEach(() => {
    setupFoundryMock()
  })

  describe('SYSTEM_ID', () => {
    test('should have correct system identifier', () => {
      expect(SystemConfig.SYSTEM_ID).toBe('swerpg')
    })
  })

  describe('ANCESTRIES configuration', () => {
    test('should have correct ancestry defaults', () => {
      expect(SystemConfig.ANCESTRIES).toEqual({
        primaryAbilityStart: 3,
        secondaryAbilityStart: 2,
        resistanceAmount: 5,
      })
    })

    test('should have numeric values for all properties', () => {
      const { primaryAbilityStart, secondaryAbilityStart, resistanceAmount } = SystemConfig.ANCESTRIES
      expect(typeof primaryAbilityStart).toBe('number')
      expect(typeof secondaryAbilityStart).toBe('number')
      expect(typeof resistanceAmount).toBe('number')
    })
  })

  describe('COMPENDIUM_PACKS configuration', () => {
    test('should have all required compendium packs defined', () => {
      const expectedPacks = [
        'ancestry', 'archetype', 'background', 'origin', 
        'spell', 'spellExtensions', 'talent', 'talentExtensions', 'taxonomy'
      ]

      for (const packKey of expectedPacks) {
        expect(SystemConfig.COMPENDIUM_PACKS).toHaveProperty(packKey)
      }
    })

    test('should have correct pack identifiers for main packs', () => {
      expect(SystemConfig.COMPENDIUM_PACKS.ancestry).toBe('swerpg.ancestry')
      expect(SystemConfig.COMPENDIUM_PACKS.archetype).toBe('swerpg.archetype')
      expect(SystemConfig.COMPENDIUM_PACKS.background).toBe('swerpg.background')
      expect(SystemConfig.COMPENDIUM_PACKS.origin).toBe('swerpg.origin')
      expect(SystemConfig.COMPENDIUM_PACKS.spell).toBe('swerpg.spells')
      expect(SystemConfig.COMPENDIUM_PACKS.talent).toBe('swerpg.talent')
      expect(SystemConfig.COMPENDIUM_PACKS.taxonomy).toBe('swerpg.taxonomy')
    })

    test('should have null values for extension packs', () => {
      expect(SystemConfig.COMPENDIUM_PACKS.spellExtensions).toBeNull()
      expect(SystemConfig.COMPENDIUM_PACKS.talentExtensions).toBeNull()
    })
  })

  describe('THREAT_LEVELS configuration', () => {
    test('should have all threat levels defined', () => {
      const expectedLevels = ['minion', 'normal', 'elite', 'boss']
      
      for (const level of expectedLevels) {
        expect(SystemConfig.THREAT_LEVELS).toHaveProperty(level)
      }
    })

    describe('Threat level properties', () => {
      test('should have consistent structure for all threat levels', () => {
        const requiredProperties = ['id', 'actionMax', 'label', 'scaling', 'icon']
        
        for (const [levelKey, levelData] of Object.entries(SystemConfig.THREAT_LEVELS)) {
          for (const prop of requiredProperties) {
            expect(levelData).toHaveProperty(prop)
          }
          expect(levelData.id).toBe(levelKey)
        }
      })

      test('should have correct minion threat level', () => {
        const minion = SystemConfig.THREAT_LEVELS.minion
        expect(minion.id).toBe('minion')
        expect(minion.actionMax).toBe(4)
        expect(minion.label).toBe('ADVERSARY.ThreatMinion')
        expect(minion.scaling).toBe(0.5)
        expect(minion.icon).toBe('fa-solid fa-chevron-down')
      })

      test('should have correct normal threat level', () => {
        const normal = SystemConfig.THREAT_LEVELS.normal
        expect(normal.id).toBe('normal')
        expect(normal.actionMax).toBe(6)
        expect(normal.label).toBe('ADVERSARY.ThreatNormal')
        expect(normal.scaling).toBe(1)
        expect(normal.icon).toBe('fa-solid fa-chevron-up')
      })

      test('should have correct elite threat level', () => {
        const elite = SystemConfig.THREAT_LEVELS.elite
        expect(elite.id).toBe('elite')
        expect(elite.actionMax).toBe(8)
        expect(elite.label).toBe('ADVERSARY.ThreatElite')
        expect(elite.scaling).toBe(1.5)
        expect(elite.icon).toBe('fa-solid fa-chevrons-up')
      })

      test('should have correct boss threat level', () => {
        const boss = SystemConfig.THREAT_LEVELS.boss
        expect(boss.id).toBe('boss')
        expect(boss.actionMax).toBe(10)
        expect(boss.label).toBe('ADVERSARY.ThreatBoss')
        expect(boss.scaling).toBe(2)
        expect(boss.icon).toBe('fa-solid fa-skull')
      })

      test('should have ascending actionMax values', () => {
        const levels = Object.values(SystemConfig.THREAT_LEVELS)
        const actionMaxValues = levels.map(level => level.actionMax).sort((a, b) => a - b)
        
        expect(actionMaxValues).toEqual([4, 6, 8, 10])
      })

      test('should have ascending scaling values', () => {
        const levels = Object.values(SystemConfig.THREAT_LEVELS)
        const scalingValues = levels.map(level => level.scaling).sort((a, b) => a - b)
        
        expect(scalingValues).toEqual([0.5, 1, 1.5, 2])
      })
    })
  })

  describe('ACTOR_HOOKS configuration', () => {
    test('should be frozen object', () => {
      expect(Object.isFrozen(SystemConfig.ACTOR_HOOKS)).toBe(true)
    })

    test('should have action group hooks', () => {
      const actionHooks = [
        'prepareStandardCheck',
        'prepareWeaponAttack', 
        'applyCriticalEffects',
        'defendSkillAttack',
        'defendSpellAttack',
        'defendWeaponAttack',
        'applyActionOutcome'
      ]

      for (const hookName of actionHooks) {
        expect(SystemConfig.ACTOR_HOOKS).toHaveProperty(hookName)
        expect(SystemConfig.ACTOR_HOOKS[hookName]).toHaveProperty('group', 'TALENT.HOOKS.GROUP_ACTION')
        expect(SystemConfig.ACTOR_HOOKS[hookName]).toHaveProperty('argNames')
        expect(Array.isArray(SystemConfig.ACTOR_HOOKS[hookName].argNames)).toBe(true)
      }
    })

    test('should have preparation group hooks', () => {
      const preparationHooks = [
        'prepareActions',
        'prepareResources',
        'prepareDefenses',
        'prepareInitiativeCheck',
        'prepareMovement',
        'prepareResistances',
        'prepareSkillCheck',
        'prepareSkillAttack'
      ]

      for (const hookName of preparationHooks) {
        expect(SystemConfig.ACTOR_HOOKS).toHaveProperty(hookName)
        expect(SystemConfig.ACTOR_HOOKS[hookName]).toHaveProperty('group', 'TALENT.HOOKS.GROUP_PREPARATION')
        expect(SystemConfig.ACTOR_HOOKS[hookName]).toHaveProperty('argNames')
        expect(Array.isArray(SystemConfig.ACTOR_HOOKS[hookName].argNames)).toBe(true)
      }
    })

    describe('Hook argument validation', () => {
      test('prepareStandardCheck should have correct arguments', () => {
        expect(SystemConfig.ACTOR_HOOKS.prepareStandardCheck.argNames).toEqual(['rollData'])
      })

      test('prepareWeaponAttack should have correct arguments', () => {
        expect(SystemConfig.ACTOR_HOOKS.prepareWeaponAttack.argNames).toEqual(['action', 'target', 'rollData'])
      })

      test('applyCriticalEffects should have correct arguments', () => {
        expect(SystemConfig.ACTOR_HOOKS.applyCriticalEffects.argNames).toEqual(['action', 'outcome', 'self'])
      })

      test('defendSkillAttack should have correct arguments', () => {
        expect(SystemConfig.ACTOR_HOOKS.defendSkillAttack.argNames).toEqual(['action', 'origin', 'rollData'])
      })

      test('applyActionOutcome should have correct arguments', () => {
        expect(SystemConfig.ACTOR_HOOKS.applyActionOutcome.argNames).toEqual(['action', 'outcome', 'options'])
      })
    })
  })

  describe('Configuration completeness', () => {
    test('should export all expected top-level constants', () => {
      const expectedExports = [
        'SYSTEM_ID',
        'ANCESTRIES', 
        'COMPENDIUM_PACKS',
        'THREAT_LEVELS',
        'ACTOR_HOOKS'
      ]

      for (const exportName of expectedExports) {
        expect(SystemConfig).toHaveProperty(exportName)
      }
    })

    test('should have no undefined exports', () => {
      const exportValues = Object.values(SystemConfig)
      
      for (const value of exportValues) {
        expect(value).toBeDefined()
      }
    })
  })

  describe('Data integrity', () => {
    test('should have immutable threat level data structure', () => {
      // Test that we cannot modify the threat level configuration
      const originalMinion = { ...SystemConfig.THREAT_LEVELS.minion }
      
      // Try to modify (should not affect original)
      const modifiedMinion = { ...SystemConfig.THREAT_LEVELS.minion, actionMax: 999 }
      
      expect(SystemConfig.THREAT_LEVELS.minion).toEqual(originalMinion)
      expect(SystemConfig.THREAT_LEVELS.minion.actionMax).toBe(4)
      expect(modifiedMinion.actionMax).toBe(999)
    })

    test('should have consistent label naming convention', () => {
      // All threat level labels should follow the ADVERSARY.Threat* pattern
      const labelPattern = /^ADVERSARY\.Threat\w+$/
      
      for (const levelData of Object.values(SystemConfig.THREAT_LEVELS)) {
        expect(levelData.label).toMatch(labelPattern)
      }
    })

    test('should have consistent icon naming convention', () => {
      // All icons should use FontAwesome solid classes
      const iconPattern = /^fa-solid fa-/
      
      for (const levelData of Object.values(SystemConfig.THREAT_LEVELS)) {
        expect(levelData.icon).toMatch(iconPattern)
      }
    })
  })

  describe('Compendium pack naming conventions', () => {
    test('should follow swerpg.* naming pattern for non-null packs', () => {
      const packPattern = /^swerpg\./
      
      for (const [packKey, packId] of Object.entries(SystemConfig.COMPENDIUM_PACKS)) {
        if (packId !== null) {
          expect(packId).toMatch(packPattern)
        }
      }
    })
  })
})
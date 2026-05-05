# Chantier 03 : Extraction du Defense Mixin

## Objectif
Extraire les méthodes liées aux calculs de défense et résistances vers `defense.mixin.mjs`

## Méthodes à extraire (~50 lignes)

| Méthode | Lignes (actor.mjs) | Description |
|---------|-------------------|-------------|
| `testDefense()` | 827-868 | Teste une défense contre un jet d'attaque |
| `getResistance()` | 750-764 | Calcule la résistance d'une ressource |

## Dépendances des méthodes

### `testDefense(defenseType, roll)`
- `this.system.defenses` - Getter des défenses (physique, dodge, parry, block)
- `this.system.skills` - Getter des compétences (pour défense basée sur compétence)
- **Externe** : `AttackRoll`, `AttackRoll.RESULT_TYPES`, `twist.random()`

### `getResistance(resource, damageType, restoration)`
- `this.resistances` - Getter des résistances
- `this.isBroken` - Getter du statut
- `this.isWeakened` - Getter du statut
- `this.statuses` - Set des statuts actifs
- **Externe** : Aucun

## Implémentation de `defense.mixin.mjs`

```javascript
/**
 * Defense Mixin - Handles defense calculations and resistances
 * Extracted from actor.mjs lines ~750-868
 */

import AttackRoll from '../../dice/attack-roll.mjs'

export const DefenseMixin = (Base) =>
  class extends Base {
    /**
     * Test a defense against an attack roll
     * @param {string} defenseType - Type of defense ('physical', skill ID, etc.)
     * @param {AttackRoll} roll - The attack roll to test against
     * @returns {number} Result type from AttackRoll.RESULT_TYPES
     */
    testDefense(defenseType, roll) {
      const d = this.system.defenses
      const s = this.system.skills
      
      if (defenseType !== 'physical' && !(defenseType in d) && !(defenseType in s)) {
        throw new Error(`Invalid defense type "${defenseType}" passed to Actor#testDefense`)
      }
      
      if (!(roll instanceof AttackRoll)) {
        throw new Error('You must pass an AttackRoll instance to Actor#testDefense')
      }
      
      const results = AttackRoll.RESULT_TYPES
      let dc

      // Physical defense: dodge, parry, block, armor
      if (defenseType === 'physical') {
        dc = d.physical.total
        if (roll.total > dc) return results.HIT

        const r = twist.random() * d.physical.total
        const dodge = d.dodge.total
        
        if (r <= dodge) return results.DODGE
        
        const parry = dodge + d.parry.total
        if (r <= parry) return results.PARRY
        
        const block = dodge + d.block.total
        if (r <= block) return results.BLOCK
        
        return roll.isCriticalFailure ? results.ARMOR : results.GLANCE
      }

      // Non-physical defense (skill-based or other)
      if (defenseType in s) {
        dc = s[defenseType].passive
      } else {
        dc = d[defenseType].total
      }
      
      if (roll.total > dc) return AttackRoll.RESULT_TYPES.HIT
      else return AttackRoll.RESULT_TYPES.RESIST
    }

    /**
     * Get resistance value for a specific damage type and resource
     * @param {string} resource - Resource type ('health', 'morale', etc.)
     * @param {string} damageType - Type of damage
     * @param {boolean} restoration - Whether this is a restoration (healing)
     * @returns {number} Resistance value
     */
    getResistance(resource, damageType, restoration) {
      if (restoration) return 0
      
      let r = this.resistances[damageType]?.total ?? 0
      
      switch (resource) {
        case 'health':
          if (this.isBroken) r -= 2
          if (this.statuses.has('invulnerable')) r = Infinity
          break
        case 'morale':
          if (this.isWeakened) r -= 2
          if (this.statuses.has('resolute')) r = Infinity
          break
      }
      
      return r
    }
  }
```

## Étapes d'implémentation

1. Créer le fichier `module/documents/actor-mixins/combat/defense.mixin.mjs`
2. Copier les méthodes `testDefense()` et `getResistance()` depuis `actor.mjs`
3. Importer `AttackRoll` depuis son emplacement
4. Vérifier l'accès à `twist.random()` (variable globale ou import?)
5. Vérifier l'accès aux getters : `this.system.defenses`, `this.system.skills`, `this.resistances`

## Points d'attention

⚠️ **`twist.random()`**
- Vérifier si `twist` est une variable globale ou s'il faut l'importer
- Si import nécessaire, ajouter en haut du fichier

⚠️ **Getters sur `this`**
- `this.system.defenses` - Doit être accessible via le mixin (hérité de Base/Actor)
- `this.resistances` - Idem
- `this.isBroken`, `this.isWeakened` - Idem
- `this.statuses` - Idem

⚠️ **`AttackRoll.RESULT_TYPES`**
- Utilisé dans `testDefense()` pour retourner le résultat
- Vérifier que l'import d'AttackRoll fonctionne correctement

## Tests à créer

```javascript
// tests/documents/actor-combat-defense.test.mjs
describe('DefenseMixin', () => {
  describe('testDefense()', () => {
    test('should return HIT when roll total exceeds physical defense', () => { ... })
    test('should return DODGE/PARRY/BLOCK/GLANCE based on random roll', () => { ... })
    test('should return RESIST for non-physical defenses', () => { ... })
    test('should throw error for invalid defense type', () => { ... })
  })

  describe('getResistance()', () => {
    test('should return 0 for restoration', () => { ... })
    test('should apply broken penalty for health', () => { ... })
    test('should apply weakened penalty for morale', () => { ... })
    test('should return Infinity for invulnerable/resolute', () => { ... })
  })
})
```

## Vérification

```bash
# Vérifier la syntaxe
node --check module/documents/actor-mixins/combat/defense.mixin.mjs

# Vérifier les imports
cd module/documents/actor-mixins/combat
node -e "import('./defense.mixin.mjs')" 2>&1 | head -20
```

## Dépendances avec autres chantiers

- **Chantier 02 (Attack)** : `weaponAttack()` et `skillAttack()` appellent `target.testDefense()` et `target.getResistance()`
- L'ordre de composition dans `index.mjs` doit placer `DefenseMixin` avant `AttackMixin` (ou utiliser l'héritage classique)

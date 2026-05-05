# Chantier 07 : Tests du refactoring combat

## Objectif
Créer les tests pour valider que le refactoring vers les mixins de combat fonctionne correctement.

## Fichiers de tests à créer

```
tests/
└── documents/
    ├── actor-combat-attack.test.mjs
    ├── actor-combat-defense.test.mjs
    ├── actor-combat-turn.test.mjs
    ├── actor-combat-effects.test.mjs
    └── actor-combat-integration.test.mjs
```

## 1. Tests unitaires par mixin

### `actor-combat-attack.test.mjs`

```javascript
import { describe, test, expect, beforeEach, mock } from 'vitest' // ou jest
import { AttackMixin } from '../../module/documents/actor-mixins/combat/attack.mixin.mjs'

// Mock class to test the mixin
class BaseActor {
  constructor(data = {}) {
    this.id = data.id || 'test-actor'
    this.actions = data.actions || {}
    this.system = data.system || {}
    this.callActorHooks = mock()
  }
  
  async update() { return this }
  get talents() { return [] }
}

class TestActor extends AttackMixin(BaseActor) {}

describe('AttackMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor({
      id: 'actor-1',
      actions: {
        'attack-1': {
          use: mock().mockResolvedValue({ success: true }),
          usage: {
            boons: {},
            banes: {},
            weapon: null,
            defenseType: 'physical'
          },
          range: { maximum: 5 }
        }
      }
    })
  })

  describe('useAction()', () => {
    test('should use the specified action', async () => {
      const result = await actor.useAction('attack-1')
      expect(actor.actions['attack-1'].use).toHaveBeenCalledWith({ dialog: true })
    })

    test('should throw error if action does not exist', async () => {
      await expect(actor.useAction('invalid')).rejects.toThrow('Action invalid does not exist')
    })
  })

  describe('applyTargetBoons()', () => {
    test('should return boons and banes objects', () => {
      const target = {
        statuses: new Set(),
        effects: new Map()
      }
      const action = { usage: { boons: {}, banes: {} }, range: { maximum: 5 } }
      
      const result = actor.applyTargetBoons(target, action, 'weapon', false)
      
      expect(result).toHaveProperty('boons')
      expect(result).toHaveProperty('banes')
    })

    test('should add guarded bane if target is guarded', () => {
      const target = {
        statuses: new Set(['guarded']),
        effects: new Map()
      }
      const action = { usage: { boons: {}, banes: {} }, damage: {}, range: { maximum: 5 } }
      
      const { banes } = actor.applyTargetBoons(target, action, 'weapon', false)
      
      expect(banes).toHaveProperty('guarded')
    })
  })

  // TODO: Add tests for weaponAttack() and skillAttack()
  // These require more complex mocks (AttackRoll, target defenses, etc.)
})
```

### `actor-combat-defense.test.mjs`

```javascript
import { describe, test, expect, beforeEach } from 'vitest'
import { DefenseMixin } from '../../module/documents/actor-mixins/combat/defense.mixin.mjs'

class BaseActor {
  constructor(data = {}) {
    this.system = {
      defenses: data.defenses || {
        physical: { total: 10 },
        dodge: { total: 5 },
        parry: { total: 3 },
        block: { total: 2 }
      },
      skills: data.skills || {}
    }
    this.resistances = data.resistances || {}
    this.isBroken = data.isBroken || false
    this.isWeakened = data.isWeakened || false
    this.statuses = data.statuses || new Set()
  }
}

class TestActor extends DefenseMixin(BaseActor) {}

describe('DefenseMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor()
  })

  describe('testDefense()', () => {
    test('should return HIT when roll total exceeds physical defense', () => {
      // Mock AttackRoll
      const roll = { total: 15, isCriticalFailure: false }
      const result = actor.testDefense('physical', roll)
      expect(result).toBeDefined()
    })

    // TODO: Add more tests
  })

  describe('getResistance()', () => {
    test('should return 0 for restoration', () => {
      const r = actor.getResistance('health', 'slashing', true)
      expect(r).toBe(0)
    })

    test('should apply broken penalty for health', () => {
      actor.isBroken = true
      actor.resistances = { slashing: { total: 5 } }
      const r = actor.getResistance('health', 'slashing', false)
      expect(r).toBe(3) // 5 - 2
    })

    test('should return Infinity for invulnerable', () => {
      actor.statuses = new Set(['invulnerable'])
      const r = actor.getResistance('health', 'slashing', false)
      expect(r).toBe(Infinity)
    })
  })
})
```

### `actor-combat-turn.test.mjs`

```javascript
import { describe, test, expect, beforeEach, mock } from 'vitest'
import { TurnMixin } from '../../module/documents/actor-mixins/combat/turn.mixin.mjs'

class BaseActor {
  constructor(data = {}) {
    this.id = data.id || 'test-actor'
    this.flags = { swerpg: {} }
    this.talentIds = new Set(data.talents || [])
    this.isIncapacitated = data.isIncapacitated || false
    this.isWeakened = data.isWeakened || false
    this.isBroken = data.isBroken || false
    this.system = data.system || { resources: { action: { value: 1 } } }
    this._sheet = { render: mock() }
    
    this.reset = mock()
    this.update = mock().mockResolvedValue(this)
    this.expireEffects = mock().mockResolvedValue()
    this.applyDamageOverTime = mock().mockResolvedValue()
    this.alterResources = mock().mockResolvedValue()
  }
}

class TestActor extends TurnMixin(BaseActor) {}

describe('TurnMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor()
    // Mock game.combat
    global.game = {
      combat: {
        round: 1,
        combatant: { initiative: 10 },
        getCombatantByActor: mock().mockReturnValue({ initiative: 10, getDelayMaximum: () => 20 })
      }
    }
  })

  describe('onStartTurn()', () => {
    test('should reset actor and render sheet', async () => {
      await actor.onStartTurn()
      expect(actor.reset).toHaveBeenCalled()
      expect(actor._sheet.render).toHaveBeenCalledWith(false)
    })

    test('should call expireEffects and applyDamageOverTime', async () => {
      await actor.onStartTurn()
      expect(actor.expireEffects).toHaveBeenCalledWith(true)
      expect(actor.applyDamageOverTime).toHaveBeenCalled()
    })
  })

  describe('delay()', () => {
    test('should throw error if no combatant found', async () => {
      global.game.combat.getCombatantByActor.mockReturnValue(null)
      await expect(actor.delay(15)).rejects.toThrow('no Combatant')
    })

    test('should throw error if initiative out of range', async () => {
      await expect(actor.delay(25)).rejects.toThrow('between 1 and 20')
    })
  })
})
```

### `actor-combat-effects.test.mjs`

```javascript
import { describe, test, expect, beforeEach, mock } from 'vitest'
import { EffectsMixin } from '../../module/documents/actor-mixins/combat/effects.mixin.mjs'

class BaseActor {
  constructor(data = {}) {
    this.effects = new Map()
    this.isWeakened = data.isWeakened || false
    this.isBroken = data.isBroken || false
    this.isIncapacitated = data.isIncapacitated || false
    this.resistances = data.resistances || {}
    
    this.callActorHooks = mock()
    this.alterResources = mock().mockResolvedValue()
    this.deleteEmbeddedDocuments = mock().mockResolvedValue()
    this.updateEmbeddedDocuments = mock().mockResolvedValue()
    this.createEmbeddedDocuments = mock().mockResolvedValue()
  }
}

class TestActor extends EffectsMixin(BaseActor) {}

describe('EffectsMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor()
    global.game = {
      combat: { round: 1, active: true },
      settings: { get: mock().mockReturnValue(0), set: mock().mockResolvedValue() }
    }
  })

  describe('applyDamageOverTime()', () => {
    test('should apply DOT from effects', async () => {
      actor.effects.set('dot-1', {
        flags: { swerpg: { dot: { health: 5, damageType: 'poison' } } }
      })
      actor.resistances = { poison: { total: 2 } }
      
      await actor.applyDamageOverTime()
      
      expect(actor.alterResources).toHaveBeenCalled()
    })
  })

  describe('_isEffectExpired()', () => {
    test('should return true for expired turn-based effects', () => {
      const effect = {
        duration: { turns: 2, startRound: 1 }
      }
      // elapsed = 1 - 1 + 1 = 1, turns = 2, so not expired at start
      expect(actor._isEffectExpired(effect, true)).toBe(false)
    })
  })
})
```

## 2. Test d'intégration

### `actor-combat-integration.test.mjs`

```javascript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import SwerpgActor from '../../module/documents/actor.mjs'

describe('Combat Mixin Integration', () => {
  let actor

  beforeEach(async () => {
    // Créer un actor de test (nécessite un monde Foundry actif)
    // Ceci est un test d'intégration qui nécessite l'environnement Foundry
  })

  test('should have all combat methods available', () => {
    expect(typeof actor.useAction).toBe('function')
    expect(typeof actor.weaponAttack).toBe('function')
    expect(typeof actor.skillAttack).toBe('function')
    expect(typeof actor.testDefense).toBe('function')
    expect(typeof actor.onStartTurn).toBe('function')
    expect(typeof actor.onEndTurn).toBe('function')
    expect(typeof actor.applyActionOutcome).toBe('function')
  })

  test('weaponAttack should work end-to-end', async () => {
    // Test complet avec vrai actor, vraie arme, vraie cible
  })
})
```

## 3. Lancer les tests

### Configuration Vitest (si pas déjà fait)

```javascript
// vitest.config.mjs
export default {
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.mjs']
  }
}
```

### Commande

```bash
npm run test
# ou
npx vitest run tests/documents/actor-combat-*.test.mjs
```

## 4. Couverture de code

```bash
npx vitest run --coverage
```

Objectif : > 80% de couverture sur les fichiers de mixins.

## Ordre d'exécution

1. Tests unitaires par mixin (attaque, défense, tour, effets)
2. Tests d'intégration
3. Test manuel dans Foundry VTT

## Checklist de validation

- [ ] `useAction()` fonctionne
- [ ] `weaponAttack()` retourne un AttackRoll
- [ ] `skillAttack()` retourne un AttackRoll
- [ ] `testDefense()` retourne un résultat valide
- [ ] `getResistance()` calcule correctement
- [ ] `onStartTurn()` déclenche les bonnes méthodes
- [ ] `onEndTurn()` déclenche les bonnes méthodes
- [ ] `delay()` met à jour l'initiative
- [ ] `applyActionOutcome()` applique ressources et effets
- [ ] `expireEffects()` supprime les bons effets
- [ ] Pas de régression dans le jeu Foundry

## Notes

⚠️ **Tests dans l'environnement Foundry**
- Certains tests nécessitent l'environnement Foundry complet (game, Actor, etc.)
- Utiliser des mocks pour les tests unitaires
- Les tests d'intégration nécessitent `foundry.js` chargé

⚠️ **Mocks complexes**
- `AttackRoll` a beaucoup de dépendances
- Pour tester `weaponAttack()` et `skillAttack()`, créer des mocks complets ou utiliser un vrai monde Foundry

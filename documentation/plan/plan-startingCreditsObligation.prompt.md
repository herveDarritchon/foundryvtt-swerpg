# Plan : Crédits de départ & bonus obligation (avec lib domaine)

Implémenter les 500 crédits de départ et le bonus obligation-crédits en extrayant la logique métier des obligations dans une lib pure (`module/lib/obligations/`), suivant l'architecture deux-couches du projet (domaine pur sans dépendances Foundry → couche adapter Foundry).

## Règles métier — Star Wars FFG / Edge Studio

Un personnage commence avec **500 crédits** pour acheter son équipement de départ.

Le personnage peut prendre davantage d'**Obligation** pour obtenir plus de crédits ou d'XP au départ :

| Choix à la création |   Crédits |       XP |
| ------------------- | --------: | -------: |
| Base                |   **500** | baseline |
| +5 Obligation       | **+1000** |  + bonus |
| +10 Obligation      | **+2500** |  + bonus |

Donc un personnage peut commencer avec :

- **500 crédits** sans bonus ;
- **1500 crédits** avec +5 Obligation explicitée via `isExtra = true, extraCredits = 1000` ;
- **3000 crédits** avec +10 Obligation explicitée via `isExtra = true, extraCredits = 2500`.

Le bonus XP fonctionne de la même manière et est déjà implémenté via `obligationXpBonus` dans `_prepareExperience()`.

## Steps

### 1. Créer `module/lib/obligations/obligation-bonus-calculator.mjs`

Classe ou fonctions pures qui encapsulent les règles métier :

- `computeObligationBonusCredits(obligations)` — somme des `extraCredits` des obligations marquées `isExtra === true`
- `computeObligationBonusXp(obligations)` — somme des `extraXp` des obligations marquées `isExtra === true`

**Paramètre d'entrée** = tableau d'objets plain (pas de dépendance Foundry Item) :

```javascript
{ isExtra: boolean, extraCredits: number, extraXp: number }
```

**Sortie** = nombres (`number`).

Import depuis config : `STARTING_CREDITS` (et optionnels : `OBLIGATION_EXTRA_CREDITS_5`, `OBLIGATION_EXTRA_CREDITS_10` si paliers règles exposés).

### 2. Ajouter les constantes dans `module/config/progression.mjs`

Ajouter une nouvelle section `/* ---- Starting Resources ---- */` :

```javascript
/**
 * Starting credits granted to a new character at creation.
 * @type {number}
 */
export const STARTING_CREDITS = 500
```

Optionnel (si exposer les paliers) :

```javascript
/**
 * Extra credits bonus for +5 Obligation during character creation.
 * @type {number}
 */
export const OBLIGATION_EXTRA_CREDITS_5 = 1000

/**
 * Extra credits bonus for +10 Obligation during character creation.
 * @type {number}
 */
export const OBLIGATION_EXTRA_CREDITS_10 = 2500
```

### 3. Refactorer `SwerpgCharacter` dans `module/models/character.mjs`

**Supprimer** `#computeObligationBonusExperience()` (l.325–327).

**Importer** la lib dans les imports :

```javascript
import ObligationBonusCalculator from '../lib/obligations/obligation-bonus-calculator.mjs'
```

**Modifier `_prepareExperience()`** pour utiliser la lib :

```javascript
const obligations = this.parent.items.filter((item) => item.type === 'obligation')
const obligationData = obligations.map((item) => ({
  isExtra: item.system.isExtra,
  extraCredits: item.system.extraCredits,
  extraXp: item.system.extraXp,
}))
e.obligationXpBonus = ObligationBonusCalculator.computeObligationBonusXp(obligationData)
```

**Ajouter `_prepareCredits()`** — nouvelle méthode appelée depuis `prepareBaseData()` ou `prepareDerivedData()` :

```javascript
_prepareCredits() {
  const c = this.progression.credits = this.progression.credits || {}

  // Derived (not persisted): starting credits allocation
  c.starting = STARTING_CREDITS

  // Derived (not persisted): extra credits from obligation items marked as "extra"
  const obligations = this.parent.items.filter((item) => item.type === 'obligation')
  const obligationData = obligations.map((item) => ({
    isExtra: item.system.isExtra,
    extraCredits: item.system.extraCredits,
    extraXp: item.system.extraXp,
  }))
  c.obligationBonus = ObligationBonusCalculator.computeObligationBonusCredits(obligationData)

  // Derived (not persisted): total starting credits
  c.totalStarting = c.starting + c.obligationBonus
}
```

Appel depuis `prepareBaseData()` ou `prepareDerivedData()` (recommandé : `prepareBaseData()` pour cohérence avec XP).

### 4. Exposer dans le contexte sheet — `module/applications/sheets/character-sheet.mjs`

Dans `_prepareContext(options)`, ajouter :

```javascript
context.creditsInfo = {
  starting: this.actor.system.progression.credits?.starting || 0,
  obligationBonus: this.actor.system.progression.credits?.obligationBonus || 0,
  totalStarting: this.actor.system.progression.credits?.totalStarting || 0,
  current: this.actor.system.credits, // solde persisté actuel
}
```

### 5. Mettre à jour le template

Identifier le template d'inventaire / header actuel (p.ex. `templates/sheets/actor/character-inventory.hbs` ou `character-header.hbs`) et ajouter un bloc d'affichage crédits :

```handlebars
<div class='credits-summary'>
  <h4>Crédits</h4>
  <div class='credits-breakdown'>
    <div class='line'>
      <span>Depart:</span>
      <span class='value'>{{creditsInfo.starting}}</span>
    </div>
    {{#if creditsInfo.obligationBonus}}
      <div class='line bonus'>
        <span>Bonus Obligation:</span>
        <span class='value'>+{{creditsInfo.obligationBonus}}</span>
      </div>
    {{/if}}
    <div class='line total'>
      <span>Total de départ:</span>
      <span class='value'>{{creditsInfo.totalStarting}}</span>
    </div>
    <div class='line current'>
      <span>Solde actuel:</span>
      <span class='value'>{{creditsInfo.current}}</span>
    </div>
  </div>
</div>
```

### 6. Mettre à jour les clés i18n

**`lang/en.json`** – ajouter :

```json
"SWERPG.Character.Credits": {
  "Starting": "Starting Credits",
  "ObligationBonus": "Obligation Bonus",
  "TotalStarting": "Total Starting Credits",
  "Current": "Current Balance"
}
```

**`lang/fr.json`** – ajouter :

```json
"SWERPG.Character.Credits": {
  "Starting": "Crédits de départ",
  "ObligationBonus": "Bonus Obligation",
  "TotalStarting": "Total de départ",
  "Current": "Solde actuel"
}
```

### 7. Tests unitaires purs — `tests/lib/obligations/obligation-bonus-calculator.test.mjs`

Créer un fichier test **sans mock Foundry** — inputs plain objects uniquement :

```javascript
import { describe, expect, test } from 'vitest'
import ObligationBonusCalculator from '../../module/lib/obligations/obligation-bonus-calculator.mjs'

describe('ObligationBonusCalculator', () => {
  describe('computeObligationBonusCredits', () => {
    test('should return 0 for empty obligations array', () => {
      expect(ObligationBonusCalculator.computeObligationBonusCredits([])).toBe(0)
    })

    test('should return 0 when no obligations marked as extra', () => {
      const obligations = [
        { isExtra: false, extraCredits: 1000, extraXp: 0 },
        { isExtra: false, extraCredits: 500, extraXp: 5 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(0)
    })

    test('should sum extraCredits only for isExtra=true obligations', () => {
      const obligations = [
        { isExtra: true, extraCredits: 1000, extraXp: 0 },
        { isExtra: false, extraCredits: 500, extraXp: 5 },
        { isExtra: true, extraCredits: 2500, extraXp: 10 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(3500)
    })

    test('should handle single extra obligation', () => {
      const obligations = [{ isExtra: true, extraCredits: 1000, extraXp: 5 }]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(1000)
    })
  })

  describe('computeObligationBonusXp', () => {
    test('should return 0 for empty obligations array', () => {
      expect(ObligationBonusCalculator.computeObligationBonusXp([])).toBe(0)
    })

    test('should return 0 when no obligations marked as extra', () => {
      const obligations = [
        { isExtra: false, extraCredits: 1000, extraXp: 0 },
        { isExtra: false, extraCredits: 500, extraXp: 5 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusXp(obligations)).toBe(0)
    })

    test('should sum extraXp only for isExtra=true obligations', () => {
      const obligations = [
        { isExtra: true, extraCredits: 1000, extraXp: 5 },
        { isExtra: false, extraCredits: 500, extraXp: 10 },
        { isExtra: true, extraCredits: 2500, extraXp: 15 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusXp(obligations)).toBe(20)
    })
  })
})
```

### 8. Test des constantes — `tests/config/progression.test.mjs`

Ajouter :

```javascript
test('STARTING_CREDITS constant should be 500', () => {
  expect(STARTING_CREDITS).toBe(500)
})

test('STARTING_CREDITS should be a positive integer', () => {
  expect(Number.isInteger(STARTING_CREDITS)).toBe(true)
  expect(STARTING_CREDITS > 0).toBe(true)
})
```

## Further Considerations

### 1. Périmètre de la lib `obligations/`

À terme elle pourra aussi gérer :

- Calcul du seuil d'obligation du groupe (5 × nb joueurs)
- Tirage aléatoire d'obligation déclenchée
- Validation des montants de bonus par rapport aux règles
- Résolution / annulation d'obligation

Pour cette itération, on se limite au calcul de bonus. **D'accord pour ce scope ?**

### 2. Solde `credits` initial à la création

Faut-il auto-initialiser `credits = totalStartingCredits` lors de la création d'un personnage (hook `preCreateActor`) ou laisser le joueur gérer manuellement ?

**Options** :

- **A) Initialisation auto** : Hook `preCreateActor` initialise `credits = totalStartingCredits`
- **B) Affichage informatif uniquement** : Le joueur remplit manuellement, affiçage guide les attentes

**Recommandation** : Option A (initialisation auto à la création, plus intuitif pour l'utilisateur).

### 3. Migration de `#computeObligationBonusExperience`

On migre le calcul XP existant vers la même lib en même temps, ou on fait ça dans un second temps ?

**Recommandation** : Migrer les deux ensemble dans cette itération car c'est le même pattern, et ça réduit la dette technique dès maintenant.

## Success Criteria

- [ ] Lib `ObligationBonusCalculator` créée avec méthodes pures, testée sans mock Foundry
- [ ] Constantes `STARTING_CREDITS` (et optionnels `OBLIGATION_EXTRA_CREDITS_*`) définies dans `progression.mjs`
- [ ] `SwerpgCharacter` refactorisé : migre XP, ajoute `_prepareCredits()`
- [ ] Contexte sheet expose `creditsInfo` (starting, obligationBonus, totalStarting, current)
- [ ] Template affiche le résumé crédits de manière lisible
- [ ] Clés i18n complètes (en + fr)
- [ ] Tests unitaires purs (lib) et des constantes ✅
- [ ] Tous les tests passent sans régression existante

## Architecture Notes

**Deux-couches** :

- **Couche domaine** (`module/lib/obligations/`) — pas de dépendances Foundry, inputs plain objects, outputs números ou objets simples
- **Couche Foundry adapter** (`module/models/`, `module/applications/`) — transformation Foundry Items → plain objects → appel lib → exposition résultats au contexte UI

**Avantages** :

- Tests de logique métier sans setup Foundry lourd
- Logique métier réutilisable (import dans d'autres projets, tests isolés)
- Séparation claire des responsabilités
- Facilite les futures extensions (paliers obligation, tirage aléatoire, etc.)

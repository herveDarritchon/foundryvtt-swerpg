# Plan : Solde de crédits calculé (starting − items spent)

Modifier le calcul du solde courant (`Current Balance`) pour qu'il soit **dérivé** : crédits de départ (500 + bonus obligation) − somme des prix des items physiques possédés. La logique métier est encapsulée dans une lib pure `module/lib/credits/` sans dépendance Foundry.

## Contexte actuel

- `system.credits` = champ persisté, modifié manuellement ou par le Market lors d'un achat
- Le Market déduit via `buyer.update({ 'system.credits': creditsAfter })`
- Les items physiques (weapon, armor, gear) ont un `price` de base dans leur schema
- Il existe `_preparePrice()` qui recalcule un prix rareté-ajusté (prix Market)
- La lib `module/lib/market/purchase.mjs` montre le pattern attendu (inputs plain → outputs plain)

## Décision d'architecture

Le solde courant devient un **champ dérivé (non persisté)** :

```
availableCredits = startingCredits + obligationBonusCredits + manualAdjustment − totalItemsCost
```

Le champ persisté `system.credits` est conservé en tant que `manualAdjustment` (gains de mission, vol, récompenses MJ).

## Steps

### 1. Créer `module/lib/credits/credit-calculator.mjs`

Fonctions pures, zéro dépendance Foundry :

```javascript
/**
 * @typedef {Object} CreditBudgetInput
 * @property {number} startingCredits       Base starting credits (e.g. 500)
 * @property {number} obligationBonusCredits  Extra credits from obligations
 * @property {number} manualAdjustment      GM or player manual adjustments (can be negative)
 * @property {Array<{ price: number, quantity: number }>} ownedItems  Owned physical items
 */

/**
 * @typedef {Object} CreditBudgetResult
 * @property {number} startingCredits       Base pool
 * @property {number} obligationBonus       Obligation bonus
 * @property {number} totalBudget           startingCredits + obligationBonus + manualAdjustment
 * @property {number} totalSpent            Sum of (price × quantity) for all owned items
 * @property {number} availableCredits      totalBudget − totalSpent (can be negative = debt)
 * @property {number} manualAdjustment      Manual adjustments
 * @property {boolean} isOverBudget         availableCredits < 0
 */

export function computeCreditBudget(input) { ... }
```

Calculs :

- `totalSpent = ownedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)`
- `totalBudget = startingCredits + obligationBonusCredits + manualAdjustment`
- `availableCredits = totalBudget - totalSpent`
- `isOverBudget = availableCredits < 0`

### 2. Créer `module/lib/credits/obligation-bonus-calculator.mjs`

Extraire depuis `character.mjs` les fonctions de calcul de bonus obligation :

```javascript
/**
 * Compute total bonus credits from extra obligations.
 * @param {Array<{ isExtra: boolean, extraCredits: number }>} obligations
 * @returns {number}
 */
export function computeObligationBonusCredits(obligations) { ... }

/**
 * Compute total bonus XP from extra obligations.
 * @param {Array<{ isExtra: boolean, extraXp: number }>} obligations
 * @returns {number}
 */
export function computeObligationBonusXp(obligations) { ... }
```

### 3. Ajouter constante dans `module/config/progression.mjs`

```javascript
/**
 * Starting credits granted to a new character at creation.
 * @type {number}
 */
export const STARTING_CREDITS = 500
```

### 4. Refactorer `module/models/character.mjs`

**a)** Récapitulatif des modifications :

- Supprimer `#computeObligationBonusExperience` (l.325–327)
- Importer `computeObligationBonusXp`, `computeObligationBonusCredits` depuis `module/lib/credits/`
- Importer `computeCreditBudget` depuis `module/lib/credits/credit-calculator.mjs`
- Importer `STARTING_CREDITS` depuis `module/config/progression.mjs`

**b)** Modifier `_prepareExperience()` pour utiliser la lib :

```javascript
_prepareExperience() {
  super._prepareExperience()

  const e = this.progression.experience
  const obligations = this.parent.items
    .filter((item) => item.type === 'obligation')
    .map((item) => ({
      isExtra: item.system.isExtra,
      extraCredits: item.system.extraCredits,
      extraXp: item.system.extraXp,
    }))

  e.obligationXpBonus = computeObligationBonusXp(obligations)
  e.total = e.total + e.obligationXpBonus
  e.available = e.total - e.spent
}
```

**c)** Ajouter `_prepareCredits()` appelée depuis `prepareDerivedData()` :

```javascript
_prepareCredits() {
  const obligations = this.parent.items
    .filter((item) => item.type === 'obligation')
    .map((item) => ({
      isExtra: item.system.isExtra,
      extraCredits: item.system.extraCredits,
    }))

  const ownedItems = this.parent.items
    .filter((item) => ['weapon', 'armor', 'gear'].includes(item.type))
    .map((item) => ({
      price: item.system.price,
      quantity: item.system.quantity || 1,
    }))

  this.creditBudget = computeCreditBudget({
    startingCredits: STARTING_CREDITS,
    obligationBonusCredits: computeObligationBonusCredits(obligations),
    manualAdjustment: this.credits, // champ persisté existant
    ownedItems,
  })

  logger.debug(`[character] _prepareCredits - credit budget for ${this.parent.name}:`, this.creditBudget)
}
```

### 5. Adapter le Market — `module/applications/market/market-application.mjs`

Dans `#onBuyItem()`, **supprimer** la ligne :

```javascript
await buyer.update({ 'system.credits': finalValidation.creditsAfter })
```

Le solde se recalculera automatiquement au prochain `prepareDerivedData()` lorsque l'item sera ajouté au personnage.

### 6. Adapter la validation Market — `module/lib/market/purchase.mjs`

Modifier la signature de `validatePurchase()` pour accepter `availableCredits` au lieu de lire `actor.system.credits` :

```javascript
export function validatePurchase({ actor, entry } = {}) {
  // ...
  const credits = actor?.availableCredits ?? 0 // Lire depuis le dérivé
  // ... reste identique
}
```

Ou ajouter un paramètre optionnel rétro-compatible :

```javascript
export function validatePurchase({ actor, entry, creditsSource = 'automatic' } = {}) {
  const credits = creditsSource === 'automatic' ? (actor?.system?.creditBudget?.availableCredits ?? 0) : (actor?.system?.credits ?? 0)
}
```

### 7. Mettre à jour la sheet — `module/applications/sheets/character-sheet.mjs`

Ajouter à `_prepareContext(options)` :

```javascript
context.creditBudget = {
  starting: this.actor.system.creditBudget?.startingCredits || 0,
  obligationBonus: this.actor.system.creditBudget?.obligationBonus || 0,
  manualAdjustment: this.actor.system.creditBudget?.manualAdjustment || 0,
  totalBudget: this.actor.system.creditBudget?.totalBudget || 0,
  totalSpent: this.actor.system.creditBudget?.totalSpent || 0,
  available: this.actor.system.creditBudget?.availableCredits || 0,
  isOverBudget: this.actor.system.creditBudget?.isOverBudget || false,
}
```

### 8. Mettre à jour le template Handlebars

Identifier le bon template (p.ex. `templates/sheets/actor/character-inventory.hbs`) et ajouter :

```handlebars
<div class="credits-summary">
  <h4>{{localize 'SWERPG.Character.Credits.Label'}}</h4>
  <div class="credits-breakdown">
    <div class="line">
      <span>{{localize 'SWERPG.Character.Credits.Starting'}}:</span>
      <span class="value">{{creditBudget.starting}}</span>
    </div>
    {{#if creditBudget.obligationBonus}}
    <div class="line bonus">
      <span>{{localize 'SWERPG.Character.Credits.ObligationBonus'}}:</span>
      <span class="value">+{{creditBudget.obligationBonus}}</span>
    </div>
    {{/if}}
    {{#if creditBudget.manualAdjustment}}
    <div class="line adjustment {{#if (lt creditBudget.manualAdjustment 0)}}negative{{/if}}">
      <span>{{localize 'SWERPG.Character.Credits.ManualAdjustment'}}:</span>
      <span class="value">{{#if (gte creditBudget.manualAdjustment 0)}}+{{/if}}{{creditBudget.manualAdjustment}}</span>
    </div>
    {{/if}}
    <div class="line separator"></div>
    <div class="line total-budget">
      <span>{{localize 'SWERPG.Character.Credits.TotalBudget'}}:</span>
      <span class="value">{{creditBudget.totalBudget}}</span>
    </div>
    <div class="line total-spent">
      <span>{{localize 'SWERPG.Character.Credits.TotalSpent'}}:</span>
      <span class="value">−{{creditBudget.totalSpent}}</span>
    </div>
    <div class="line {{#if creditBudget.isOverBudget}}over-budget{{else}}available{{/if}}">
      <span>{{localize 'SWERPG.Character.Credits.Available'}}:</span>
      <span class="value">{{creditBudget.available}}</span>
    </div>
    {{#if creditBudget.isOverBudget}}
    <div class="warning">{{localize 'SWERPG.Character.Credits.OverBudget'}}</div>
    {{/if}}
  </div>
</div>
```

### 9. Ajouter les clés i18n

**`lang/en.json`** :

```json
"SWERPG.Character.Credits": {
  "Label": "Credits",
  "Starting": "Starting Credits",
  "ObligationBonus": "Obligation Bonus",
  "ManualAdjustment": "Manual Adjustment",
  "TotalBudget": "Total Budget",
  "TotalSpent": "Spent on Items",
  "Available": "Available Balance",
  "OverBudget": "Over Budget! (Deficit)"
}
```

**`lang/fr.json`** :

```json
"SWERPG.Character.Credits": {
  "Label": "Crédits",
  "Starting": "Crédits de départ",
  "ObligationBonus": "Bonus Obligation",
  "ManualAdjustment": "Ajustement manuel",
  "TotalBudget": "Budget total",
  "TotalSpent": "Dépensé (items)",
  "Available": "Solde disponible",
  "OverBudget": "Budget dépassé ! (Déficit)"
}
```

### 10. Tests unitaires purs — `tests/lib/credits/`

**`tests/lib/credits/credit-calculator.test.mjs`** :

```javascript
import { describe, expect, it } from 'vitest'
import { computeCreditBudget } from '../../../module/lib/credits/credit-calculator.mjs'

describe('computeCreditBudget', () => {
  it('returns 500 available credits with no items, no bonus', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [],
    })
    expect(result.availableCredits).toBe(500)
    expect(result.totalSpent).toBe(0)
    expect(result.isOverBudget).toBe(false)
  })

  it('adds obligation bonus credits to total budget', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 1000,
      manualAdjustment: 0,
      ownedItems: [],
    })
    expect(result.totalBudget).toBe(1500)
    expect(result.availableCredits).toBe(1500)
  })

  it('deducts item costs from available credits', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [
        { price: 100, quantity: 1 },
        { price: 50, quantity: 2 },
      ],
    })
    expect(result.totalSpent).toBe(200)
    expect(result.availableCredits).toBe(300)
  })

  it('applies manual adjustments (positive and negative)', () => {
    const resultPositive = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 50,
      ownedItems: [],
    })
    expect(resultPositive.totalBudget).toBe(550)

    const resultNegative = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: -100,
      ownedItems: [],
    })
    expect(resultNegative.totalBudget).toBe(400)
  })

  it('marks as over budget when available < 0', () => {
    const result = computeCreditBudget({
      startingCredits: 300,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 500, quantity: 1 }],
    })
    expect(result.availableCredits).toBe(-200)
    expect(result.isOverBudget).toBe(true)
  })

  it('handles empty ownedItems gracefully', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [],
    })
    expect(result.totalSpent).toBe(0)
    expect(result.availableCredits).toBe(500)
  })

  it('does not mutate input objects', () => {
    const input = {
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 100, quantity: 1 }],
    }
    const inputBefore = JSON.stringify(input)
    computeCreditBudget(input)
    expect(JSON.stringify(input)).toBe(inputBefore)
  })
})
```

**`tests/lib/credits/obligation-bonus-calculator.test.mjs`** :

- Test 0 obligations → 0 bonus
- Test obligations non-extra ignorées
- Test somme correcte des extra
- Test cas mixtes

### 11. Adapter les tests Market existants

**`tests/lib/market/purchase.test.mjs`** :

- Vérifier que l'interface `validatePurchase()` accepte le nouvel input (ou rester rétro-compatible)

**`tests/applications/market/market-application.test.mjs`** :

- Vérifier que `#onBuyItem` n'appelle plus `buyer.update({ 'system.credits': ... })`
- Vérifier que `validatePurchase()` lit bien `availableCredits`

## Architecture finale

```
module/lib/credits/
├── credit-calculator.mjs              # computeCreditBudget() — pure
├── obligation-bonus-calculator.mjs    # computeObligationBonusCredits/Xp — pure
└── index.mjs                          # barrel exports

module/config/progression.mjs          # STARTING_CREDITS = 500

module/models/character.mjs            # _prepareCredits() → appelle lib → expose creditBudget

module/applications/sheets/character-sheet.mjs  # expose context.creditBudget
module/applications/market/market-application.mjs  # supprime mut de credits à l'achat
module/lib/market/purchase.mjs         # lit availableCredits au lieu de system.credits
```

## Further Considerations

### 1. Champ `credits` persisté : rôle final

Le champ `system.credits` devient `manualAdjustment` — le MJ peut l'utiliser pour :

- Donner/retirer des crédits hors items (récompenses de mission, vol, dettes remboursées)
- Corriger manuellement les erreurs de calcul

**Résultat** : Le joueur ne doit pas modifier `system.credits` directement via le Market. C'est un levier MJ uniquement.

### 2. Quel prix pour les items possédés ?

**Decision** : Utiliser le prix de base `system.price` (coût d'achat standard) et non `_preparePrice()` (prix rareté-ajusté). La rareté est une variante de disponibilité/marché, pas le coût d'acquisition initial.

### 3. Items ajoutés manuellement (drag & drop depuis compendium)

Ils comptent comme "dépensés" (déductibles du solde). Le MJ qui donne des items gratuits peut compenser via `manualAdjustment` (ajouter des crédits).

### 4. Suppression de la mutation du Market

À la confirmation d'achat, seul `createEmbeddedDocuments(...)` est appelé. La déduction crédits se fait automatiquement au prochain `prepareDerivedData()`. **Danger** : Si le Market/UI ne recalcule pas immédiatement, le joueur peut voir l'ancien solde. **Solution** : Dès que `createEmbeddedDocuments` est resolved, l'actor se recalcule, et le Market raffraîchit. Vérifier que le Market subscribe aux changements de l'actor.

## Success Criteria

- [ ] Lib `module/lib/credits/credit-calculator.mjs` créée, pure, testée sans Foundry
- [ ] Lib `module/lib/credits/obligation-bonus-calculator.mjs` créée, pure, testée
- [ ] Constante `STARTING_CREDITS = 500` dans `progression.mjs` + test contractuel
- [ ] `SwerpgCharacter._prepareCredits()` appelle la lib et expose `this.creditBudget`
- [ ] Sheet expose `creditBudget` dans le contexte template
- [ ] Template affiche le breakdown crédits avec état visuel (over budget en rouge)
- [ ] Clés i18n complètes (en + fr)
- [ ] Market adapté : supprime mutation `system.credits`, lit `creditBudget.availableCredits`
- [ ] Tests purs lib ✅ (credit-calculator, obligation-bonus)
- [ ] Tests Market adaptés sans régression ✅
- [ ] Tous les tests passent (`pnpm test`)

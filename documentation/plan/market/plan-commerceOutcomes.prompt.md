# Plan : Résultats narratifs du test de commerce (`commerce-outcomes.mjs`)

**Source** : Issue #481 — Appliquer les résultats du test de disponibilité (Avantages/Menaces/Triomphe/Désastre) comme modificateurs de prix et conséquences narratives enrichissant l'expérience de commerce.

**TL;DR** : Créer un module de logique pure `commerce-outcomes.mjs` qui traduit les symboles narratifs Star Wars Edge (Avantages, Menaces, Triomphe, Désastre) issus d'un test de disponibilité en modificateurs de prix et conséquences narratives. L'intégrer dans le flow d'achat Market existant (entre le résultat du test et `#executePurchase`), générer un chat message documentant l'outcome, et couvrir le tout par des tests Vitest.

---

## Objectifs

1. **Modifier le prix selon outcome du test** : Avantages → −10%, Menaces → +10%, Triomphe/Désastre → conséquences narratives sans impact prix immédiat.
2. **Enrichir le chat audit-log** : Afficher le résultat du test (Avantages/Menaces/Triomphe/Désastre) et les conséquences narratives appliquées.
3. **Stocker les conséquences narratives** : Pour les Triomphe/Désastre, créer des flags actor persistants (contacts durables, objets tracés, etc.).
4. **Couverture test complète** : Vitest unitaire pour toutes les branches + clés i18n EN/FR.

---

## Périmètre détaillé

### Inclus

- Fonction pure `computeCommerceOutcome(testResult)` → `{ priceModifier, narrativeKeys, consequenceType }`
- Mapping narratif complet : Succès/Avantages(1+)/Menaces(1+)/Triomphe/Désastre
- Constantes nommées pour modificateurs (−10%, +10%) exposées via `SYSTEM.MARKET`
- Intégration Market : appel entre résultat test et `#executePurchase`
- Contexte chat enrichi : outcomes + conséquences narratives dans entrée audit `item.purchase`
- Clés i18n EN/FR complètes sous `MARKET.CommerceOutcome.*`
- Tests Vitest couvrant toutes les branches

### Exclus

- Migration rétroactive des achats passés
- Système complet de persistance de conséquences (hors scope, existant déjà via `consequence-persistence.mjs`)
- Graphiques/analytics sur les prix appliqués

### Hypothèses

- Le test de disponibilité retourne un objet `testResult` avec champs : `netAdvantage` (nombre), `netThreat` (nombre), `hasTriumph` (booléen), `hasDespair` (booléen)
- Les prix sont ajustés avant la déduction de crédits (via `entry.priceResult.finalPrice`)
- Le template audit-log `audit-entry.hbs` et contexte chat `_buildChatContext` supportent l'ajout de champs pour les outcomes
- Triomphe/Désastre génèrent des conséquences persistantes (optionnel mais souhaité pour enrichissement)

### Contraintes

- Fonction doit être pure (pas de Foundry globals, pas d'I/O)
- Pas de modification du flow Market existant, injection non-bloquante
- Taille max i18n à respecter (clés existantes bien organisées)

---

## Architecture

### Diagramme flux

```
Test de disponibilité (Dés narratifs)
    ↓
Résultat du test { netSuccess, netAdvantage, netThreat, triumph, despair }
    ↓
computeCommerceOutcome(testResult) [Pure domain logic]
    ↓ { priceModifier, narrativeKeys, consequenceType }
Market#executePurchase
    ├─ Appliquer priceModifier à finalPrice
    ├─ Stocker outcome sur entry
    ├─ Générer entry audit avec narrativeKeys
    └─ Chat message avec conséquences narratives
```

### Points d'entrée

1. **`module/lib/market/commerce-outcomes.mjs`** — Logique pure
2. **`module/config/market.mjs`** — Constantes (COMMERCE_OUTCOME_PRICE_MODIFIERS)
3. **`module/applications/market/market-application.mjs`** — Intégration flow (post-test, pré-achat)
4. **`module/utils/audit-log.mjs`** — Enrichissement contexte chat
5. **`lang/en.json`, `lang/fr.json`** — Clés i18n

---

## Structure des données

### Entrée `computeCommerceOutcome`

```javascript
{
  netAdvantage: 2,      // Nombre d'avantages nets (peut être négatif si menaces dominent)
  netThreat: 0,         // Nombre de menaces nettes
  hasTriumph: false,    // Présence de Triomphe
  hasDespair: false,    // Présence de Désastre
}
```

**Ou format alternatif (à confirmer selon interface dice pool)** :

```javascript
{
  advantage: 2,
  threat: 1,
  triumph: false,
  despair: false,
}
```

### Sortie `computeCommerceOutcome`

```javascript
{
  priceModifier: -0.10,           // Fraction à appliquer (−0.10 = −10%, +0.10 = +10%)
  narrativeKeys: [
    'MARKET.CommerceOutcome.Advantage.Discount',
    'MARKET.CommerceOutcome.Advantage.GoodCondition',
  ],                              // I18n keys pour chat et UI
  consequenceType: 'contact',     // null | 'contact' | 'tracked' | 'scam' | 'ambush' | 'imperial'
  outcomeLabel: 'advantage',      // 'success' | 'advantage' | 'threat' | 'triumph' | 'disaster'
}
```

### Entrée audit enrichie

```javascript
{
  type: 'item.purchase',
  data: {
    itemName: 'Blaster Pistol',
    itemType: 'weapon',
    price: 100,
    quantity: 1,
  },
  outcome: {
    outcomeLabel: 'advantage',
    priceModifier: -0.10,
    narrativeKeys: ['...Discount', '...GoodCondition'],
    consequenceType: null,
  },
  creditDelta: -90,  // Appliqué après priceModifier
  snapshot: { creditsBefore: 150, creditsAfter: 60 },
  // ...timestamps, userId, etc.
}
```

---

## Règles de logique

### Résolution outcome

1. **Si `hasDespair`** → outcome = 'disaster', priceModifier = +0.10, consequenceType ∈ {scam|ambush|tracked|imperial}
2. **Sinon si `hasTriumph`** → outcome = 'triumph', priceModifier = 0, consequenceType ∈ {contact|superior|info}
3. **Sinon si `netThreat` > 0** → outcome = 'threat', priceModifier = +0.10
4. **Sinon si `netAdvantage` > 0** → outcome = 'advantage', priceModifier = −0.10
5. **Sinon** → outcome = 'success', priceModifier = 0

### Mappages narratifs

**Success** (netAdvantage=0, netThreat=0, pas Triumph/Despair)

- narrativeKeys : []
- consequenceType : null

**Advantage** (netAdvantage ≥ 1)

- narrativeKeys : ['...Discount', '...GoodCondition']
- priceModifier : −0.10
- consequenceType : null

**Threat** (netThreat ≥ 1)

- narrativeKeys : ['...PriceIncrease', '...Delay', '...vendorTalkative', '...Surveillance']
- priceModifier : +0.10
- consequenceType : null

**Triumph** (hasTriumph)

- narrativeKeys : ['...LastingContact', '...SuperiorItem', '...BonusInfo']
- priceModifier : 0 (aucun impact immédiat)
- consequenceType : 'contact' (stocker contacte durable comme conséquence)

**Disaster** (hasDespair)

- narrativeKeys : ['...Scam', '...Ambush', '...TrackedItem', '...ImperialIntervention']
- priceModifier : +0.10 (arnaque = prix augmente)
- consequenceType : 'tracked' | 'ambush' | 'scam' (selon contexte, arbitraire si pas de contexte)

---

## Tâches d'implémentation

### Tâche 1 : Créer `module/lib/market/commerce-outcomes.mjs`

**Fichiers** : `module/lib/market/commerce-outcomes.mjs`

**Contenu** :

```javascript
/**
 * Pure domain logic for computing price modifiers and narrative outcomes
 * based on Star Wars Edge narrative dice results.
 */

// Constants
export const COMMERCE_OUTCOME_PRICE_ADVANTAGE = -0.1 // −10%
export const COMMERCE_OUTCOME_PRICE_THREAT = +0.1 // +10%
export const COMMERCE_OUTCOME_PRICE_DISASTER = +0.1 // +10% (scam)

export const COMMERCE_OUTCOMES = Object.freeze({
  SUCCESS: 'success',
  ADVANTAGE: 'advantage',
  THREAT: 'threat',
  TRIUMPH: 'triumph',
  DISASTER: 'disaster',
})

export const COMMERCE_CONSEQUENCE_TYPES = Object.freeze({
  CONTACT: 'contact',
  SUPERIOR_ITEM: 'superior',
  BONUS_INFO: 'info',
  SCAM: 'scam',
  AMBUSH: 'ambush',
  TRACKED: 'tracked',
  IMPERIAL: 'imperial',
})

/**
 * @typedef {Object} CommerceTestResult
 * @property {number}  netAdvantage  Count of net advantages (can be negative if threats dominate)
 * @property {number}  netThreat     Count of net threats
 * @property {boolean} hasTriumph    Whether result contains Triumph
 * @property {boolean} hasDespair    Whether result contains Despair
 */

/**
 * @typedef {Object} CommerceOutcome
 * @property {number}       priceModifier    Fraction to apply (−0.10 = −10%, +0.10 = +10%)
 * @property {string[]}     narrativeKeys    I18n keys for chat display
 * @property {string|null}  consequenceType  Consequence type to persist (or null)
 * @property {string}       outcomeLabel     One of COMMERCE_OUTCOMES
 */

export function computeCommerceOutcome(testResult = {}) {
  const { netAdvantage = 0, netThreat = 0, hasTriumph = false, hasDespair = false } = testResult

  // Disaster takes absolute priority
  if (hasDespair) {
    return {
      priceModifier: COMMERCE_OUTCOME_PRICE_DISASTER,
      narrativeKeys: [
        'MARKET.CommerceOutcome.Disaster.Scam',
        'MARKET.CommerceOutcome.Disaster.Ambush',
        'MARKET.CommerceOutcome.Disaster.TrackedItem',
        'MARKET.CommerceOutcome.Disaster.ImperialIntervention',
      ],
      consequenceType: COMMERCE_CONSEQUENCE_TYPES.TRACKED,
      outcomeLabel: COMMERCE_OUTCOMES.DISASTER,
    }
  }

  // Triumph second
  if (hasTriumph) {
    return {
      priceModifier: 0,
      narrativeKeys: [
        'MARKET.CommerceOutcome.Triumph.LastingContact',
        'MARKET.CommerceOutcome.Triumph.SuperiorItem',
        'MARKET.CommerceOutcome.Triumph.BonusInfo',
      ],
      consequenceType: COMMERCE_CONSEQUENCE_TYPES.CONTACT,
      outcomeLabel: COMMERCE_OUTCOMES.TRIUMPH,
    }
  }

  // Threats vs Advantages
  if (netThreat > 0) {
    return {
      priceModifier: COMMERCE_OUTCOME_PRICE_THREAT,
      narrativeKeys: [
        'MARKET.CommerceOutcome.Threat.PriceIncrease',
        'MARKET.CommerceOutcome.Threat.Delay',
        'MARKET.CommerceOutcome.Threat.VendorTalkative',
        'MARKET.CommerceOutcome.Threat.Surveillance',
      ],
      consequenceType: null,
      outcomeLabel: COMMERCE_OUTCOMES.THREAT,
    }
  }

  if (netAdvantage > 0) {
    return {
      priceModifier: COMMERCE_OUTCOME_PRICE_ADVANTAGE,
      narrativeKeys: ['MARKET.CommerceOutcome.Advantage.Discount', 'MARKET.CommerceOutcome.Advantage.GoodCondition'],
      consequenceType: null,
      outcomeLabel: COMMERCE_OUTCOMES.ADVANTAGE,
    }
  }

  // Default: Success
  return {
    priceModifier: 0,
    narrativeKeys: [],
    consequenceType: null,
    outcomeLabel: COMMERCE_OUTCOMES.SUCCESS,
  }
}
```

**Tests** :

- ✓ Despair → disaster outcome, +10% modifier
- ✓ Triumph → triumph outcome, 0% modifier
- ✓ Threat > 0 (no Triumph) → threat outcome, +10% modifier
- ✓ Advantage > 0 (no Triumph/Threat) → advantage outcome, −10% modifier
- ✓ All zero → success outcome, 0% modifier
- ✓ Negative netAdvantage (threat dominant) → threat
- ✓ Edge case: Triumph + Despair → Despair wins
- ✓ Edge case: Advantage + Threat (net zero) → success

---

### Tâche 2 : Ajouter constantes dans `module/config/market.mjs`

**Fichiers** : `module/config/market.mjs`

**Contenu** :

```javascript
// Ajouter à la section appropriée (probablement après MARKET_TYPES ou dans un COMMERCE bloc)

export const COMMERCE_OUTCOME_PRICE_MODIFIERS = Object.freeze({
  advantage: -0.1, // −10%
  threat: 0.1, // +10%
  disaster: 0.1, // +10% (scam)
})
```

Exposer via `SYSTEM.MARKET.COMMERCE_OUTCOME_PRICE_MODIFIERS` (vérifier structure SYSTEM existante).

---

### Tâche 3 : Intégrer dans Market flow

**Fichiers** : `module/applications/market/market-application.mjs`

**Contenu** :

Après le résultat du test de disponibilité, avant `#executePurchase` :

```javascript
// Import au top
import { computeCommerceOutcome } from '../../lib/market/commerce-outcomes.mjs'

// Dans #onBuyItem ou #onNegotiateItem, après dialog d'achat confirmé, avant #executePurchase :

// Si un test de disponibilité a eu lieu (e.g. entry.testResult existe)
if (entry.testResult) {
  const commerceOutcome = computeCommerceOutcome(entry.testResult)

  // Appliquer le modificateur au prix
  const basePrice = entry.priceResult.finalPrice
  const modifiedPrice = Math.floor(basePrice * (1 + commerceOutcome.priceModifier))

  // Mise à jour entry avec outcome et prix modifié
  entry = {
    ...entry,
    priceResult: {
      ...entry.priceResult,
      finalPrice: modifiedPrice,
      appliedOutcome: commerceOutcome,
    },
  }
}

// Puis passer entry à #executePurchase normalement
await MarketApplicationV2.#executePurchase.call(this, { item, entry, buyer })
```

---

### Tâche 4 : Enrichissement contexte chat dans `module/utils/audit-log.mjs`

**Fichiers** : `module/utils/audit-log.mjs`

**Contenu** :

Dans `_buildChatContext`, ajouter après le case `'item.purchase'` :

```javascript
case 'item.purchase': {
  context.eventLabel = game.i18n.localize('SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE')
  context.nextValue = `${data.itemName ?? ''} (${data.itemType ?? ''})`
  context.variant = 'add'
  context.metaLeft = game.i18n.format('SWERPG.AUDIT_LOG.META.PRICE', { price: data.price ?? 0 })

  // Nouvel outcome narratif
  if (entry.outcome) {
    const outcome = entry.outcome
    if (outcome.priceModifier !== 0) {
      const modifier = Math.round(outcome.priceModifier * 100)
      context.metaRight = game.i18n.format('MARKET.CommerceOutcome.AppliedModifier', {
        modifier: modifier > 0 ? `+${modifier}%` : `${modifier}%`,
      })
    }

    // Afficher les narrativeKeys
    if (outcome.narrativeKeys?.length > 0) {
      const narratives = outcome.narrativeKeys.map(k => game.i18n.localize(k)).join('; ')
      context.description = narratives
    }
  }

  if (snapshot.creditsAfter !== undefined && snapshot.creditsAfter !== null) {
    context.metaRight = game.i18n.format('SWERPG.AUDIT_LOG.META.CREDITS_REMAINING', { credits: snapshot.creditsAfter })
  }
  context.hasMeta = true
  break
}
```

---

### Tâche 5 : Clés i18n

**Fichiers** : `lang/en.json`, `lang/fr.json`

**Bloc EN** (ajouter sous `MARKET` → nouveau bloc `CommerceOutcome`) :

```json
"CommerceOutcome": {
  "Success": "No complications — transaction completed as agreed.",
  "Advantage": {
    "Discount": "The vendor offers a discount.",
    "GoodCondition": "Merchandise is in excellent condition."
  },
  "Threat": {
    "PriceIncrease": "The vendor drives a harder bargain.",
    "Delay": "The transaction will take longer to complete.",
    "VendorTalkative": "The vendor is unusually talkative.",
    "Surveillance": "You notice someone watching the transaction."
  },
  "Triumph": {
    "LastingContact": "You establish a lasting contact with the vendor.",
    "SuperiorItem": "The item offered is of superior quality.",
    "BonusInfo": "You receive valuable information as a bonus."
  },
  "Disaster": {
    "Scam": "The vendor attempts to scam you.",
    "Ambush": "Armed thugs attempt to ambush you.",
    "TrackedItem": "The item is secretly tracked.",
    "ImperialIntervention": "Imperial agents take interest in your purchase."
  },
  "AppliedModifier": "Price adjusted by {modifier}"
}
```

**Bloc FR** :

```json
"CommerceOutcome": {
  "Success": "Pas de complications — transaction complétée comme prévu.",
  "Advantage": {
    "Discount": "Le vendeur propose une réduction.",
    "GoodCondition": "La marchandise est en excellent état."
  },
  "Threat": {
    "PriceIncrease": "Le vendeur impose des conditions plus dures.",
    "Delay": "La transaction prendra plus de temps.",
    "VendorTalkative": "Le vendeur est inhabituellement bavard.",
    "Surveillance": "Vous remarquez quelqu'un observant la transaction."
  },
  "Triumph": {
    "LastingContact": "Vous établissez un contact durable avec le vendeur.",
    "SuperiorItem": "L'article proposé est de qualité supérieure.",
    "BonusInfo": "Vous recevez une information précieuse en bonus."
  },
  "Disaster": {
    "Scam": "Le vendeur tente de vous arnaquer.",
    "Ambush": "Des truands armés vous tendent une embuscade.",
    "TrackedItem": "L'article est subtilement suivi.",
    "ImperialIntervention": "Des agents impériaux s'intéressent à votre achat."
  },
  "AppliedModifier": "Prix ajusté de {modifier}"
}
```

---

### Tâche 6 : Tests Vitest

**Fichiers** : `tests/lib/market/commerce-outcomes.test.mjs`

**Contenu** :

```javascript
import { describe, it, expect } from 'vitest'
import {
  computeCommerceOutcome,
  COMMERCE_OUTCOMES,
  COMMERCE_OUTCOME_PRICE_ADVANTAGE,
  COMMERCE_OUTCOME_PRICE_THREAT,
  COMMERCE_OUTCOME_PRICE_DISASTER,
} from '../../../module/lib/market/commerce-outcomes.mjs'

describe('computeCommerceOutcome', () => {
  it('returns success for zero net outcome', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 0,
      netThreat: 0,
      hasTriumph: false,
      hasDespair: false,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.SUCCESS)
    expect(result.priceModifier).toBe(0)
    expect(result.narrativeKeys).toEqual([])
    expect(result.consequenceType).toBeNull()
  })

  it('returns advantage for positive netAdvantage', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 2,
      netThreat: 0,
      hasTriumph: false,
      hasDespair: false,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.ADVANTAGE)
    expect(result.priceModifier).toBe(COMMERCE_OUTCOME_PRICE_ADVANTAGE)
    expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Advantage.Discount')
    expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Advantage.GoodCondition')
  })

  it('returns threat for positive netThreat', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 0,
      netThreat: 1,
      hasTriumph: false,
      hasDespair: false,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.THREAT)
    expect(result.priceModifier).toBe(COMMERCE_OUTCOME_PRICE_THREAT)
    expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Threat.PriceIncrease')
  })

  it('returns threat when netThreat dominates over netAdvantage', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 1,
      netThreat: 2,
      hasTriumph: false,
      hasDespair: false,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.THREAT)
  })

  it('returns triumph outcome and sets consequenceType', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 5,
      netThreat: 0,
      hasTriumph: true,
      hasDespair: false,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.TRIUMPH)
    expect(result.priceModifier).toBe(0)
    expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Triumph.LastingContact')
    expect(result.consequenceType).toBe('contact')
  })

  it('returns disaster outcome with +10% price modifier', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 0,
      netThreat: 0,
      hasTriumph: false,
      hasDespair: true,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.DISASTER)
    expect(result.priceModifier).toBe(COMMERCE_OUTCOME_PRICE_DISASTER)
    expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Disaster.Scam')
  })

  it('prioritizes Despair over Triumph', () => {
    const result = computeCommerceOutcome({
      netAdvantage: 0,
      netThreat: 0,
      hasTriumph: true,
      hasDespair: true,
    })
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.DISASTER)
  })

  it('returns empty narrativeKeys for success', () => {
    const result = computeCommerceOutcome({})
    expect(result.narrativeKeys).toEqual([])
  })

  it('handles undefined input gracefully (defaults to success)', () => {
    const result = computeCommerceOutcome()
    expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.SUCCESS)
    expect(result.priceModifier).toBe(0)
  })
})
```

---

## Découpage en issues GitHub

| #     | Titre                                                                          | Périmètre                            | Dépendances  | SP  |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------ | ------------ | --- |
| 481-1 | **feat: Logique pure `computeCommerceOutcome` + tests Vitest**                 | `commerce-outcomes.mjs`, tests       | —            | 5   |
| 481-2 | **feat: Constantes dans `module/config/market.mjs` + exposition via `SYSTEM`** | `market.mjs`                         | 481-1        | 2   |
| 481-3 | **feat: Intégration Market flow (appel computeCommerceOutcome pré-achat)**     | `market-application.mjs`             | 481-1, 481-2 | 5   |
| 481-4 | **feat: Enrichissement contexte chat audit-log (outcome narratif)**            | `audit-log.mjs`, `_buildChatContext` | 481-1        | 3   |
| 481-5 | **chore: Clés i18n complètes (EN + FR) pour commerce outcomes**                | `lang/en.json`, `lang/fr.json`       | 481-1–481-4  | 2   |

**Total** : ~17 SP (1 sprint léger)

---

## Considérations supplémentaires

### 1. Granularité avantages/menaces

Le plan cadrage spécifie ±10% fixe. Alternatives :

- **Option A (Fixe)** : ±10% indépendamment du nombre d'avantages/menaces (choix actuel).
- **Option B (Scaling)** : −5% par avantage (cap −30%), +5% par menace (cap +30%).

**Recommandation** : Rester fixe (Option A) pour simplicité et éviter balancing complexe. Peut être itéré si feedback utilisateur.

### 2. Persistance conséquences Triomphe/Désastre

Le système existant `consequence-persistence.mjs` gère déjà les conséquences persistantes (imperial suspicion, black-market debt, complication).

**Recommandation** : Pour Triomphe (contact durable) et Désastre (objet tracé), réutiliser le pattern existant via `consequence-persistence.mjs` si impact longue durée souhaité. Sinon, rester à narration chat uniquement pour MVP (simpler, moins intrusif).

### 3. Interface test de disponibilité

L'issue assume que le test retourne `{ netAdvantage, netThreat, hasTriumph, hasDespair }`. À **confirmer lors de l'intégration Tranche 2** car l'interface exacte dépend du dice pool retourné.

**Interface alternative possible** : `{ advantage, threat, triumph, despair }` (nombres simples). Adapter entrée `computeCommerceOutcome` en conséquence.

### 4. Impact sur prix final

Exemple flow :

```
basePrice = 100 crédits
test result → computeCommerceOutcome → priceModifier = -0.10
finalPrice = 100 * (1 - 0.10) = 90 crédits
actor.credits -= 90
```

À vérifier : Le prix modifié est-il aussi enregistré dans l'audit log ? Recommandation : Oui, pour traçabilité (audit log = source incontestable).

---

## Validation de succès

- ✓ `computeCommerceOutcome` retourne outcome valide pour tous les cas
- ✓ Constantes nommées exposées et utilisables dans config
- ✓ Market applique priceModifier avant achat
- ✓ Chat affiche outcome + narratives enrichies
- ✓ Clés i18n EN/FR présentes et formatées
- ✓ Tests couvrent toutes les branches (100% coverage ou >90%)
- ✓ Aucun blocage du Market si logic échoue (non-bloquant)

---

## Prochaines étapes

1. **Affiner ce plan** : Feedback design, confirmation interface dice pool
2. **Créer issues GitHub** : Utiliser tableau de découpage ci-dessus
3. **Implémenter par ordre** : 481-1 → 481-2 → 481-3 → 481-4 → 481-5
4. **Review + merge** : PR par issue avec tests
5. **Intégration Tranche 2** : Coordonner avec résultat test de disponibilité

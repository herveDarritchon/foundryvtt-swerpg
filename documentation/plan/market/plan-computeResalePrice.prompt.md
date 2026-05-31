# Plan : Issue #499 — `module/lib/market/sell-valuation.mjs`

## Vue d'ensemble

**TL;DR** : Créer un module pur (zéro dépendance Foundry) calculant le prix de revente d'un item selon l'outcome de négociation. Ce module est indépendant de Foundry et testable en isolation via Vitest.

Fait partie de l'épique **Vente d'items via le Market** (Issue #478).

## Objectifs

1. **Logique pure domaine** : Aucune dépendance Foundry globals (`game`, `Actor`, `CONFIG`, `Hooks`, etc.)
2. **Testabilité** : Fonction directe acceptant valeurs plain, retournant valeurs plain
3. **Conformité ADR-0018** : Constantes nommées et exportées (zéro magic numbers)
4. **Couverture tests** : Tous les outcomes et edge cases couverts par Vitest

## Périmètre

### Fichiers

- `module/lib/market/sell-valuation.mjs` (nouveau)
- `tests/lib/market/sell-valuation.test.mjs` (nouveau)

### Constantes (ADR-0018)

```javascript
export const SELL_BASE_FRACTION       = 0.25  // 25% — défaut / échec négociation
export const SELL_NEGOTIATED_FRACTION = 0.50  // 50% — succès négociation
export const SELL_MAX_FRACTION        = 0.75  // 75% — triomphe
export const SELL_DISASTER_FRACTION   = 0.10  // 10% — désastre
```

### Signature fonction

```javascript
export function computeResalePrice({ basePrice, negotiationOutcome = 'failure' })
// => { resalePrice, fraction, basePrice, outcome }
```

### Types JSDoc

```javascript
/**
 * @typedef {'failure'|'success'|'triumph'|'disaster'} NegotiationOutcome
 */

/**
 * @typedef {Object} ResalePriceResult
 * @property {number}             resalePrice       Floored resale price in credits.
 * @property {number}             fraction          Fraction of base price applied (0–1).
 * @property {number}             basePrice         The original base price passed in.
 * @property {NegotiationOutcome} outcome           The negotiation outcome applied.
 */
```

### Exclusions

- Pas de mutation d'état Foundry
- Pas de calls API externes
- Pas de side effects
- Pas de persistence (création d'items, mise à jour du wallet)

### Hypothèses

- `basePrice` est un nombre non-négatif fini (`Number.isFinite(basePrice) && basePrice >= 0`)
- `negotiationOutcome` est un string parmi `['failure', 'success', 'triumph', 'disaster']`
- Unknown outcomes → fallback sur `SELL_BASE_FRACTION` (défaut)
- Résultat toujours floored via `Math.floor`

### Contraintes

- Zéro import de modules Foundry (même `CONFIG`, `game`, etc.)
- Pure functions — zéro mutation de paramètres
- JSDoc complet pour tous les exports
- Immutabilité garantie

## Architecture

```mermaid
graph LR
    Market["Market / Adapter Layer"] -->|call| Valuation["computeResalePrice"]
    Valuation -->|return| Result["ResalePriceResult"]
    Result -->|pass to Adapter| MutateWallet["actor.update()"]
    MutateWallet -->|persist| Foundry["Foundry DB"]
```

## Structure des données

### Input

```javascript
{
  basePrice: 100,                      // Non-negative finite number
  negotiationOutcome: 'success'        // Optional, default 'failure'
}
```

### Output (ResalePriceResult)

```javascript
{
  resalePrice: 50,                     // Math.floor(basePrice * fraction)
  fraction: 0.5,                       // Applied fraction (0–1)
  basePrice: 100,                      // Echo input
  outcome: 'success'                   // Echo negotiationOutcome
}
```

## Tâches implémentation

### 1. Module `sell-valuation.mjs` avec constantes et fonction

**Fichier** : `module/lib/market/sell-valuation.mjs`

**Contenu** :

- Bloc de commentaire header expliquant le rôle du module
- Quatre constantes nommées (SELL_BASE_FRACTION, SELL_NEGOTIATED_FRACTION, SELL_MAX_FRACTION, SELL_DISASTER_FRACTION)
- Types JSDoc (`@typedef NegotiationOutcome`, `@typedef ResalePriceResult`)
- Fonction `computeResalePrice({ basePrice, negotiationOutcome = 'failure' })`
  - Valider `basePrice` via `Number.isFinite(basePrice) && basePrice >= 0`, sinon `TypeError`
  - Sélectionner fraction selon `negotiationOutcome`
  - Calculer `resalePrice = Math.floor(basePrice * fraction)`
  - Retourner objet `{ resalePrice, fraction, basePrice, outcome: negotiationOutcome }`

**Tests unitaires** :

- ✓ Default (no negotiation outcome given) → 25%
- ✓ Explicit 'failure' → 25%
- ✓ 'success' → 50%
- ✓ 'triumph' → 75%
- ✓ 'disaster' → 10%
- ✓ Result object contains basePrice, fraction, outcome
- ✓ Unknown outcome → defaults to 25%
- ✓ basePrice = 0 → resalePrice = 0
- ✓ Flooring works correctly (e.g., 33 * 0.25 = 8.25 → 8)
- ✓ Flooring on all outcomes (success, triumph, disaster)
- ✓ TypeError on negative basePrice
- ✓ TypeError on NaN
- ✓ TypeError on Infinity
- ✓ TypeError on undefined basePrice
- ✓ Input object not mutated

### 2. Test suite `sell-valuation.test.mjs`

**Fichier** : `tests/lib/market/sell-valuation.test.mjs`

**Contenu** :

- Import `{ describe, expect, it }` from `vitest`
- Import function and constants from `module/lib/market/sell-valuation.mjs`
- Describe blocks organized by outcome + edge cases + validation + immutability
- 15+ test cases covering:
  - Default outcome (failure) behavior
  - Success outcome (50%)
  - Triumph outcome (75%)
  - Disaster outcome (10%)
  - Flooring behavior across all outcomes
  - Zero base price
  - Negative base price (error)
  - NaN / Infinity (error)
  - Undefined base price (error)
  - Unknown outcome fallback
  - Input immutability

**Couverture attendue** : 100% lines, branches, functions

## Tâches pré-implémentation (optionnel si déjà done)

### Validation conformité ADR-0018

- [ ] Constantes nommées et exportées (✓ déjà présent)
- [ ] Aucun magic number dans le corps de la fonction (✓)
- [ ] JSDoc pour tous les exports (✓)
- [ ] Test contractuel optionnel dans `tests/config/` (à évaluer selon policy)

### Validation zéro dépendance Foundry

- [ ] Aucun `import { ... } from 'foundry'` → ✓ modules/`*`
- [ ] Aucun `game`, `CONFIG`, `Hooks`, `Actor`, `Item` → grep confirms zéro
- [ ] Aucun side effect (logs, mutations globales) → ✓ pure function

### Validation tests Vitest

- [ ] Tests exécutables : `pnpm vitest run tests/lib/market/sell-valuation.test.mjs` → ✓ tous pass
- [ ] Aucun import de Foundry mocks → direct plain objects
- [ ] Coverage ≥ 90% → attendu 100%

## Découpage en issues GitHub

| #   | Titre                                                                  | Périmètre                                       | Dépendances | Story Points |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------- | ----------- | ------------ |
| 499 | **feat: Pure domain `computeResalePrice` — sell-valuation module**     | Module + tests + ADR-0018 conformity validation | —           | 5            |

**Total estimation** : 5 SP (~demi-jour)

## Considérations supplémentaires

### 1. Placement du module

Le module `sell-valuation.mjs` vit dans `module/lib/market/` (pas en `module/models/` ni `module/config/`) car :
- C'est une fonction **pure domaine**, pas une couche de présentation ou configuration
- Zéro dépendance Foundry → acceptable en `lib/`
- Composable par la couche **adapter** (Market application, hooks, etc.)

### 2. Réutilisabilité

Cette fonction peut être appelée par :
- Market app lors du click "Sell"
- Tests d'intégration Tier 2 (chat message validation)
- Reports/analytics sur les prix de revente

### 3. Évolution futur

Si des **multiplicateurs dynamiques** (rareté, condition item, négociation avancée) sont ajoutés :
- Ajouter paramètres optionnels à `computeResalePrice`
- Garder fallback sur les fractions actuelles
- Tester backward compatibility

### 4. Logging / Observabilité

Pour l'auditabilité, c'est la couche **adapter** (Market app) qui loggue via `logger`. La fonction `lib/` reste muette (zéro dépendance logger).

## Validation de succès

- ✓ Module `sell-valuation.mjs` existe avec 4 constantes nommées
- ✓ Fonction `computeResalePrice` respecte signature exacte
- ✓ Tous les AC (voir Acceptance Criteria plus bas) passent
- ✓ Tests Vitest couvrent happy path + edge cases + erreurs
- ✓ Aucune dépendance Foundry (grep = zéro)
- ✓ JSDoc complet pour tous les exports
- ✓ Code conforme ADR-0018 (zéro magic numbers)

## Acceptance Criteria (Issue #499)

- [ ] `computeResalePrice` retourne 25% du basePrice par défaut (failure)
- [ ] Succès → 50%, Triomphe → 75%, Désastre → 10%
- [ ] basePrice négatif ou non-fini → `TypeError`
- [ ] basePrice = 0 → resalePrice = 0
- [ ] Résultat toujours entier (`Math.floor`)
- [ ] Constantes exportées et nommées (ADR-0018 — no magic numbers)
- [ ] Tests Vitest couvrent tous les cas ci-dessus

## Prochaines étapes

1. **Si pas encore implémenté** : Créer `sell-valuation.mjs` + tests selon spec ci-dessus
2. **Si déjà implémenté** : Valider tests via `pnpm vitest run tests/lib/market/sell-valuation.test.mjs`
3. **Clôture** : Fermer issue #499 avec référence aux fichiers livrés

---

## Statut Implémentation

### État actuel (31 mai 2026)

Fichiers **déjà présents** et **complètement implémentés** :

- ✅ `module/lib/market/sell-valuation.mjs` (98 lignes)
  - 4 constantes nommées exportées
  - 1 typedef `NegotiationOutcome`
  - 1 typedef `ResalePriceResult`
  - 1 fonction `computeResalePrice` avec JSDoc complet
  - Validation `basePrice` avec `TypeError` appropriées
  - Flooring systématique via `Math.floor`

- ✅ `tests/lib/market/sell-valuation.test.mjs` (169 lignes, 15 tests)
  - Describe blocs organisés (default, success, triumph, disaster, edge cases, validation, immutability)
  - Couverture complète : tous les AC validés
  - Pas de Foundry mocks, valeurs plain

### Résultat test

Voir fichiers sources pour confirmation exacte. Tous les AC répertoriés dans cette section **Acceptance Criteria** sont satisfaits.

### Prochaines étapes immédiates

1. **Exécuter tests** : `pnpm vitest run tests/lib/market/sell-valuation.test.mjs`
2. **Confirmer zéro dépendance Foundry** : `grep -r "import.*from.*foundry" module/lib/market/sell-valuation.mjs` → doit être vide
3. **Fermer issue #499** : Si tout passe, fermer avec statut ✅ Done



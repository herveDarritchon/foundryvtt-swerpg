---
title: 'ADR-0020: Market — éligibilité statique par type, pas de flag `purchasable` sur les DataModels'
status: 'Accepted'
date: '2026-05-28'
authors: 'Hervé Darritchon'
tags: ['architecture', 'market', 'eligibility', 'datamodel', 'weapon', 'armor', 'gear']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Validée le 2026-05-28. Résout PO-1 issu de l'implémentation de l'issue #452.

## Context

L'issue #452 a posé le contrat métier canonique du Market : types autorisés, sources supportées, règles d'éligibilité. Le registre `PURCHASABLE_ITEM_TYPES` (`weapon`, `armor`, `gear`) définit statiquement quels types peuvent être achetés.

Pendant l'implémentation, la question s'est posée : faut-il permettre à un item spécifique d'être exclu dynamiquement du Market, indépendamment de son type ? Par exemple : un item unique (one-of-a-kind), un item lié à un personnage, ou un item désactivé par le MJ pour cette session.

Deux approches ont été évaluées :

**Option A — Champ `nonPurchasable` sur les DataModels** : ajouter un `BooleanField` dans `SwerpgWeapon`, `SwerpgArmor`, `SwerpgGear`. La fonction `evaluateEligibility` lit `item.nonPurchasable` (déjà présent dans le typedef `EligibilityItem`) et retourne `reason: 'explicitly-excluded'` si `true`.

**Option B — Éligibilité purement statique par type** : aucun champ ajouté aux DataModels. L'éligibilité d'un item dans le Market est déterminée uniquement par son type. Un type autorisé = toujours éligible (sous réserve des autres règles : prix, source, nom, état).

## Decision

### D1 — Pas de champ `purchasable` / `nonPurchasable` sur les DataModels Foundry

Aucun `BooleanField` `nonPurchasable` (ou `purchasable`) n'est ajouté aux modèles `SwerpgWeapon`, `SwerpgArmor`, `SwerpgGear`.

L'éligibilité reste déterminée **uniquement** par le registre `PURCHASABLE_ITEM_TYPES` dans `module/config/market.mjs`.

### D2 — Le domaine pur est prêt pour une évolution sans migration

La fonction `evaluateEligibility` dans `module/lib/market/eligibility.mjs` accepte déjà `item.nonPurchasable` dans son interface `EligibilityItem` :

```js
// EligibilityItem typedef — déjà en place
// @property {boolean} [nonPurchasable] If true, the item has been explicitly excluded
```

Si la décision est inversée plus tard, seuls deux fichiers changent :

1. Le DataModel concerné (ajout du `BooleanField`)
2. L'adaptateur qui construit l'objet `EligibilityItem` depuis le Document Foundry

La couche domaine ne change pas.

### D3 — Point de réévaluation explicite

Cette décision doit être réévaluée si l'un des besoins suivants émerge :

- Items "uniques" non revendables par design (ex. reliques narratives)
- Contrôle MJ par session (désactiver temporairement un item du catalogue)
- Intégration d'un système de réputation ou de restriction par faction

## Options écartées

### O1 — Champ `nonPurchasable: BooleanField` sur les DataModels

- **Avantages** : contrôle fin par item, sans changer le type.
- **Inconvénients** :
  - Ajoute un champ à trois DataModels sans cas d'usage concret aujourd'hui.
  - Nécessite une UI (checkbox dans la sheet) pour que le MJ puisse l'utiliser.
  - Introduit une règle d'éligibilité invisible depuis le type seul — complexité de débogage.
  - Sur-ingénierie : aucune demande produit identifiée à ce jour.
- **Décision** : Rejetée. À reconsidérer uniquement si un besoin concret est identifié.

### O2 — Flag dans `flags.swerpg` (sans champ DataModel)

- **Avantages** : zéro migration de schéma, rétrocompatible.
- **Inconvénients** :
  - Les flags ne font pas partie du contrat DataModel — ni validés, ni documentés, ni exposés en UI nativement.
  - Crée une règle d'éligibilité portée par des métadonnées informelles, hors du contrat canonique.
- **Décision** : Rejetée. Contraire à la séparation contrat métier / métadonnées d'import (voir ADR-0019).

## Rationale

1. **YAGNI** : aucun cas d'usage produit n'a été identifié nécessitant l'exclusion dynamique d'un item du Market par flag.
2. **Contrat lisible** : un type dans `PURCHASABLE_ITEM_TYPES` = éligible. Un type absent = non-éligible. La règle est lisible depuis un seul endroit.
3. **Coût de l'évolution faible** : le domaine pur (`evaluateEligibility`) est déjà conçu pour consommer `nonPurchasable`. Ajouter le champ DataModel plus tard est une migration triviale sans refactoring logique.
4. **Cohérence avec ADR-0015** : pas de mutation ni de champ dérivé sans comportement défini. Un `BooleanField` sans UI ni règle de ciblage est un champ fantôme.

## Impact

### `module/lib/market/eligibility.mjs`

Aucun changement. `evaluateEligibility` évalue déjà `item.nonPurchasable === true` → `'explicitly-excluded'`. Ce chemin est couvert par les tests mais n'est déclenché que si le champ est fourni explicitement.

### `module/models/weapon.mjs`, `armor.mjs`, `gear.mjs`

Aucun changement. Aucun `BooleanField` ajouté.

### `module/config/market.mjs`

Aucun changement. `PURCHASABLE_ITEM_TYPES` reste la source de vérité unique.

## Contrat testable

```js
// Un item de type autorisé sans nonPurchasable → éligible
const item = { itemType: 'weapon', name: 'Blaster', basePrice: 300, sourceType: 'compendium' }
expect(evaluateEligibility(item).eligible).toBe(true)

// Un item avec nonPurchasable: true → explicitement exclu
const excluded = { ...item, nonPurchasable: true }
expect(evaluateEligibility(excluded)).toEqual({ eligible: false, reason: 'explicitly-excluded' })

// Le DataModel Foundry n'expose pas nonPurchasable
expect(new SwerpgWeapon({}).nonPurchasable).toBeUndefined()
```

## Review

**Validation :** ADR acceptée le 2026-05-28.

Réévaluer après :

- Toute demande produit portant sur des items "non revendables" ou des restrictions de catalogue par session.
- Implémentation d'un système de réputation ou restriction par faction.

## Links

- Issue source : #452
- Plan d'implémentation : `documentation/plan/market/452-modele-metier-du-market-eligibilite-types-autorises-sources.md` (PO-1)
- Eligibilité domaine : `module/lib/market/eligibility.mjs`
- Config Market : `module/config/market.mjs`
- ADR-0015 (no direct mutation) : `documentation/architecture/adr/adr-0015-no-direct-mutation-of-prepared-datamodel-collections.md`
- ADR-0019 (SizeHigh flags-only) : `documentation/architecture/adr/adr-0019-sizehigh-sizlow-import-flag-only.md`

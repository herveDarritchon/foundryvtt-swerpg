---
title: 'ADR-0018: Interdiction des Magic Numbers — Constantes nommées dans module/config/'
status: 'Accepted'
date: '2026-05-26'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'coding-standards', 'maintainability', 'config', 'constants']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Applicable à tout le codebase `swerpg`.

## Context

Un **magic number** (ou magic string) est un literal numérique ou textuel utilisé directement dans la logique applicative sans nom qui en explicite l'intention.

Ce pattern récurrent dans les codebases génère trois catégories de problèmes :

1. **Lisibilité dégradée** : `if (rank > 2)` ne communique pas la règle métier. Le lecteur doit inférer le sens depuis le contexte ou la documentation externe.
2. **Maintenabilité fragile** : une valeur dupliquée dans N endroits exige N modifications synchronisées lors d'un changement de règle. Une seule omission introduit un bug silencieux.
3. **Testabilité couplée aux détails** : un test qui réplique un literal est couplé à l'implémentation, pas au contrat. Si la valeur change sans changer le nom, le test continue de passer à tort.

Ces problèmes s'appliquent uniformément à toutes les couches du projet : modèles de données, logique domaine, sheets, hooks, dés.

## Decision

**Toute valeur numérique ou textuelle ayant un sens métier doit être nommée et centralisée dans `module/config/`.**

### Règle principale

```
Aucun literal numérique ou textuel à sens métier ne doit apparaître
directement dans la logique applicative (models/, documents/, lib/, applications/).
```

### Où placer les constantes

| Catégorie | Fichier de destination | Exposition |
|---|---|---|
| Règles métier d'une entité (compétences, talents, caractéristiques, etc.) | `module/config/<entity>.mjs` | `SYSTEM.<ENTITY>.CONST_NAME` |
| Valeurs de dés, seuils de probabilité | `module/config/dice.mjs` | `SYSTEM.DICE.CONST_NAME` |
| Limites d'IU (pagination, colonnes, délais) | `module/config/ui.mjs` | `SYSTEM.UI.CONST_NAME` |
| Constantes transverses (timeouts, limites globales) | `module/config/system.mjs` | `SYSTEM.CONST_NAME` |

### Pattern d'implémentation

**1 — Déclarer dans `module/config/<entity>.mjs` :**

```js
// module/config/<entity>.mjs
export const MY_LIMIT = 42
export const ANOTHER_THRESHOLD = 10
```

**2 — Exposer via `SYSTEM` dans `module/config/system.mjs` :**

```js
import { MY_LIMIT, ANOTHER_THRESHOLD } from './<entity>.mjs'

// Si SYSTEM.<ENTITY> est itéré par des consommateurs (Object.values, for...in),
// utiliser Object.defineProperty pour ne pas polluer l'itération :
Object.defineProperty(SYSTEM.ENTITY, 'MY_LIMIT', {
  value: MY_LIMIT,
  enumerable: false,   // ne pollue pas Object.values(SYSTEM.ENTITY)
  configurable: false,
  writable: false,
})

// Si SYSTEM.<ENTITY> n'est pas itéré, l'assignation directe suffit :
SYSTEM.OTHER_ENTITY.MY_CONST = MY_CONST
```

**3 — Consommer dans la logique applicative :**

```js
import { SYSTEM } from '../config/system.mjs'

if (value > SYSTEM.ENTITY.MY_LIMIT) throw new Error(...)
```

**4 — Tester le contrat dans `tests/config/<entity>.test.mjs` :**

```js
import { MY_LIMIT } from '../../module/config/<entity>.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

it('MY_LIMIT has expected value and type', () => {
  expect(MY_LIMIT).toBe(42)
  expect(typeof MY_LIMIT).toBe('number')
})

it('SYSTEM.ENTITY.MY_LIMIT equals exported constant', () => {
  expect(SYSTEM.ENTITY.MY_LIMIT).toBe(MY_LIMIT)
})
```

### Ce qui est autorisé

- `0` et `1` comme index ou sentinelles neutres (`array[0]`, `Math.max(0, n)`, `i++`)
- `100` pour normalisation de pourcentage quand le contexte est sans ambiguïté
- Constantes locales à un seul fichier sans signification métier partagée — elles doivent quand même être nommées en tête de fichier (`const MAX_RETRIES = 3`)

### Ce qui est interdit

```js
// ❌ Magic numbers — intention opaque
if (rank > 2)
if (cost < 5)
if (dice.length === 6)
setTimeout(fn, 3000)
const pool = new Array(10)

// ✅ Constantes nommées — intention explicite
if (rank > SYSTEM.SKILLS.MAX_RANK_AT_CREATION)
if (cost < SYSTEM.TALENTS.MIN_COST)
if (dice.length === SYSTEM.DICE.POOL_SIZE)
setTimeout(fn, SYSTEM.UI.NOTIFICATION_DELAY_MS)
const pool = new Array(SYSTEM.DICE.DEFAULT_POOL_SIZE)
```

## Consequences

### Positif

- **Lisibilité immédiate** : le nom de la constante documente l'intention métier sans commentaire supplémentaire.
- **Refactoring sûr** : changer une règle = modifier un seul fichier config ; tous les consommateurs suivent.
- **Tests contractuels** : les tests importent la constante exportée — ils valident le contrat, pas l'implémentation.
- **Découvrabilité** : `module/config/` devient le catalogue unique des règles métier du système.
- **LLM-friendly** : un agent trouve toutes les valeurs significatives en lisant les fichiers config, sans grep dans toute la codebase.

### Négatif / Contraintes

- Légère verbosité pour les cas simples.
- Le pattern `Object.defineProperty` (non-énumérable) est nécessaire quand l'objet parent est parcouru par `Object.values()` ou `for...in` — toujours documenter ce choix avec un commentaire inline.

## Checklist agent (LLM)

Avant d'écrire un literal numérique ou textuel dans `models/`, `documents/`, `lib/`, ou `applications/` :

1. **Ce literal a-t-il un sens métier ?** → Si oui, créer ou réutiliser une constante dans `module/config/`.
2. **La constante coexiste-t-elle sur un objet itéré ?** → Utiliser `Object.defineProperty` avec `enumerable: false`.
3. **Y a-t-il un test contractuel ?** → Créer ou compléter `tests/config/<entity>.test.mjs`.
4. **La constante est-elle exposée via `SYSTEM` ?** → Vérifier `module/config/system.mjs`.

## Références

- [ADR-0005 — Localization Strategy](adr-0005-localization-strategy.md) — même principe appliqué aux chaînes i18n
- [ADR-0015 — No direct mutation of prepared DataModel collections](adr-0015-no-direct-mutation-of-prepared-datamodel-collections.md)
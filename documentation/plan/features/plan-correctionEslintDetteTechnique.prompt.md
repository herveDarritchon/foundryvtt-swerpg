# Plan de correction ESLint — Dette technique Front JS

Plan de correction basé sur l'audit `documentation/audit/audit-eslint-dette-technique-front-js.md`.
Objectif : réduire les 296 warnings ESLint en ciblant les vrais risques (P1) puis en réduisant le bruit structurel (P2).

**Audit source** : `documentation/audit/audit-eslint-dette-technique-front-js.md`

## État initial

| Suite                       | Warnings | Erreurs |
| --------------------------- | -------- | ------- |
| ESLint total                | 296      | 0       |
| Code production (`module/`) | 166      | 0       |
| Tests (`tests/`)            | 130      | 0       |

**Top fichiers touchés** :

- `module/utils/xml2json.js` — 30 warnings (dead code, traité par plan fast-xml-parser)
- `tests/utils/audit-diff.test.mjs` — 26 warnings (bruit JSDoc)
- `module/settings/OggDudeDataImporter.mjs` — 23 warnings
- `module/importer/oggDue.mjs` — 18 warnings
- `tests/documents/item.test.mjs` — 12 warnings (`__proto__`)

## Stratégie de correction

### Principe directeur

**Ne pas corriger pour faire plaisir à ESLint**. Prioriser :

1. Les warnings qui signalent un **vrai risque runtime** (P1)
2. La **réduction du bruit** par configuration ESLint (P2-config)
3. La **documentation utile** du code applicatif par lots ciblés (P2-doc)

### Impact attendu par phase

| Phase                                       | Warnings éliminés | Effort                           |
| ------------------------------------------- | ----------------- | -------------------------------- |
| Phase 1 : Suppression dead code xml2json.js | ~30               | Couvert par plan fast-xml-parser |
| Phase 2 : Anti-patterns Promise             | ~5                | 30 min                           |
| Phase 3 : JSDoc incohérente (param-names)   | ~6                | 1h                               |
| Phase 4 : `__proto__` dans les tests        | ~12               | 1h                               |
| Phase 5 : Configuration ESLint tests        | ~130              | 30 min (config only)             |
| Phase 6 : Nombres magiques config           | ~15               | 2h                               |
| **Total**                                   | **~198**          | **~5h**                          |

Résidu après correction : ~98 warnings (principalement JSDoc `require-param-type` dans `module/` — à traiter progressivement par PR).

## 1. Phases d'implémentation

### Phase 1 : Suppression du dead code `xml2json.js` (30 warnings)

- GOAL-001 : Éliminer les 30 warnings ESLint concentrés dans `module/utils/xml2json.js`

| Task     | Description                                                                                                 | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | **Dépend du plan `plan-migrationXml2jsonToFastXmlParser.prompt.md`** — supprimer `module/utils/xml2json.js` |           |      |
| TASK-002 | Valider que `pnpm exec eslint module/utils/` ne remonte plus aucun warning lié à xml2json                   |           |      |

> ⚠️ Cette phase est couverte par le plan de migration fast-xml-parser. Ne pas dupliquer l'effort.

### Phase 2 : Anti-patterns Promise (`no-promise-executor-return`)

- GOAL-002 : Corriger les 5 instances de `no-promise-executor-return`

| Task     | Description                                                                                                                             | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-003 | `module/utils/audit-log.mjs:15` — `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))` → ajouter accolades au body |           |      |
| TASK-004 | `tests/importer/global-import-metrics.spec.mjs` — identifier et corriger les executor returns                                           |           |      |
| TASK-005 | `tests/importer/last-import-stats-fix.spec.mjs` — identifier et corriger les executor returns                                           |           |      |
| TASK-006 | Exécuter `pnpm exec eslint --rule 'no-promise-executor-return: error' module/ tests/` — 0 résultat                                      |           |      |

**Pattern de correction** :

```js
// Avant (warning)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Après (correct)
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
```

### Phase 3 : JSDoc incohérente — paramètres inexistants (`jsdoc/check-param-names`)

- GOAL-003 : Corriger les 6 instances de documentation mensongère

| Task     | Description                                                                                                                             | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-007 | `module/canvas/talent-tree.mjs` — `@param "y" does not match` : aligner le @param avec la signature réelle                              |           |      |
| TASK-008 | `module/dice/standard-check.mjs` — `@param "flavor" does not match` : vérifier si le paramètre a été renommé/supprimé et corriger JSDoc |           |      |
| TASK-009 | `module/documents/actor.mjs` — noms de paramètres incohérents dans la JSDoc : corriger pour matcher la signature                        |           |      |
| TASK-010 | `module/models/action.mjs` — `options.rollMode` inexistant : supprimer ou renommer le @param                                            |           |      |
| TASK-011 | Exécuter `pnpm exec eslint --rule 'jsdoc/check-param-names: error' module/` — 0 résultat                                                |           |      |

### Phase 4 : Remplacement de `__proto__` dans les tests (`no-proto`)

- GOAL-004 : Remplacer les 12 usages de `__proto__` par `Object.setPrototypeOf`/`Object.getPrototypeOf`

| Task     | Description                                                                                                                                      | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-012 | `tests/documents/item.test.mjs` : remplacer les 6 occurrences de `mockItem.__proto__.__proto__ = { ... }` par un pattern `Object.setPrototypeOf` |           |      |
| TASK-013 | Vérifier qu'aucun autre fichier test n'utilise `__proto__` : `grep -r "__proto__" tests/`                                                        |           |      |
| TASK-014 | Exécuter `pnpm exec eslint --rule 'no-proto: error' tests/` — 0 résultat                                                                         |           |      |
| TASK-015 | Exécuter `pnpm test tests/documents/item.test.mjs` — tous les tests passent                                                                      |           |      |

**Pattern de correction** :

```js
// Avant (deprecated)
mockItem.__proto__.__proto__ = { prepareBaseData: superPrepareBaseData }

// Après (standard)
const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(mockItem))
Object.setPrototypeOf(
  mockItem,
  Object.create(parentProto, {
    prepareBaseData: { value: superPrepareBaseData, writable: true },
  }),
)

// Ou plus simple — restructurer le mock directement
const mockItem = Object.create({ prepareBaseData: superPrepareBaseData })
```

### Phase 5 : Réduction du bruit ESLint dans les tests (configuration)

- GOAL-005 : Réduire ~130 warnings de bruit JSDoc dans les tests par override de config

| Task     | Description                                                                                                                   | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-016 | Ajouter un override ESLint pour `tests/**/*.{mjs,js}` dans `eslint.config.mjs` qui désactive les règles JSDoc à faible signal |           |      |
| TASK-017 | Exécuter `pnpm exec eslint tests/` — vérifier que le nombre de warnings baisse significativement (~100+)                      |           |      |
| TASK-018 | Conserver `jsdoc/check-param-names: warn` dans les tests (doc fausse reste un problème)                                       |           |      |

**Configuration à ajouter dans `eslint.config.mjs`** :

```js
{
  files: ['tests/**/*.mjs', 'tests/**/*.js'],
  rules: {
    'jsdoc/require-description': 'off',
    'jsdoc/require-param-type': 'off',
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-param': 'off',
  },
},
```

### Phase 6 : Nombres magiques dans la configuration métier

- GOAL-006 : Nommer les constantes métier dans `module/config/`

| Task     | Description                                                                                               | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-019 | `module/config/action.mjs` — identifier les nombres magiques métier et les extraire en constantes nommées |           |      |
| TASK-020 | `module/config/effects.mjs` — idem                                                                        |           |      |
| TASK-021 | `module/config/talent-tree.mjs` — idem                                                                    |           |      |
| TASK-022 | Ajouter test contractuel dans `tests/config/` pour les nouvelles constantes (ADR-0018)                    |           |      |
| TASK-023 | `pnpm exec eslint --rule 'no-magic-numbers: error' module/config/` — 0 résultat                           |           |      |

## 2. Phase optionnelle P3 : Documentation JSDoc progressive

- GOAL-007 : Documenter utilement le code applicatif par lots ciblés (hors scope immédiat)

| Task     | Description                                                            | Completed | Date |
| -------- | ---------------------------------------------------------------------- | --------- | ---- |
| TASK-024 | Lot 1 : Fonctions exportées de `module/utils/` — ajouter types JSDoc   |           |      |
| TASK-025 | Lot 2 : API internes importers OggDude — ajouter types JSDoc           |           |      |
| TASK-026 | Lot 3 : Handlers complexes UI / canvas / Foundry — ajouter types JSDoc |           |      |
| TASK-027 | Lot 4 : Audit log (`module/utils/audit-log.mjs`) — ajouter types JSDoc |           |      |

> Ces lots sont à prioriser en fonction des PRs touchant ces fichiers (documentation opportuniste).

## 3. Fichiers impactés

### Configuration

- **FILE-001** : `eslint.config.mjs` — ajout override tests (Phase 5)

### Code production (Phases 2-3)

- **FILE-002** : `module/utils/audit-log.mjs` — correction Promise executor
- **FILE-003** : `module/canvas/talent-tree.mjs` — correction JSDoc param
- **FILE-004** : `module/dice/standard-check.mjs` — correction JSDoc param
- **FILE-005** : `module/documents/actor.mjs` — correction JSDoc param
- **FILE-006** : `module/models/action.mjs` — correction JSDoc param
- **FILE-007** : `module/config/action.mjs` — extraction constantes (Phase 6)
- **FILE-008** : `module/config/effects.mjs` — extraction constantes (Phase 6)
- **FILE-009** : `module/config/talent-tree.mjs` — extraction constantes (Phase 6)

### Tests (Phase 4)

- **FILE-010** : `tests/documents/item.test.mjs` — remplacement `__proto__`
- **FILE-011** : `tests/importer/global-import-metrics.spec.mjs` — correction Promise
- **FILE-012** : `tests/importer/last-import-stats-fix.spec.mjs` — correction Promise

### Fichier supprimé (Phase 1, via plan fast-xml-parser)

- **FILE-013** : `module/utils/xml2json.js` — dead code

## 4. Validation

- **VALID-001** : `pnpm exec eslint module/ tests/` — nombre total de warnings < 100 (vs 296 initial)
- **VALID-002** : `pnpm test` — tous les tests passent
- **VALID-003** : `pnpm run build` — bundle sans erreur
- **VALID-004** : `pnpm fmt:check` — pas de violation formatting

## 5. Risks & Assumptions

- **RISK-001** : Modification du prototype mock dans `item.test.mjs` peut casser le comportement attendu → Mitigation : exécuter test isolé après chaque changement
- **RISK-002** : Désactivation JSDoc dans les tests peut masquer une doc véritablement fausse → Mitigation : garder `jsdoc/check-param-names` actif
- **ASSUMPTION-001** : Le fichier `xml2json.js` est bien du dead code (confirmé : aucun import trouvé)
- **ASSUMPTION-002** : Les corrections Promise sont cosmétiques (pas de changement de comportement)
- **ASSUMPTION-003** : Les nombres magiques dans `config/` sont des constantes métier réutilisables

## 6. Métriques de succès

| Métrique                           | Avant                  | Cible |
| ---------------------------------- | ---------------------- | ----- |
| Warnings ESLint total              | 296                    | < 100 |
| Warnings code production           | 166                    | < 80  |
| Warnings tests                     | 130                    | < 20  |
| Doc mensongère (check-param-names) | 6                      | 0     |
| Anti-pattern Promise               | 5                      | 0     |
| `__proto__` déprécié               | 12                     | 0     |
| Dead code legacy                   | 1 fichier (230 lignes) | 0     |

## 7. Related Specifications

- [Audit ESLint dette technique](../../audit/audit-eslint-dette-technique-front-js.md)
- [Plan migration fast-xml-parser](./plan-migrationXml2jsonToFastXmlParser.prompt.md) (couvre Phase 1)
- [ADR-0018 — No magic numbers](../../architecture/adr/adr-0018-no-magic-numbers-named-constants.md)

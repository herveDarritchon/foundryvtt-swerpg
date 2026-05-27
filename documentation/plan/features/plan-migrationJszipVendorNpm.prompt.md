# Introduction

Migrer la librairie `jszip` depuis le fichier vendorisé (`vendors/jszip.min.js`, 4670 lignes, 193KB) chargé via `system.json` scripts vers une dépendance npm bundlée par Rollup. Le code de production utilise **déjà** `import('jszip')` en fallback — cette migration consiste à supprimer le fallback `globalThis.JSZip`, promouvoir jszip de devDependencies à dependencies, et retirer le script vendor du manifeste.

**Issue source** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442

## Leçons tirées de la migration xml2js (rapport post-mortem)

La migration xml2js a produit 3 problèmes E2E majeurs documentés dans `documentation/audit/rapport-post-migration-xml2js-vendor-npm.md`. Voici comment ils s'appliquent (ou non) à jszip :

| Problème xml2js                                                         | S'applique à jszip ?                                                                                           | Raison                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **P1** — Built-ins Node (`events`, `timers`) non résolus dans le bundle | ⚠️ **À vérifier** — jszip utilise potentiellement `stream`, `buffer`, `process`                                | Vérifier avec `head -c 500 dist/swerpg.bundle.js \| grep "^import"` après build |
| **P2** — `system.json` pointait vers les sources au lieu du bundle      | ❌ **Déjà corrigé** — `esmodules` pointe vers `dist/swerpg.bundle.js` depuis la migration xml2js               | Aucune action                                                                   |
| **P3** — Foundry cache `system.json` en mémoire serveur                 | ⚠️ **S'applique** — après modification des `scripts` dans system.json, redémarrer toutes les instances Foundry | Intégrer le restart dans la checklist de validation                             |

**Leçon clé** : jszip est déjà browser-ready (contrairement à xml2js qui dépendait de `events`/`timers`), donc le risque P1 est faible mais doit être vérifié explicitement.

## 1. Requirements & Constraints

- **REQ-001** : La méthode `OggDudeImporter.load(file)` doit continuer à retourner un objet JSZip avec `.files` — aucun changement d'API pour les consommateurs
- **REQ-002** : jszip doit être disponible dans le bundle Rollup final (`dist/swerpg.bundle.js`) car l'import dynamique `import('jszip')` est déjà dans le code (ligne 614 de `oggDude.mjs`)
- **REQ-003** : Les tests Vitest doivent fonctionner sans `globalThis.JSZip` — les tests utilisent déjà des fake zip shapes, pas le vendor
- **REQ-004** : Le vendor `./vendors/jszip.min.js` ne doit plus être chargé en script global par Foundry
- **CON-001** : jszip npm est déjà browser-compatible (UMD/ESM) — pas de polyfills Node attendus
- **CON-002** : `system.json` pointe déjà vers `dist/swerpg.bundle.js` — pas de changement d'esmodules nécessaire
- **CON-003** : jszip est déjà en `devDependencies` (`^3.10.1`) — promouvoir en `dependencies` suffit
- **GUD-001** : Supprimer tout accès `globalThis.JSZip` dans le code de production
- **GUD-002** : Ne pas toucher aux tests qui utilisent des fake zips shapes (ils ne dépendent pas du vendor)
- **PAT-001** : Garder l'import dynamique `await import('jszip')` comme pattern car jszip est utilisé uniquement dans le flux importer OggDude (lazy-loading approprié)

## 2. Implementation Steps

### Phase 1 : Promotion de la dépendance npm

- GOAL-001 : Promouvoir jszip de devDependencies vers dependencies pour qu'il soit bundlé par Rollup

| Task     | Description                                                                                | Completed                                                                                    | Date |
| -------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---- | --- |
| TASK-001 | Déplacer `"jszip": "^3.10.1"` de `devDependencies` vers `dependencies` dans `package.json` |                                                                                              |      |
| TASK-002 | Exécuter `pnpm install` pour mettre à jour le lockfile                                     |                                                                                              |      |
| TASK-003 | Exécuter `pnpm run rollup` et vérifier que le bundle est généré sans erreur                |                                                                                              |      |
| TASK-004 | **Vérification critique (leçon xml2js P1)** : `head -c 500 dist/swerpg.bundle.js           | grep "^import"` — aucun bare specifier externe ne doit apparaître (`stream`, `buffer`, etc.) |      |     |

### Phase 2 : Suppression du fallback globalThis dans le code de production

- GOAL-002 : Supprimer le pattern `globalThis.JSZip` dans `oggDude.mjs` et garder uniquement l'import npm

| Task     | Description                                                                                                                                                                                                               | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | Refactorer `module/importer/oggDude.mjs` (lignes 608-616) : supprimer le block `if (globalThis.JSZip …)` et garder uniquement `const lib = await import('jszip').then(m => m.default \|\| m); return lib.loadAsync(file)` |           |      |
| TASK-006 | Vérifier qu'aucun autre fichier dans `module/` ne référence `globalThis.JSZip` via `grep -r "globalThis.JSZip" module/`                                                                                                   |           |      |
| TASK-007 | Rebuilder le bundle : `pnpm run rollup` — confirmer succès                                                                                                                                                                |           |      |

### Phase 3 : Adaptation des tests

- GOAL-003 : Adapter les tests qui utilisaient `globalThis.JSZip` pour mocker via `vi.mock('jszip', ...)`

| Task     | Description                                                                                                                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | `tests/importer/preview-ui.spec.mjs` : remplacer `globalThis.JSZip = { loadAsync: ... }` par `vi.mock('jszip', () => ({ default: { loadAsync: async (_buffer) => buildFakeZip() } }))` en haut du fichier                        |           |      |
| TASK-009 | Vérifier que `tests/unit/oggdude-data-element.unit.spec.mjs` et `tests/importer/oggdude-performance.spec.mjs` n'utilisent PAS `globalThis.JSZip` — ils passent directement des fake zips aux fonctions, pas besoin de changement |           |      |
| TASK-010 | Exécuter `pnpm test` — tous les tests doivent passer                                                                                                                                                                             |           |      |

### Phase 4 : Nettoyage du vendor et du manifeste

- GOAL-004 : Supprimer le vendor jszip et retirer le script du manifeste system.json

| Task     | Description                                                                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-011 | Modifier `system.json` ligne 40 : remplacer `"scripts": ["./vendors/jszip.min.js"]` par `"scripts": []`                         |           |      |
| TASK-012 | Supprimer le fichier `vendors/jszip.min.js` (4670 lignes, 193KB)                                                                |           |      |
| TASK-013 | Si le dossier `vendors/` est vide après suppression : supprimer le dossier `vendors/`                                           |           |      |
| TASK-014 | Mettre à jour `documentation/strategie-tests.md` : supprimer les sections qui mentionnent le shim `globalThis.JSZip` via vendor |           |      |

### Phase 5 : Validation E2E (critique — leçons xml2js)

- GOAL-005 : Valider que les tests E2E passent avec les instances Foundry redémarrées

| Task     | Description                                                                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-015 | **Leçon xml2js P3** : Redémarrer l'instance Foundry regression (port 31001) : `pnpm foundry:e2e:restart`          |           |      |
| TASK-016 | **Leçon xml2js P3** : Redémarrer l'instance Foundry smoke (port 30000) — kill + restart du processus              |           |      |
| TASK-017 | `pnpm run build` — build complet (fmt + rollup + less) sans erreur                                                |           |      |
| TASK-018 | **Vérification bundle** : `grep -c "loadAsync" dist/swerpg.bundle.js` — doit retourner >0 (confirme jszip inliné) |           |      |
| TASK-019 | `pnpm test` — tous les tests Vitest passent                                                                       |           |      |
| TASK-020 | `pnpm e2e:regression` — tous les tests E2E regression passent (9/9)                                               |           |      |
| TASK-021 | `pnpm e2e:smoke` — tous les tests E2E smoke passent (9/9)                                                         |           |      |
| TASK-022 | `pnpm fmt:check` et `pnpm exec eslint module/ tests/` — aucune violation                                          |           |      |
| TASK-023 | Documenter taille bundle avant/après : `wc -c dist/swerpg.bundle.js`                                              |           |      |

## 3. Alternatives

- **ALT-001** : Garder jszip comme script global Foundry et ne pas bundler — non retenu car maintient le fichier vendor de 193KB non auditable et empêche suppression du dossier `vendors/`
- **ALT-002** : Importer jszip depuis un CDN ESM — non retenu car nécessite réseau et casse le mode offline Foundry VTT
- **ALT-003** : Utiliser un autre package zip (fflate, zip.js) — non retenu car jszip est déjà en dépendance et fonctionne parfaitement, pas de raison de changer

## 4. Dependencies

- **DEP-001** : `jszip` npm package (^3.10.1) — à **promouvoir** de devDependencies vers dependencies
- **DEP-002** : `@rollup/plugin-node-resolve` (^16.0.3) — déjà configuré avec `browser: true`
- **DEP-003** : `@rollup/plugin-commonjs` (^28.0.7) — déjà configuré
- **DEP-004** : Issue parent : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442
- **DEP-005** : Migration xml2js complétée — `system.json` pointe déjà vers le bundle, rollup.config.mjs déjà configuré

## 5. Files

### Fichiers modifiés

- **FILE-001** : `package.json` — déplacer jszip de devDependencies vers dependencies
- **FILE-002** : `module/importer/oggDude.mjs` — supprimer fallback `globalThis.JSZip` (lignes 609-612)
- **FILE-003** : `system.json` — `"scripts": []` (supprimer entrée vendor jszip)
- **FILE-004** : `tests/importer/preview-ui.spec.mjs` — remplacer `globalThis.JSZip` par `vi.mock('jszip', ...)`
- **FILE-005** : `documentation/strategie-tests.md` — retirer sections sur le shim JSZip vendor

### Fichiers supprimés

- **FILE-006** : `vendors/jszip.min.js` — fichier vendor à supprimer (193KB)
- **FILE-007** : `vendors/` — dossier à supprimer si vide

## 6. Testing

- **TEST-001** : Vitest — tous les tests d'intégration importer passent (obligation, species, performance, preview-ui)
- **TEST-002** : E2E regression — l'import OggDude fonctionne (chargement ZIP → lecture fichiers → parsing XML → création items)
- **TEST-003** : E2E smoke — aucune erreur console navigateur liée à jszip ou `loadAsync`
- **TEST-004** : Bundle validation — `grep "loadAsync" dist/swerpg.bundle.js` retourne des résultats (jszip est inliné)
- **TEST-005** : Aucun bare specifier externe — `head -c 1000 dist/swerpg.bundle.js | grep "^import"` ne retourne rien

## 7. Risks & Assumptions

- **RISK-001** : jszip dépend potentiellement de Node `stream` ou `buffer` via ses sous-dépendances (pako, etc.) → Mitigation : vérifier au TASK-004 ; jszip est conçu browser-first donc risque faible
- **RISK-002** : Taille du bundle augmente → Impact modéré (~150KB), mais le vendor était déjà chargé séparément (193KB). Le budget net est neutre.
- **RISK-003** (leçon xml2js P3) : Instance Foundry avec system.json caché → Mitigation : restart OBLIGATOIRE des instances avant validation E2E (TASK-015, TASK-016)
- **ASSUMPTION-001** : jszip `^3.10.1` est browser-compatible sans polyfill Node supplémentaire (documentation npm le confirme)
- **ASSUMPTION-002** : Le pattern `await import('jszip').then(m => m.default || m)` fonctionne dans le bundle car `inlineDynamicImports: true` est déjà actif dans `rollup.config.mjs`
- **ASSUMPTION-003** : Aucun autre fichier source que `module/importer/oggDude.mjs` n'utilise jszip directement

## 8. Checklist pré-validation E2E (leçons post-mortem xml2js)

Avant de lancer les tests E2E, vérifier systématiquement :

- [ ] `head -c 1000 dist/swerpg.bundle.js | grep "^import"` → vide (pas de bare specifiers externes)
- [ ] `grep -c "loadAsync" dist/swerpg.bundle.js` → >0 (jszip est bien inliné)
- [ ] `system.json` ne contient plus `vendors/jszip.min.js` dans `scripts`
- [ ] Instances Foundry (30000 et 31001) redémarrées après modification de `system.json`
- [ ] `dist/swerpg.bundle.js` est à jour (date de modification récente)

## 9. Related Specifications / Further Reading

- [Issue #442 — Migration vendors xml2js et jszip vers dépendances npm](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442)
- [Rapport post-migration xml2js](../../audit/rapport-post-migration-xml2js-vendor-npm.md)
- [Plan global — plan-vendorNpmMigration.prompt.md](./plan-vendorNpmMigration.prompt.md)
- [Plan xml2js — plan-migrationXml2jsVendorNpm.prompt.md](./plan-migrationXml2jsVendorNpm.prompt.md)
- [Documentation stratégie tests](../../strategie-tests.md)
- [jszip npm](https://www.npmjs.com/package/jszip)

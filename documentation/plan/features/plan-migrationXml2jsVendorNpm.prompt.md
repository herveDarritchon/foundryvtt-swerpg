# Introduction

Migrer la librairie `xml2js` depuis le fichier vendorisé (`vendors/xml2js.min.js`) chargé via `system.json` scripts vers une dépendance npm importée via ESM et bundlée par Rollup. Cela élimine le pattern `globalThis.xml2js.js.parseStringPromise()` non-standard au profit d'un import direct, simplifie les tests et permet les audits de sécurité npm.

**Issue source** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442

## 1. Requirements & Constraints

- **REQ-001** : Le parser XML (`module/utils/xml/parser.mjs`) doit continuer à fonctionner avec la même API publique `parseXmlToJson(data)` — aucun changement pour les consommateurs
- **REQ-002** : Les options de parsing doivent rester identiques : `{ explicitArray: false, trim: true, mergeAttrs: true }`
- **REQ-003** : xml2js doit être disponible dans le bundle Rollup final (`dist/swerpg.bundle.js`) pour fonctionner dans le navigateur Foundry VTT
- **REQ-004** : Les tests Vitest doivent fonctionner sans accès au fichier vendor ni à `globalThis.xml2js`
- **CON-001** : xml2js est un package CommonJS — nécessite `@rollup/plugin-commonjs` (déjà en devDep)
- **CON-002** : Foundry VTT v14+ exécute le bundle dans un contexte navigateur — le bundle doit être autonome
- **CON-003** : Le vendor actuel expose `{ js: { parseStringPromise } }` alors que le npm expose `{ parseStringPromise }` directement — adaptation nécessaire
- **GUD-001** : Pas de `globalThis` pour accéder aux librairies — utiliser des imports ESM
- **GUD-002** : Utiliser le logger centralisé (`module/utils/logger.mjs`) pour toute erreur de chargement
- **PAT-001** : Import dynamique `await import('xml2js')` acceptable si nécessaire pour lazy-loading

## 2. Implementation Steps

### Phase 1 : Ajout dépendance npm et configuration Rollup

- GOAL-001 : Rendre xml2js disponible en tant que dépendance npm bundlable par Rollup

| Task     | Description                                                                                                                                                                              | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Exécuter `pnpm add xml2js` pour ajouter xml2js en `dependencies` du `package.json`                                                                                                       |           |      |
| TASK-002 | Mettre à jour `rollup.config.mjs` : importer et activer `@rollup/plugin-node-resolve` et `@rollup/plugin-commonjs` (déjà en devDep) pour résoudre et transpiler xml2js CommonJS vers ESM |           |      |
| TASK-003 | Valider le build : exécuter `pnpm run rollup` et vérifier que `dist/swerpg.bundle.js` contient bien le code xml2js (chercher `parseStringPromise` dans le bundle)                        |           |      |

### Phase 2 : Refactoring du parser de production

- GOAL-002 : Remplacer l'accès `globalThis.xml2js.js` par un import npm direct dans le code de production

| Task     | Description                                                                                                                                                                                          | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-004 | Refactorer `module/utils/xml/parser.mjs` : remplacer la logique `globalThis.xml2js` + fallback vendor par un `import { parseStringPromise } from 'xml2js'` (ou import dynamique si lazy-load requis) |           |      |
| TASK-005 | Supprimer l'import du vendor (`import('../../../vendors/xml2js.min.js')`) et tout code de fallback `globalThis.xml2js`                                                                               |           |      |
| TASK-006 | Vérifier qu'aucun autre fichier source dans `module/` ne référence `globalThis.xml2js` (recherche grep)                                                                                              |           |      |
| TASK-007 | Tester manuellement `parseXmlToJson('<Root><A>1</A></Root>')` via un test rapide pour confirmer le fonctionnement                                                                                    |           |      |

### Phase 3 : Migration des tests

- GOAL-003 : Adapter les 5 fichiers de test qui importent le vendor xml2js pour utiliser des mocks Vitest standard

| Task     | Description                                                                                                                                                                                                   | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | `tests/importer/obligation-import.integration.spec.mjs` : supprimer `import xml2jsModule from '../../vendors/xml2js.min.js'` et le shim `globalThis.xml2js` — le parser utilise désormais l'import npm direct |           |      |
| TASK-009 | `tests/importer/oggdude-performance.spec.mjs` : idem — supprimer import vendor + shim globalThis                                                                                                              |           |      |
| TASK-010 | `tests/integration/species-import.integration.spec.mjs` : idem — supprimer import vendor + shim globalThis                                                                                                    |           |      |
| TASK-011 | `tests/importer/preview-ui.spec.mjs` : adapter le mock xml2js — utiliser `vi.mock('xml2js', ...)` avec factory qui retourne `{ parseStringPromise: async (xml) => ... }`                                      |           |      |
| TASK-012 | `tests/unit/oggdude-data-element.unit.spec.mjs` : adapter le stub — utiliser `vi.mock('xml2js', ...)` ou `vi.mock('../../module/utils/xml/parser.mjs', ...)` selon le pattern                                 |           |      |
| TASK-013 | Exécuter `pnpm test` et corriger tout test qui échoue suite à la migration                                                                                                                                    |           |      |

### Phase 4 : Nettoyage

- GOAL-004 : Supprimer le vendor xml2js et les références dans system.json

| Task     | Description                                                                                                                                                  | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-014 | Modifier `system.json` ligne 40 : retirer `"./vendors/xml2js.min.js"` de la liste `scripts` (garder jszip temporairement si pas encore migrée)               |           |      |
| TASK-015 | Supprimer le fichier `vendors/xml2js.min.js` (10878 lignes, 462KB)                                                                                           |           |      |
| TASK-016 | Mettre à jour `documentation/strategie-tests.md` : remplacer les sections expliquant le shim xml2js vendor par la nouvelle approche import npm + `vi.mock()` |           |      |

### Phase 5 : Validation finale

- GOAL-005 : Confirmer que build, tests et lint passent intégralement

| Task     | Description                                                                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-017 | `pnpm run build` — le bundle se génère sans erreur et contient `parseStringPromise`                               |           |      |
| TASK-018 | `pnpm test` — tous les tests passent (1500+ tests)                                                                |           |      |
| TASK-019 | `pnpm fmt:check` et `pnpm exec eslint module/ tests/` — aucune violation                                          |           |      |
| TASK-020 | Vérifer taille bundle : `wc -c dist/swerpg.bundle.js` — documenter la diff avant/après (attendue : +50-100KB max) |           |      |

## 3. Alternatives

- **ALT-001** : Utiliser `fast-xml-parser` au lieu de xml2js — plus léger, ESM natif, pas de soucis CommonJS. Non retenu car cela changerait les résultats de parsing (structure JSON différente) et nécessiterait d'adapter tous les mappers OggDude.
- **ALT-002** : Garder le vendor mais le re-exporter comme module ESM — non retenu car ne résout pas le problème d'auditabilité npm et maintient la dette technique.
- **ALT-003** : Charger xml2js via CDN ESM (esm.sh) — non retenu car nécessite réseau et casse le mode offline Foundry VTT.

## 4. Dependencies

- **DEP-001** : `xml2js` npm package (^0.6.0 ou dernière stable) — à ajouter en `dependencies`
- **DEP-002** : `@rollup/plugin-node-resolve` (^16.0.3) — déjà en devDependencies
- **DEP-003** : `@rollup/plugin-commonjs` (^28.0.7) — déjà en devDependencies
- **DEP-004** : Issue parent : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442

## 5. Files

### Fichiers modifiés

- **FILE-001** : `package.json` — ajout `xml2js` en dependencies
- **FILE-002** : `rollup.config.mjs` — activation plugins node-resolve + commonjs
- **FILE-003** : `module/utils/xml/parser.mjs` — refactoring import xml2js npm
- **FILE-004** : `system.json` — suppression entrée vendor xml2js dans scripts
- **FILE-005** : `tests/importer/obligation-import.integration.spec.mjs` — suppression shim vendor
- **FILE-006** : `tests/importer/oggdude-performance.spec.mjs` — suppression shim vendor
- **FILE-007** : `tests/integration/species-import.integration.spec.mjs` — suppression shim vendor
- **FILE-008** : `tests/importer/preview-ui.spec.mjs` — migration vers vi.mock
- **FILE-009** : `tests/unit/oggdude-data-element.unit.spec.mjs` — migration vers vi.mock
- **FILE-010** : `documentation/strategie-tests.md` — mise à jour section mocking

### Fichiers supprimés

- **FILE-011** : `vendors/xml2js.min.js` — fichier vendor à supprimer (462KB)

## 6. Testing

- **TEST-001** : Tests d'intégration existants (`obligation-import`, `species-import`, `oggdude-performance`) doivent passer avec xml2js npm au lieu du vendor
- **TEST-002** : Test unitaire `oggdude-data-element.unit.spec.mjs` — vérifie que `parseXmlToJson` et `buildJsonDataFromFile` fonctionnent avec mock vi.mock
- **TEST-003** : Test preview-ui — vérifie que le parser gère correctement les XML armes avec mock
- **TEST-004** : Validation build — `dist/swerpg.bundle.js` contient le code xml2js bundlé
- **TEST-005** : (optionnel) Test E2E smoke si disponible — importer un ZIP OggDude et vérifier aucune erreur `parseStringPromise is not a function`

## 7. Risks & Assumptions

- **RISK-001** : xml2js CommonJS peut ne pas se bundler correctement avec Rollup → Mitigation : `@rollup/plugin-commonjs` est spécifiquement conçu pour ça, et est déjà en devDep
- **RISK-002** : La taille du bundle augmente de 50-150KB → Impact faible, le vendor faisait déjà 462KB à charger de toute façon
- **RISK-003** : Les tests d'intégration qui utilisent le vrai xml2js (pas un mock) dépendront de la résolution npm Vitest → Vitest résout nativement les packages node_modules
- **ASSUMPTION-001** : Le package npm `xml2js` expose `parseStringPromise` avec la même signature et les mêmes options que le vendor actuel
- **ASSUMPTION-002** : Rollup avec `inlineDynamicImports: true` gère correctement l'inclusion de xml2js dans le bundle unique
- **ASSUMPTION-003** : Aucun autre fichier source que `module/utils/xml/parser.mjs` n'accède directement à `globalThis.xml2js`

## 8. Related Specifications / Further Reading

- [Issue #442 — Migration vendors xml2js et jszip vers dépendances npm](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442)
- [Plan global — plan-vendorNpmMigration.prompt.md](../plan-vendorNpmMigration.prompt.md)
- [Documentation stratégie tests](../../strategie-tests.md)
- [xml2js npm](https://www.npmjs.com/package/xml2js)
- [@rollup/plugin-commonjs](https://github.com/rollup/plugins/tree/master/packages/commonjs)

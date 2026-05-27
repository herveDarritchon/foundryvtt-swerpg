# Introduction

Remplacer le parsing XML du projet par `fast-xml-parser`, une librairie moderne (v4+), activement maintenue, ESM-native, browser-compatible, et performante. Ce plan couvre deux volets :

1. **Suppression de `module/utils/xml2json.js`** — code mort legacy (230 lignes, jamais importé), source de 30+ warnings ESLint, sous licence LGPL problématique
2. **Remplacement de `xml2js` par `fast-xml-parser`** dans le parser actif (`module/utils/xml/parser.mjs`) — simplification du bundle, élimination des polyfills Node (`events`, `timers`), et gain de performance

**Issue source** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442

## Analyse du composant actuel `xml2json.js`

### Problèmes identifiés (code review)

| #   | Problème                                                                         | Gravité  |
| --- | -------------------------------------------------------------------------------- | -------- |
| 1   | **Code mort** — `xml2json_translator()` n'est importé nulle part dans le projet  | Critique |
| 2   | **`require('libxml')`** dans `parseXml()` — CommonJS + dépendance inexistante    | Critique |
| 3   | **`alert()` pour signaler les erreurs** — inacceptable en production             | Haute    |
| 4   | **`var` au lieu de `const`/`let`** — 10+ occurrences                             | Moyenne  |
| 5   | **`==` au lieu de `===`** — comparaisons loosely-typed                           | Moyenne  |
| 6   | **Manipulation DOM directe** (`removeWhite`, `removeChild`) — mutations en place | Haute    |
| 7   | **Échappement JSON artisanal** — réinvente `JSON.stringify` mal                  | Haute    |
| 8   | **Licence LGPL** — contrainte de licence dans un projet MIT                      | Moyenne  |
| 9   | **Format dual** : export ESM + `module.exports` en fin de fichier                | Moyenne  |
| 10  | **30 warnings ESLint** documentés dans l'audit de dette technique                | Haute    |

### Conclusion : à supprimer entièrement

Le fichier est du **dead code**. Le parsing XML actif passe par `module/utils/xml/parser.mjs` qui utilise `xml2js` (npm). Aucun consommateur de `xml2json_translator()` n'existe.

## Analyse de `xml2js` (parser actuellement actif)

Le fichier `module/utils/xml/parser.mjs` utilise `xml2js` avec les options :

```js
{ explicitArray: false, trim: true, mergeAttrs: true }
```

### Problèmes connus avec xml2js dans ce projet

| #   | Problème                                                                                                                | Impact                        |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Package **CommonJS** — nécessite `@rollup/plugin-commonjs` pour le bundling                                             | Build complexity              |
| 2   | Dépend de **`events`** et **`timers`** (Node built-ins) — a nécessité polyfill `events` npm + stub `timers` dans Rollup | Bundle +50KB, config complexe |
| 3   | **Maintenance réduite** depuis 2023                                                                                     | Supply chain risk             |
| 4   | Bundle résultant inclut EventEmitter et setImmediate inutiles pour du simple parsing XML                                | Poids mort                    |

## Pourquoi `fast-xml-parser` ?

| Critère                                       | xml2js                  | fast-xml-parser                         |
| --------------------------------------------- | ----------------------- | --------------------------------------- |
| Format module                                 | CommonJS uniquement     | ESM + CJS dual                          |
| Dépendances Node built-ins                    | `events`, `timers`      | **Aucune**                              |
| Polyfills browser nécessaires                 | Oui (2)                 | **Non**                                 |
| Performance (benchmarks)                      | ~20 ops/s sur 100KB XML | **~200 ops/s**                          |
| Maintenance                                   | Réduite depuis 2023     | Active (mai 2026)                       |
| Bundle size (minifié)                         | ~60KB + polyfills       | **~30KB** standalone                    |
| Options `explicitArray`, `trim`, `mergeAttrs` | ✅                      | ✅ (noms différents)                    |
| API async                                     | `parseStringPromise`    | `XMLParser.parse()` (sync, plus rapide) |
| Validation XML                                | Non                     | ✅ `XMLValidator.validate()`            |
| Builder JSON→XML                              | Non                     | ✅ `XMLBuilder`                         |

## Mapping des options xml2js → fast-xml-parser

| Option xml2js          | Valeur actuelle                                   | Équivalent fast-xml-parser                            |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `explicitArray: false` | Ne pas wrapper les éléments uniques dans un array | `isArray: () => false` (par défaut)                   |
| `trim: true`           | Trimmer les valeurs texte                         | `trimValues: true`                                    |
| `mergeAttrs: true`     | Fusionner les attributs avec les éléments enfants | `ignoreAttributes: false` + `attributeNamePrefix: ""` |

## 1. Requirements & Constraints

- **REQ-001** : `parseXmlToJson(data)` doit produire la **même structure JSON** qu'actuellement pour les fichiers OggDude XML
- **REQ-002** : fast-xml-parser doit être bundlé dans `dist/swerpg.bundle.js` sans polyfills Node supplémentaires
- **REQ-003** : Les 1500+ tests Vitest doivent passer sans modification des assertions (sauf si structure JSON change)
- **REQ-004** : Les tests d'intégration OggDude (obligation, species, gear, specialization-tree) servent de **test de non-régression**
- **REQ-005** : Supprimer `xml2json.js` (dead code)
- **CON-001** : fast-xml-parser est ESM — pas besoin de `@rollup/plugin-commonjs` pour ce package
- **CON-002** : fast-xml-parser n'utilise **aucun** built-in Node — pas de polyfill
- **CON-003** : L'API est **synchrone** (`parser.parse(xmlString)`)
- **GUD-001** : Profiter de la migration pour supprimer le polyfill `events` et le stub `timers` de Rollup si xml2js est le seul consommateur
- **GUD-002** : Ajouter `XMLValidator.validate()` en mode debug pour détecter les XML malformés

## 2. Implementation Steps

### Phase 1 : Installation et configuration

- GOAL-001 : Ajouter fast-xml-parser et préparer les options équivalentes

| Task     | Description                                                                | Completed | Date |
| -------- | -------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Exécuter `pnpm add fast-xml-parser` pour ajouter en `dependencies`         |           |      |
| TASK-002 | Créer `module/utils/xml/xml-parser-options.mjs` avec les options mappées   |           |      |
| TASK-003 | Valider que `pnpm run rollup` bundle sans erreur ni bare specifier externe |           |      |

### Phase 2 : Remplacement du parser de production

- GOAL-002 : Remplacer xml2js par fast-xml-parser dans `module/utils/xml/parser.mjs`

| Task     | Description                                                                                                                                          | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-004 | Refactorer `module/utils/xml/parser.mjs` : remplacer `import { parseStringPromise } from 'xml2js'` par `import { XMLParser } from 'fast-xml-parser'` |           |      |
| TASK-005 | Conserver l'API publique `parseXmlToJson(data)` identique (async pour compatibilité, retourne `Promise.resolve(result)`)                             |           |      |
| TASK-006 | Ajouter validation XML optionnelle en mode debug : `XMLValidator.validate(data)` avec log si invalide                                                |           |      |

### Phase 3 : Validation de la structure JSON (non-régression)

- GOAL-003 : Vérifier que la structure JSON produite est compatible avec les mappers OggDude

| Task     | Description                                                                                                      | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-007 | Exécuter les tests d'intégration OggDude (obligation, species, gear, specialization-tree)                        |           |      |
| TASK-008 | Si échecs : ajuster les options fast-xml-parser pour matcher la structure attendue (arrays, attributs, trimming) |           |      |
| TASK-009 | Exécuter `pnpm test` complet — identifier et corriger toute divergence                                           |           |      |
| TASK-010 | Documenter les éventuelles différences de structure et les adaptations appliquées                                |           |      |

### Phase 4 : Suppression de xml2js et nettoyage

- GOAL-004 : Supprimer xml2js, ses polyfills, et le dead code xml2json.js

| Task     | Description                                                                                                                 | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-011 | `pnpm remove xml2js`                                                                                                        |           |      |
| TASK-012 | Vérifier si `events` a d'autres consommateurs (`grep -r "from 'events'" module/`) — si non → `pnpm remove events`           |           |      |
| TASK-013 | Supprimer le stub `timersBrowserStub` dans `rollup.config.mjs` si `timers` n'a plus de consommateur                         |           |      |
| TASK-014 | Supprimer `module/utils/xml2json.js` (dead code, 230 lignes, 30 warnings ESLint, licence LGPL)                              |           |      |
| TASK-015 | Adapter les mocks de test qui mockaient `xml2js` → `vi.mock('fast-xml-parser', ...)` (`tests/importer/preview-ui.spec.mjs`) |           |      |
| TASK-016 | Adapter `tests/unit/oggdude-data-element.unit.spec.mjs` : mock `vi.mock('xml2js')` → `vi.mock('fast-xml-parser')`           |           |      |

### Phase 5 : Validation complète et E2E

- GOAL-005 : Confirmer que tout fonctionne end-to-end

| Task     | Description                                                                                               | Completed                                                             | Date |
| -------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---- | --- |
| TASK-017 | `pnpm run build` — bundle sans erreur                                                                     |                                                                       |      |
| TASK-018 | `head -c 1000 dist/swerpg.bundle.js                                                                       | grep "^import"` — aucun bare specifier (`events`, `timers`, `stream`) |      |     |
| TASK-019 | `pnpm test` — tous les tests passent                                                                      |                                                                       |      |
| TASK-020 | Redémarrer instances Foundry (leçon post-mortem xml2js P3) puis `pnpm e2e:regression` et `pnpm e2e:smoke` |                                                                       |      |
| TASK-021 | Documenter taille bundle avant/après : attendue **réduction** ~80-100KB                                   |                                                                       |      |
| TASK-022 | `pnpm fmt:check` et `pnpm exec eslint module/ tests/` — aucune violation                                  |                                                                       |      |

## 3. Alternatives

- **ALT-001** : Garder xml2js et juste supprimer xml2json.js — non retenu car xml2js impose des polyfills Node inutiles
- **ALT-002** : Utiliser `DOMParser` natif — non retenu car pas disponible en Vitest sans jsdom
- **ALT-003** : Utiliser `xml-js` — non retenu car moins maintenu que fast-xml-parser
- **ALT-004** : Écrire un parser custom — non retenu car xml2json.js actuel prouve que c'est une mauvaise idée

## 4. Dependencies

- **DEP-001** : `fast-xml-parser` (^4.x) — à **ajouter** en dependencies
- **DEP-002** : `xml2js` (^0.6.2) — à **supprimer**
- **DEP-003** : `events` (^3.3.0) — à **supprimer** si pas d'autre consommateur
- **DEP-004** : Stub `timers` dans rollup.config.mjs — à **supprimer** si pas d'autre consommateur

## 5. Files

### Fichiers modifiés

- **FILE-001** : `package.json` — ajouter fast-xml-parser, supprimer xml2js et events
- **FILE-002** : `module/utils/xml/parser.mjs` — remplacer xml2js par fast-xml-parser
- **FILE-003** : `rollup.config.mjs` — supprimer timersBrowserStub
- **FILE-004** : `tests/importer/preview-ui.spec.mjs` — adapter mock
- **FILE-005** : `tests/unit/oggdude-data-element.unit.spec.mjs` — adapter mock

### Fichiers créés

- **FILE-006** : `module/utils/xml/xml-parser-options.mjs` — configuration centralisée

### Fichiers supprimés

- **FILE-007** : `module/utils/xml2json.js` — dead code legacy

## 6. Testing

- **TEST-001** : Tests d'intégration OggDude (obligation, species, gear, specialization-tree) — validation structure JSON
- **TEST-002** : Test unitaire parser — `parseXmlToJson('<Root><A>1</A></Root>')` → `{ Root: { A: '1' } }`
- **TEST-003** : Test de performance parsing (75k weapons XML en <4s)
- **TEST-004** : Validation bundle — pas de bare specifiers, pas de polyfills résiduels
- **TEST-005** : E2E regression + smoke après restart Foundry

## 7. Risks & Assumptions

- **RISK-001** : Structure JSON produite diffère sur des cas edge (arrays, attributs) → Mitigation : tests intégration comme filet + ajustement options
- **RISK-002** : Mappers OggDude dépendent d'un comportement spécifique xml2js (`explicitArray: false`) → Phase 3 dédiée
- **RISK-003** : API sync vs async — différence conceptuelle → Wrapper async conservé
- **ASSUMPTION-001** : `events` et stub `timers` ne servent QU'à xml2js — à vérifier par grep
- **ASSUMPTION-002** : fast-xml-parser v4+ est stable
- **ASSUMPTION-003** : Le parsing sync ne bloque pas l'UI car appelé dans un flux async OggDude

## 8. Bénéfices attendus

| Métrique                 | Avant (xml2js + xml2json.js)              | Après (fast-xml-parser)   |
| ------------------------ | ----------------------------------------- | ------------------------- |
| Bundle size              | ~60KB xml2js + ~20KB events + stub timers | **~30KB** fast-xml-parser |
| Polyfills Rollup         | 2 (events npm + timers stub)              | **0**                     |
| Fichiers legacy          | 1 (xml2json.js, 230 lignes, 30 warnings)  | **0**                     |
| ESLint warnings          | 30+                                       | **0**                     |
| Performance parsing      | ~20 ops/s (async, EventEmitter)           | **~200 ops/s** (sync)     |
| Complexité rollup.config | Plugin timersBrowserStub custom           | **Supprimé**              |
| Dependencies             | xml2js + events (2 packages)              | **1 package, 0 deps**     |

## 9. Related Specifications / Further Reading

- [Issue #442 — Migration vendors](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/442)
- [Audit ESLint dette technique](../../audit/audit-eslint-dette-technique-front-js.md)
- [Rapport post-migration xml2js](../../audit/rapport-post-migration-xml2js-vendor-npm.md)
- [fast-xml-parser npm](https://www.npmjs.com/package/fast-xml-parser)
- [fast-xml-parser options v4](https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md)

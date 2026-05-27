# Plan: Migration vendors vers dépendances npm

**TL;DR** : Migrer `xml2js.min.js` et `jszip.min.js` vers des imports npm ESM, supprimer les scripts vendorisés du
`system.json`, et adapter le code/tests pour utiliser les modules npm directement. L'approche recommandée est l'**import
dynamique ESM** avec bundling Rollup pour le code de production.

## État actuel

| Librairie | Fichier vendor          | Dans package.json           | Méthode d'accès                             |
| --------- | ----------------------- | --------------------------- | ------------------------------------------- |
| JSZip     | `vendors/jszip.min.js`  | ✅ `jszip@^3.10.1` (devDep) | `globalThis.JSZip` ou `import('jszip')`     |
| xml2js    | `vendors/xml2js.min.js` | ❌ Non présent              | `globalThis.xml2js.js.parseStringPromise()` |

**Problème clé** : Le vendor `xml2js.min.js` expose une structure non-standard `{ js: { parseStringPromise } }` vs le
package npm qui expose `parseStringPromise` directement.

## Analyse détaillée

### Utilisation de JSZip

**Fichiers concernés** :

- `module/importer/oggDude.mjs:610-615` — Fallback `globalThis.JSZip` puis import dynamique npm
- `system.json:40` — Charge vendor script
- `tests/importer/preview-ui.spec.mjs:23` — Mock via `globalThis.JSZip`
- `package.json:73` — Déjà en devDep

**Constat** : JSZip est déjà partiellement migrée (ligne 614 utilise `import('jszip')`), mais le fallback sur
`globalThis.JSZip` maintient la dépendance au vendor. JSZip est disponible comme npm.

### Utilisation de xml2js

**Fichiers concernés** :

- `module/utils/xml/parser.mjs:13-35` — Accès `globalThis.xml2js?.js.parseStringPromise()`
- `system.json:40` — Charge vendor script
- **Tests (6 fichiers)** :
  - `tests/importer/obligation-import.integration.spec.mjs:3-10`
  - `tests/importer/oggdude-performance.spec.mjs:3-6`
  - `tests/integration/species-import.integration.spec.mjs:4-7`
  - `tests/importer/preview-ui.spec.mjs:27-38`
  - `tests/unit/oggdude-data-element.unit.spec.mjs:78-80, 113`
  - Exemples dans `documentation/strategie-tests.md`
- `package.json` — **Absent** (non en dépendance)

**Constat** : xml2js n'existe ni en dépendance npm ni en import ESM — 100% vendorisée. La structure exposée (
`{ js: { parseStringPromise } }`) doit être réconciliée avec l'API npm standard.

## Plan de migration

### Phase 1 : Préparation et Validations

- [ ] **DEP-001** : Ajouter `xml2js` à `package.json` en dependencies (esm-compatible ou via CommonJS + Rollup plugin)
  - Exécuter : `pnpm add xml2js`
  - Vérifier version compatible : `xml2js@^0.6.0` (dernière stable)
  - Tester import : `import xml2js from 'xml2js'`

- [ ] **DEP-002** : Promouvoir `jszip` de devDep à dependencies dans `package.json`
  - Modifier `package.json:73` : `"jszip": "^3.10.1"` en dépendance commune

- [ ] **DEP-003** : Configurer Rollup pour bundler CommonJS + ESM
  - Mise à jour `rollup.config.mjs` : Ajouter `@rollup/plugin-node-resolve` si absent
  - Ajouter `@rollup/plugin-commonjs` pour xml2js (CommonJS)
  - Vérifier bundle final : `dist/swerpg.bundle.js` contient xml2js + jszip

- [ ] **DEP-004** : Créer wrapper d'import avec fallback gracieux
  - Fichier : `module/utils/xml2js-loader.mjs` (nouveau)
  - Exporte fonction `getXml2jsParser()` avec :
    - Tentative import ESM npm `xml2js`
    - Fallback vers vendor `vendors/xml2js.min.js` (si présent transitoirement)
    - Throw error lisible si aucune source disponible
  - API: retourne `{ parseStringPromise }` (normalise l'interface)

### Phase 2 : Code de production

- [ ] **PROD-001** : Refactorer `module/utils/xml/parser.mjs`
  - Remplacer `globalThis.xml2js?.js` par `getXml2jsParser()` du wrapper
  - Simplifier logique : plus de check vendor global
  - Tester compatibilité: `parseXmlToJson('<test/>')` doit fonctionner

- [ ] **PROD-002** : Mettre à jour `module/importer/oggDude.mjs`
  - Supprimer logique `globalThis.JSZip` (ligne 610-611)
  - Garder import dynamique npm `import('jszip')` comme seule source (ligne 614)
  - Tester: `OggDudeImporter.load(file)` sans stub global

- [ ] **PROD-003** : Vérifier absence d'autres références `globalThis.xml2js` ou `globalThis.JSZip`
  - Recherche : `grep -r "globalThis.JSZip" module/`
  - Recherche : `grep -r "globalThis.xml2js" module/`
  - Nettoyer si trouvé

### Phase 3 : Tests

- [ ] **TEST-001** : Mettre à jour 6 fichiers test pour mocker npm imports
  - Pattern : Remplacer `import xml2jsModule from '../../vendors/xml2js.min.js'` +
    `globalThis.xml2js = { js: xml2jsModule }`
  - Par : `vi.mock('xml2js', { default: { js: { parseStringPromise: vi.fn() } } })`
  - Fichiers :
    - `tests/importer/obligation-import.integration.spec.mjs`
    - `tests/importer/oggdude-performance.spec.mjs`
    - `tests/integration/species-import.integration.spec.mjs`
    - `tests/importer/preview-ui.spec.mjs` (adapter stub JSZip)
    - `tests/unit/oggdude-data-element.unit.spec.mjs`
  - Tests concernant `parseStringPromise` undefined : adapter pour mock

- [ ] **TEST-002** : Valider que Vitest résout `import('xml2js')` et `import('jszip')`
  - Ajouter config Vitest alias ou vérifier `@rollup/plugin-node-resolve` dans setupFiles si nécessaire
  - Tester : `pnpm test` doit passer sans warnings

- [ ] **TEST-003** : Tests E2E — Vérifier import OggDude en Foundry VTT
  - Lance Foundry sandbox (port 30000 ou 31001 selon config)
  - Charge system swerpg
  - Vérifie bundle contient xml2js + jszip minifiés
  - Upload ZIP OggDude test → Importe weapons → Vérifie aucune erreur `parseStringPromise is not a function`

### Phase 4 : Nettoyage

- [ ] **CLEAN-001** : Supprimer vendor scripts du `system.json`
  - Modifier `system.json:40` : Supprimer `"scripts": ["./vendors/jszip.min.js", "./vendors/xml2js.min.js"],`

- [ ] **CLEAN-002** : Supprimer dossier `vendors/`
  - `rm -rf vendors/`

- [ ] **CLEAN-003** : Mettre à jour documentation
  - Supprimer section "Mocking des Librairies Externes (JSZip et xml2js)" dans `documentation/strategie-tests.md`
  - Ajouter section "Import npm et bundling Rollup" expliquant nouvelle approche
  - Ajouter comment configurer mocks dans tests : `vi.mock('xml2js', { ... })`

- [ ] **CLEAN-004** : Nettoyer tâches de build si nécessaire
  - Vérifier `build.mjs` n'utilise pas vendors
  - Vérifier `gulpfile.mjs` n'utilise pas vendors

### Phase 5 : Validation finale

- [ ] **VALID-001** : Build complet
  - Exécuter `pnpm build`
  - Vérifier bundle `dist/swerpg.bundle.js` contient `parseStringPromise` et `loadAsync`
  - Pas d'erreurs minification

- [ ] **VALID-002** : Tests complets
  - `pnpm test` — Tous les tests passent
  - `pnpm test:coverage` — Coverage stable ou améliorée

- [ ] **VALID-003** : Lint + Format
  - `pnpm fmt:check` — Pas de violations
  - `pnpm run lint` — Pas d'erreurs

- [ ] **VALID-004** : E2E Smoke
  - `pnpm e2e:smoke` — Interface UI respond, pas d'erreurs console
  - Vérifier importer OggDude continue de fonctionner

- [ ] **VALID-005** : Documentation
  - `documentation/strategie-tests.md` à jour et reflète migration
  - Exemples de mock dans documentation correspondent nouvelle approche

## Fichiers clés affectés

### Production

- `module/utils/xml/parser.mjs` — Remplacer accès globalThis par import wrapper
- `module/importer/oggDude.mjs` — Supprimer fallback globalThis.JSZip
- `module/utils/xml2js-loader.mjs` — **Nouveau** : wrapper d'import
- `rollup.config.mjs` — Ajouter plugins CommonJS et node-resolve si absent
- `system.json` — Supprimer section `scripts`

### Tests

- `tests/importer/obligation-import.integration.spec.mjs` — Mock via `vi.mock()`
- `tests/importer/oggdude-performance.spec.mjs` — Mock via `vi.mock()`
- `tests/integration/species-import.integration.spec.mjs` — Mock via `vi.mock()`
- `tests/importer/preview-ui.spec.mjs` — Mock JSZip + xml2js
- `tests/unit/oggdude-data-element.unit.spec.mjs` — Mock xml2js
- Tests de validation: `globalThis.xml2js` et `globalThis.JSZip` absence

### Chantiers

- `package.json` — Ajouter `xml2js`, promouvoir `jszip` en dependency
- `documentation/strategie-tests.md` — Mettre à jour section mocking
- `vendors/` — **Supprimer** complètement

## Bénéfices attendus

1. ✅ **Déduplication** — Plus de fichiers minifi es vendorisés. Version unique npm/Rollup
2. ✅ **Maintenabilité** — xml2js en `package.json` apparaît dans audit/security scans
3. ✅ **Build propre** — Rollup gère dépendances, pas de scripts manuels Foundry
4. ✅ **Tests simplifiés** — Mock npm via Vitest `vi.mock()` au lieu de manipuler vendors
5. ✅ **Compatibility** — Reste compatible Foundry VTT v14+, aucun changement API

## Risques et mitigations

| Risque                              | Probabilité | Mitigation                                                                   |
| ----------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| xml2js CommonJS incompatible Rollup | Moyenne     | Tester avec `@rollup/plugin-commonjs`, ou utiliser xml2js ESM fork si besoin |
| Bundle plus volumineux              | Basse       | Minification Rollup compense, `compact: true` déjà actif                     |
| E2E importer échoue post-migration  | Basse       | Tests unitaires validateurs, E2E smoke avant merge                           |
| Configuration Vitest incompatible   | Basse       | Ajouter alias si besoin, vérifier docs plugin-node-resolve                   |

## Approche d'implémentation recommandée

**Stratégie : Progressive avec validation à chaque étape**

1. **Étape 1 (Phase 1-2)** : Ajouter dépendances, créer wrapper, tester immédiatement
2. **Étape 2 (Phase 3)** : Refactorer tests avec mocks, valider build
3. **Étape 3 (Phase 4-5)** : Nettoyer vendors, build final, validation E2E
4. **Rollback gracieux** : Si blocker trouvé, garder fallback vendor jusqu'à résolution

## Complexité estimée

- **Effort** : Medium (5-8h dev + test + validation)
- **Risque** : Low (aucune API utilisateur modifiée, juste internalités)
- **Impact** : High (réduit tech debt, améliore maintenabilité)

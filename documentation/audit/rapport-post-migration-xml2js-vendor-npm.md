# Rapport post-migration : xml2js vendor → npm (2026-05-27)

## Contexte

Migration planifiée issue du plan `documentation/plan/features/plan-migrationXml2jsVendorNpm.prompt.md`.

**Objectif** : Supprimer `vendors/xml2js.min.js` (462 KB, chargé comme script global) et remplacer par une dépendance npm bundlée via Rollup. API publique `parseXmlToJson(data)` inchangée.

**Commit de migration** : `772e2b85`

---

## Résultats de validation initiale (avant correction)

| Suite                       | Résultat                            |
| --------------------------- | ----------------------------------- |
| Vitest (175 fichiers)       | ✅ 2329 passed, 2 skipped, 0 failed |
| E2E regression (port 31001) | ❌ 5/9 failed                       |
| E2E smoke (port 30000)      | ❌ 2/9 failed                       |

---

## Problèmes identifiés

### Problème 1 — Bundle Rollup avec imports externes non résolus pour `events` et `timers`

**Symptôme**

Le bundle `dist/swerpg.bundle.js` débutait par :

```js
import require$$1 from 'events'
import require$$4 from 'timers'
```

Ces bare specifiers sont invalides dans un contexte navigateur. Le browser essaie de résoudre `'events'` comme URL relative → échec avec `TypeError: Failed to resolve module specifier "events"`.

**Cause**

`xml2js` dépend de deux built-ins Node.js :

- `events` → classe `EventEmitter`
- `timers` → fonction `setImmediate`

`@rollup/plugin-node-resolve({ browser: true })` ne peut pas les bundler car les packages npm `events` et `timers` n'étaient pas installés dans `node_modules`. Rollup les a donc laissés comme imports externes dans le bundle ES module.

**Correction**

1. Installation du package npm `events` (polyfill browser-compatible de `EventEmitter`) :

   ```
   pnpm add events
   ```

2. Ajout d'un plugin virtuel inline dans `rollup.config.mjs` pour stubber `timers` avec une implémentation browser :
   ```js
   const timersBrowserStub = {
     name: 'timers-browser-stub',
     resolveId(id) {
       if (id === 'timers') return '\0timers-browser-stub'
     },
     load(id) {
       if (id === '\0timers-browser-stub') {
         return `export const setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);\nexport const clearImmediate = clearTimeout;\n`
       }
     },
   }
   ```

**Validation** : Le bundle ne commence plus par des imports externes. Les 39 occurrences de `EventEmitter` et `setImmediate` sont présentes dans le bundle inliné.

---

### Problème 2 — `system.json` chargeait les sources (`swerpg.mjs`) et non le bundle

**Symptôme**

Tests smoke : erreurs navigateur `Failed to resolve module specifier "xml2js"` ET `vendors/xml2js.min.js` retourne 404.

Tests regression : sheets d'acteur rendus sans contenu custom (pas de `[data-skill-purchase-console]`, pas de `[data-tab="skills"]`, pas de `[data-action="editSpecializationTrees"]`). Settings système absents (bouton "Star Wars Edge RPG" introuvable dans Game Settings).

**Cause**

`system.json` contenait :

```json
"esmodules": ["swerpg.mjs"]
```

Foundry chargeait donc les **fichiers sources** directement dans le navigateur. La chaîne d'imports transitifs atteint `module/utils/xml/parser.mjs` qui contient :

```js
import { parseStringPromise } from 'xml2js'
```

Dans le navigateur, ce bare specifier est invalide. Le module ES entier échoue à s'initialiser silencieusement (l'erreur est capturée et réinitialisée par la fixture `worldReady` dans son `setUp` → `reset()`). Foundry reste fonctionnel (UI core, sidebar, `body.system-swerpg`) car ces éléments viennent du cœur Foundry, pas du système — raison pour laquelle les tests de smoke basiques et les tests de création d'acteur (vérification du conteneur seul) passaient.

Chaîne d'import incriminée :

```
swerpg.mjs
 └── module/applications/settings/settings.js
      └── module/settings/OggDudeDataImporter.mjs
           └── module/importer/oggDude.mjs
                └── module/settings/models/OggDudeDataElement.mjs
                     └── module/utils/xml/parser.mjs
                          └── import { parseStringPromise } from 'xml2js'  ← ÉCHEC
```

**Correction**

Modification de `system.json` pour pointer vers le bundle Rollup :

```json
"esmodules": ["dist/swerpg.bundle.js"]
```

Le bundle contient xml2js inliné (via fix précédent). Le navigateur charge un seul fichier ES module auto-contenu.

**Impact sur le workflow de développement** : run `pnpm run rollup:watch` pour rebuild automatique du bundle lors des modifications de sources.

---

### Problème 3 — Foundry port 30000 cachait l'ancien `system.json` en mémoire serveur

**Symptôme**

Après application des fixes 1 et 2, les tests smoke (port 30000) échouaient encore avec :

- `Refused to execute script from '.../vendors/xml2js.min.js' because its MIME type ('text/html') is not executable`
- `Failed to resolve module specifier "xml2js"`

Les tests regression (port 31001) passaient tous.

**Cause**

Le processus Foundry sur port 30000 avait été démarré le dimanche 21 mai (avant la migration du 27 mai). Foundry parse `system.json` au démarrage du serveur et conserve la liste des scripts/esmodules en mémoire. La symlink `/Library/Application Support/FoundryVTTV14/Data/systems/swerpg` pointait bien vers le projet (fichier à jour), mais le serveur utilisait sa version en mémoire → ancienne liste de scripts avec `vendors/xml2js.min.js`.

**Correction**

Redémarrage du processus Foundry port 30000 (PID 68392) :

```bash
kill 68392
/Users/hervedarritchon/.nvm/versions/node/v24.15.0/bin/node \
  "/Users/hervedarritchon/Workspace/Perso/FoundryVTT/bin/v14/main.js" \
  --dataPath="/Users/hervedarritchon/Library/Application Support/FoundryVTTV14" \
  --port=30000 &
```

**Note** : Ce problème se reproduira à chaque redémarrage volontaire ou crash du serveur local si des changements de `system.json` ont eu lieu entre deux starts. Penser à relancer le serveur après toute modification de `system.json`.

---

### Problème 4 — Disque plein (infrastructure)

**Symptôme**

Test `arbre de spécialisation s'ouvre sans erreur navigateur` échoue avec :

```
IO error: .../actors/001478.log: No space left on device
```

**Cause**

Disque Data macOS à 100% (`434Gi / 460Gi`). Les actors LevelDB ne peuvent plus être écrits. Accumulé par la combinaison de plusieurs runs E2E dont les teardowns avaient échoué (les acteurs de test n'avaient pas été supprimés → monde pollué → LevelDB croissant).

**Correction**

Libération de 8.7 GB via suppression du cache JetBrains :

```bash
rm -rf ~/Library/Caches/JetBrains/
```

---

## Résultats finaux après corrections

| Suite                       | Avant      | Après      |
| --------------------------- | ---------- | ---------- |
| Vitest (175 fichiers)       | ✅ 175/175 | ✅ 175/175 |
| E2E regression (port 31001) | ❌ 4/9     | ✅ 9/9     |
| E2E smoke (port 30000)      | ❌ 7/9     | ✅ 9/9     |

---

## Fichiers modifiés (post-plan)

| Fichier             | Modification                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `rollup.config.mjs` | Plugin virtuel `timersBrowserStub` + plugin en premier dans la liste |
| `package.json`      | `dependencies.events: "3.3.0"` ajouté                                |
| `system.json`       | `esmodules: ["dist/swerpg.bundle.js"]` (était `"swerpg.mjs"`)        |

---

## Recommandations

### Pour le workflow de développement

Le passage à `esmodules: ["dist/swerpg.bundle.js"]` implique que les modifications de sources ne sont plus visibles en live dans Foundry sans rebuild. Utiliser :

```bash
pnpm run rollup:watch   # rebuild auto sur changement source
```

### Pour les prochaines migrations de packages Node.js

Avant d'intégrer un nouveau package npm dans le bundle :

1. Vérifier qu'il n'utilise pas de built-ins Node.js (`events`, `timers`, `path`, `fs`, etc.)
2. Si oui : installer le polyfill npm correspondant **ou** ajouter un stub dans `rollup.config.mjs`
3. Vérifier que le bundle final ne commence pas par `import from '<bare-specifier>'`

Commande de vérification rapide :

```bash
head -c 500 dist/swerpg.bundle.js | grep "^import"
```

Si output non vide → des dépendances externes non résolues existent dans le bundle.

### Pour les instances Foundry locales

Après toute modification de `system.json` : redémarrer les instances Foundry locales pour que le nouveau manifeste soit pris en compte en mémoire serveur.

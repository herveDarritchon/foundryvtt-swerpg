---
description: "Mémoire domaine Importer OggDude & Observabilité"
applyTo: "module/importer/**/*.mjs, tests/importer/**/*.mjs"
---
# Importer Memory
Maîtriser l'import OggDude: instrumentation, tests robustes, shims fiables, performance déterministe.

## Ré-export des utilitaires de stats
Expose toujours `get*ImportStats` et `reset*ImportStats` depuis le module mapper (ex: `weapon-ogg-dude.mjs`) afin que les tests d'intégration importent un seul point d'entrée. Évite les imports directs dispersés vers `utils/*-import-utils.mjs` qui fragilisent les refactors.

## Signature Mock JSZip minimale
Pour tests hors navigateur, le mock doit fournir la forme: `fakeZip.files[path].async('text')`. Implémenter une seule méthode `async(type)` retournant le contenu attendu pour `type === 'text'`. Ne pas utiliser une méthode nommée `text()` séparée.

```js
const fakeZip = { files: { 'Data/Weapons.xml': { async async(t){ if(t==='text') return xml } } } }
```

## Shim xml2js en environnement Vitest
Avant parsing XML, définir `globalThis.xml2js = { js: xml2jsModule }` où `xml2jsModule` expose `parseStringPromise`. Le parser vérifie explicitement cette fonction. Ne pas multiplier les shims; un seul bloc en tête du test suffit.

## Génération de gros XML pour performance
Utiliser concaténation de fragments dans un tableau puis `join('')` pour éviter coûts O(n^2). Calibrer taille via bytes moyen par entrée * count. Mesurer via `performance.now()` et fixer un seuil stable (ex: 4000ms) documenté.

```js
function buildLargeXml(count){
  const parts = ['<Weapons>']
  for(let i=0;i<count;i++) parts.push(`<Weapon><Key>W${i}</Key><Name>Weapon ${i}</Name><SkillKey>RANGLT</SkillKey><Damage>5</Damage><Crit>3</Crit><RangeValue>wrShort</RangeValue></Weapon>`)
  parts.push('</Weapons>')
  return parts.join('')
}
```

## Instrumentation des imports
Encapsuler durée globale et par domaine avec couples `recordDomainStart('weapon')` / `recordDomainEnd('weapon')` et `markGlobalStart()` / `markGlobalEnd()`. L'agrégateur calcule: `overallDurationMs`, `itemsPerSecond`, `errorRate`, `archiveSizeBytes`, `domainDurations`. Garantir que `markArchiveSize(bytes)` est appelé juste après chargement du zip.

## Forme de stats domaine
Uniformiser structure retournée: `{ total, rejected, imported, unknownSkills?, unknownQualities?, skillDetails?, qualityDetails? }`. Toujours calculer `imported = total - rejected` dans le getter pour cohérence (pas incrément dédié).

## Bruit de logs contrôlé
Les tests d'intégration peuvent générer des warnings inconnus (skills/qualities). Conserver logs (validation) mais éviter `console.error` pour cas non bloquants; utiliser `logger.warn` catégorisé.

## Sécurité basique getElementsFrom
Valider nom de fichier: rejeter `..`, slash et backslash avant accès zip. Retourner `undefined` plutôt qu'exception pour tests sécurité simples.

## Performance: éviter parse multiple
Une seule conversion XML→JSON par fichier; si besoin de variantes, extraire sous-structures via `foundry.utils.getProperty` sans re-parser.

## Test de réinitialisation stats
Avant chaque test d'intégration multi-items, appeler `reset*ImportStats()` puis valider `stats.total === sample.length` et `stats.imported === mapped.length`. Empêche fuite de comptage entre tests.

## Handlebars & Foundry template gotchas
Foundry's Handlebars environment (V13) is restrictive compared to full Handlebars runtimes. Capture these recurring patterns to avoid runtime errors in UI templates:

- Préférer l'accès direct aux propriétés du context plutôt que d'utiliser des helpers non standard ou multi-argument (ex: `lookup` multi-arg). Exemple sûr : `{{importMetrics.domains.weapon.durationMs}}` au lieu de `{{lookup importMetrics.domains "weapon" "durationMs"}}`.
- Éviter les références implicites à `this.` dans les templates qui sont source d'incohérences; utiliser les clés exposées explicitement par `_prepareContext()`.
- Pour des valeurs dynamiques non triviales, préparez-les dans `_prepareContext()` (ou dans le contexte JavaScript) plutôt que d'essayer de résoudre des chemins dynamiques via des helpers.

Ces règles évitent erreurs du type `c.lookupProperty is not a function` observées en runtime.

## Mapper: responsabilité des statistiques
Les modules de mapping (`*-ogg-dude.mjs`) sont responsables d'initialiser et d'incrémenter leurs propres compteurs d'import:

- Appeler `reset*ImportStats()` au début d'une session de mapping (comme `weaponMapper` le fait). Cela garantit que les statistiques ne fuient pas entre appels et simplifie les tests.
- Incrémenter `increment*ImportStat('total')` pour chaque élément traité, et `increment*ImportStat('rejected')` quand un élément est rejeté par la validation stricte.
- Exposer depuis le module mapper les utilitaires `get*ImportStats` et `reset*ImportStats` (ré-export depuis `utils/*-import-utils.mjs`) pour fournir un point d'entrée unique aux tests et à l'agrégateur global.

Exemple minimal dans un mapper:

```js
import { resetSpeciesImportStats, incrementSpeciesImportStat, getSpeciesImportStats } from '../utils/species-import-utils.mjs'

export function speciesMapper(species) {
  resetSpeciesImportStats()
  const mapped = species.map((xml) => {
    incrementSpeciesImportStat('total')
    // mapping ...
    return mappedSpecies
  })
  logger.debug('species stats', getSpeciesImportStats())
  return mapped
}
```

## Tests: assertions et mocks pratiques
Quelques patterns récurrents rencontrés pendant le debugging des TU :

- Ne pas rendre les TU fragiles sur l'ordre des éléments produits par les mappers. Si l'ordre n'est pas contractuel, comparer des tableaux triés ou utiliser des assertions fondées sur `Set`/contient. Exemple : `expect(result.map(r=>r.id).sort()).toEqual(['a','b'].sort())`.
- Mocker `globalThis.SYSTEM` (avec `SKILLS` minimal) en tout début de fichier de test lorsque le code importe des mappers qui lisent `SYSTEM` à l'import time. Le mock doit être défini avant d'importer les modules à tester.
- Pour parser XML en Node/Vitest, shimmer `globalThis.xml2js = { js: xml2jsModule }` une seule fois au début du test d'intégration (le parser interne vérifie `xml2js.js.parseStringPromise`).
- Mock JSZip minimal pour tests hors navigateur : fournir `fakeZip.files[path].async('text')`.
- Toujours appeler `reset*ImportStats()` dans `beforeEach()` pour les tests unitaires/integ multi-items.

## Tests: éviter de modifier le code de production pour faire passer les TU
Règle d'or: corriger les TU (mocks, fixtures, assertions) plutôt que d'adapter la logique métier uniquement pour faire passer un test. Les exceptions doivent être discutées et documentées.

## Exemple de checklist rapide avant soumettre une PR sur l'importer
- Les mappers exposent `get*ImportStats` et `reset*ImportStats`.
- Les mappers appellent `reset*ImportStats()` et incrémentent `total`/`rejected` correctement.
- Les templates Foundry n'utilisent pas de helpers non supportés (multi-arg `lookup`) ni `this.`.
- Les tests mockent `globalThis.SYSTEM` et `xml2js` si nécessaire et appellent `reset*ImportStats()` en `beforeEach`.
- Les assertions des TU ne dépendent pas de l'ordre des collections quand l'ordre n'est pas contractuel.


## Extension future (caching/streaming)
Préparer code pour streaming en gardant buildJsonDataFromFile isolé; introduction future d'un parseur SAX pourra remplacer juste l'étape 6-2 sans affecter mappers.
 
## UI & i18n gotchas — OggDude importer (nouvelle règle)

Lors d'interventions sur l'interface d'importation (ex: fenêtre d'import OggDude), documenter et appliquer systématiquement ces règles :

- Modifier uniquement les sources Less (.less) — ne pas patcher le CSS compilé (`styles/swerpg.css`). Les règles ajoutées dans les fichiers compilés seront écrasées par la chaîne de build et rendent les changements non reproductibles. Toujours ajouter les règles dans le fichier Less le plus spécifique (ex: `styles/applications.less`) et recompiler (`pnpm run less` / `pnpm run build`).

- Scoper les règles CSS sur l'`id` de la fenêtre d'application (`Application.DEFAULT_OPTIONS.id`) pour éviter régressions globales. Exemple :

  .app#swerpgSettings-form .window-content .standard-form { max-height: calc(100vh - 140px); overflow:auto; -webkit-overflow-scrolling:touch; }

- Pour la scrollbar interne, préférer `max-height` + `overflow:auto` sur un conteneur interne plutôt que de modifier le `body` ou la `.window` globale.

- I18n : éviter d'utiliser une même clé comme chaîne et comme objet. Si la template Handlebars référence `SETTINGS.OggDudeDataImporter.loadWindow.preview` comme libellé de bouton ET `SETTINGS.OggDudeDataImporter.loadWindow.preview.title` pour un groupe, vous créez une collision (la clé `preview` ne peut pas être à la fois une string et un objet).

  - Solution recommandée : séparer les usages — utiliser `previewButton` pour le libellé du bouton et garder `preview.*` comme objet pour le panneau de prévisualisation.
  - Toujours parcourir la template `.hbs` à la recherche de chemins i18n ambigus et maintenir la structure JSON dans `lang/*.json` cohérente avec les appels `localize`.

- Processus :
  1. Chercher toutes les occurrences `SETTINGS.OggDudeDataImporter` dans les templates avant d'ajouter des clés dans `lang/*.json`.
  2. Leur ajouter des entrées claires et nominales (`previewButton`, `preview.title`, `preview.filters`, `progress.global`).
  3. Recompiler les assets Less et vérifier en développement que la fenêtre est scrollable et que le bouton affiche le texte attendu.

- Tests & CI : couvrir la présence des clés i18n critiques dans un test d'intégration léger (vérifier `lang/en.json` contient `SETTINGS.OggDudeDataImporter.loadWindow.previewButton` et `progress.global`) pour éviter que des PR cassent l'affichage de l'UI.

- Ces règles viennent d'un cas concret où la fenêtre d'import était plus grande que la hauteur d'écran et le bouton/section de prévisualisation utilisait la même clé i18n, rendant le comportement non déterministe après compilation.

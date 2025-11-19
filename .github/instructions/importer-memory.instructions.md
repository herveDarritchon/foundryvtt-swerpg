---
description: 'Mémoire domaine Importer OggDude & Observabilité'
applyTo: 'module/importer/**/*.mjs, tests/importer/**/*.mjs'
---

# Importer Memory

Maîtriser l'import OggDude: instrumentation, tests robustes, shims fiables, performance déterministe.

## Ré-export des utilitaires de stats

Expose toujours `get*ImportStats` et `reset*ImportStats` depuis le module mapper (ex: `weapon-ogg-dude.mjs`) afin que les tests d'intégration importent un seul point d'entrée. Évite les imports directs dispersés vers `utils/*-import-utils.mjs` qui fragilisent les refactors.

## Signature Mock JSZip minimale

Pour tests hors navigateur, le mock doit fournir la forme: `fakeZip.files[path].async('text')`. Implémenter une seule méthode `async(type)` retournant le contenu attendu pour `type === 'text'`. Ne pas utiliser une méthode nommée `text()` séparée.

```js
const fakeZip = {
  files: {
    'Data/Weapons.xml': {
      async async(t) {
        if (t === 'text') return xml
      },
    },
  },
}
```

## Shim xml2js en environnement Vitest

Avant parsing XML, définir `globalThis.xml2js = { js: xml2jsModule }` où `xml2jsModule` expose `parseStringPromise`. Le parser vérifie explicitement cette fonction. Ne pas multiplier les shims; un seul bloc en tête du test suffit.

## Génération de gros XML pour performance

Utiliser concaténation de fragments dans un tableau puis `join('')` pour éviter coûts O(n^2). Calibrer taille via bytes moyen par entrée \* count. Mesurer via `performance.now()` et fixer un seuil stable (ex: 4000ms) documenté.

```js
function buildLargeXml(count) {
  const parts = ['<Weapons>']
  for (let i = 0; i < count; i++)
    parts.push(
      `<Weapon><Key>W${i}</Key><Name>Weapon ${i}</Name><SkillKey>RANGLT</SkillKey><Damage>5</Damage><Crit>3</Crit><RangeValue>wrShort</RangeValue></Weapon>`,
    )
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

## Architecture de nouveaux domaines d'import

Quand ajouter un nouveau domaine d'import (ex: talent, obligation, force power), suivre systématiquement cette architecture éprouvée :

### Structure de modules obligatoire

- **Context Builder** : `module/importer/items/{domain}-ogg-dude.mjs` — Interface standard compatible avec `OggDudeDataElement.processElements()`
- **Mapper Principal** : `module/importer/mappers/oggdude-{domain}-mapper.mjs` — Logic métier Template Method + Strategy
- **Mappings Spécialisés** : `module/importer/mappings/oggdude-{domain}-{aspect}-map.mjs` — Transformations atomiques (activation, node, rank, etc.)
- **Utilitaires Stats** : `module/importer/utils/{domain}-import-utils.mjs` — Stats + validation uniforme

### Pattern Context Builder

Le context builder doit retourner la structure exacte attendue par l'orchestrateur :

```js
export async function build{Domain}Context(zip, groupByDirectory, groupByType) {
  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, '{Domain}.xml', '{Domains}.{Domain}'),
    zip: { elementFileName: '{Domain}.xml', content: zip, directories: groupByDirectory },
    image: { criteria: 'Data/{Domain}Images', worldPath: '...', systemPath: buildItemImgSystemPath('{domain}.svg'), images: groupByType.image, prefix: '{Domain}' },
    folder: { name: 'Swerpg - {Domains}', type: 'Item' },
    element: { jsonCriteria: '{Domains}.{Domain}', mapper: {domain}Mapper, type: '{domain}' }
  }
}
```

### Pattern Wrapper Mapper

Le mapper individuel (`element.mapper`) doit être un wrapper simple vers le mapper principal :

```js
function {domain}Mapper(oggDudeData) {
  const context = Ogg{Domain}Mapper.buildSingleTalentContext(oggDudeData, {})
  return Ogg{Domain}Mapper.transform(context)
}
```

### Pattern Registry Integration

Enregistrer le nouveau domaine dans les deux `buildContextMap` de `OggDude.mjs` :

```js
buildContextMap.set('{domain}', { type: '{domain}', contextBuilder: build{Domain}Context })
```

### Pattern Métriques Globales

Étendre `getAllImportStats()` dans `global-import-metrics.mjs` :

```js
import { get{Domain}ImportStats } from './{domain}-import-utils.mjs'
// Dans getAllImportStats():
{domain}: get{Domain}ImportStats()
```

### Pattern Modules de Mapping

Chaque aspect complexe a son module dédié avec pattern uniforme :

- Fonction de transformation principale
- Validation des données transformées
- Fallbacks gracieux pour données manquantes/invalides
- Intégration stats via `increment{Domain}ImportStat()`
- Logging structuré avec contexte

## Weapon Import Mapping – Flags, Fallbacks et Qualités Comptées

Le correctif "weapon" (bug mapping OggDude) introduit des patterns réutilisables pour tout futur domaine avec métadonnées enrichies.

### Fallback déterministe skill/range
Toujours prioriser la clé spécialisée (`RangeValue`, `SkillKey`) puis fallback vers clé générique (`Range`). Si code inconnu en mode non strict : log catégorisé + stats + remplacement par **valeur par défaut stable** (`rangedLight`, `medium`). Évite rejets silencieux et rend les tests prévisibles.

```js
let mappedSkill = WEAPON_SKILL_MAP[skillCode]
if (!mappedSkill) {
  addWeaponUnknownSkill(skillCode || 'UNDEFINED_SKILL')
  mappedSkill = 'rangedLight'
}
```

### Agrégation de qualités avec valeur
Convertir la collection source (tableau ou entrée unique) en **Map (qualité → total)** puis créer un tableau trié `{ id, count }`. Le `Set` dans le schéma reste liste des IDs pour compatibilité existante. Ce double stockage maintient retro-compat et ouvre usages futurs.

```js
const qualityCounts = new Map()
for (const q of qualities) {
  const id = normalizeQualityId(q.Key)
  const count = coerceQualityCount(q.Count)
  if (SYSTEM.WEAPON.QUALITIES[id]) {
    qualityCounts.set(id, (qualityCounts.get(id) || 0) + count)
  } else addWeaponUnknownQuality(q.Key)
}
flags.swerpg.oggdudeQualities = [...qualityCounts].map(([id,count]) => ({ id, count }))
```

### Tags enrichis séparés du schéma
Ne pas modifier le modèle Foundry tant que l’usage gameplay n’est pas défini. Stocker dans `flags.swerpg.oggdudeTags` un tableau d’objets uniformes `{ type, value, label }`. Le sheet (via `getTags()`) fusionne dynamiquement sans casser l’API publique.

### Sanitation description multi-balises
Éliminer les balises propriétaires `[H3]`, `[BR]`, `[color]`, etc., convertir `[BR]` en `\n`, conserver structure paragraphe puis **append** la source. Pattern réutilisable pour d’autres domaines (ex: talents).

```js
description = sanitizeOggDudeWeaponDescription(xml.Description)
if (source.name) description += `\n\nSource: ${source.name}${source.page ? `, p.${source.page}` : ''}`
```

### Boolean parsing robuste
Utiliser une fonction générique (`parseOggDudeBoolean`) pour gérer variations (`true`, `True`, `1`, `yes`). Centraliser pour cohérence entre mappers (restricted, broken, etc.).

### Tests ciblés sans option Vitest `--filter`
Vitest v3 ne supporte pas `--filter` comme précédemment; exécuter un fichier cible avec `vitest path/to/spec.mjs` ou `vitest --run path/to/spec.mjs` dans le script `pnpm test`. Mémoriser ce pattern pour éviter faux négatifs CI.

### Performance volumétrique
Valider qu’un lot de ~200 entrées passe <1s local (ajustable) sans exceptions; pas de structures O(n^2) lors de l’agrégation (Map + insertion unique). Réutiliser pour autres domaines à counts multiples (ex: effets stackables).

### Tag injection côté modèle
Élargir `getTags()` localement plutôt que d’introduire un nouveau champ dans le schéma. Pattern: construire clés normalisées (`type-explosive`) + label dérivé `Type: Explosive`. Garantit séparation données brutes / présentation.

### Règle d’or rétro-compat
Toute donnée additive (valeurs de qualités, tags enrichis, sizeHigh, source) se met dans `flags.swerpg.*` pour ne pas rompre sérialisation/casting existants Foundry ni la logique dérivée déjà testée.

## Weapon Import – Sécurité et Neutralisation Script

Pattern réutilisable: neutraliser `<script>` via simple remplacement global avant tout autre processing texte (prévention XSS pessimiste). Ne pas transformer en HTML; stocker en texte brut dans `description.public`.

```js
sanitizeText(text)
  .replace(/<script/gi,'&lt;script')
  .replace(/<\/script>/gi,'&lt;/script&gt;')
```

## Weapon Import – Construction de description source

La source doit toujours être ré-append une fois la sanitation effectuée pour éviter de supprimer accidentellement l’information. Ajouter un séparateur vide ou ligne blanche avant pour lisibilité.

## Weapon Import – Fallback SizeHigh

Parser `SizeHigh` en nombre si possible sinon garder chaîne nettoyée. Stocker dans `flags.swerpg.oggdude.sizeHigh`. Ne jamais injecter dans le modèle tant que non utilisé mécaniquement.

## Weapon Import – Qualités inconnues

Journaliser avec `logger.warn` + incrément stats sans rejeter l’item. Permet instrumentation future sans bloquer contenu custom utilisateur.

## Weapon Import – Normalisation multi-séparateurs

Pour `Type` multi-valeurs ou catégories composites, splitter sur `/`, `;`, `,` et normaliser espace interne. Pattern réutilisable pour tout champ multi-sources.


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

## Jauge de progression domaines (nouvelle mémoire)

Pattern établi pour afficher progression des domaines importés dans l'UI OggDudeDataImporter sans bruit ni régression :

- Calcul du pourcentage côté JS dans `_prepareContext()` pour éviter logique Handlebars fragile: `progressPercentDomains = total ? Math.floor((processed/total)*100) : 0`.
- Stocker `_progress = { processed:Number(p)||0, total:Number(t)||0, domain }` dans le callback `progressCallback` afin de garantir types numériques (évite propagation de chaînes venant d'environnements tests).
- Rendu conditionnel uniquement si `progress.total > 0` — pas de barre vide initiale.
- Accessibilité: conteneur `<div class="import-progress-global" role="progressbar" aria-valuemin="0" aria-valuemax="{{progress.total}}" aria-valuenow="{{progress.processed}}" aria-label="localize(progress.global)">` + texte masqué `sr-only`.
- Styles: Ajouter `.import-progress-global` dans `styles/applications.less` (scopé sur `.app#swerpgSettings-form`) plutôt que dans un fichier global pour isoler. Couleurs dégradé vert (#0b5e0b → #19a319) + transition `width .25s ease`.
- Ne pas supprimer autres barres liées à métriques globales; distinguer sémantiquement par nom de champ (`progressPercentDomains`).
- Tests unitaires minimaux: vérifier valeurs 0/50/100, absence de barre quand `total=0`, casting numérique, et que `progressPercentDomains` alimente la width (ex: `style="width: 100%"`).
- Pas d'accès `this.` dans template; référencer `progressPercentDomains` directement.
- Sécurité: caster avec `Number()` dans callback; empêcher injection ou `NaN` silencieux.
- Performance: éviter recalculs lourds; O(1) — accepter rerender Foundry par domaine (nombre faible). Pas de setInterval.
- Évolutivité: conserver `progressPercent` historique si déjà utilisé par autres composants pour éviter coupling (nouveau champ explicite ajouté plutôt que renommage).

## Icônes statut domaines (nouvelle mémoire)

Pattern normalisé pour afficher un état synthétique par domaine dans la table des statistiques d'import OggDude sans logique dans le template :

- Calcul pur: fonction `computeDomainStatus({ total, imported, rejected })` retourne `pending | success | mixed | error` selon règles déterministes (toutes les branches testées). Invariant forcé via clamp si `imported + rejected > total` avec log warn catégorisé.
- Contexte pré-construit: `_prepareContext()` injecte `importDomainStatus[domain] = { code, labelI18n, class }` — la template ne fait que consommer ces valeurs (pas de conditions Handlebars complexes).
- Classes CSS: `.domain-status--pending|--success|--mixed|--error` appliquées sur la cellule. Icône FontAwesome unique `<i class="fa-solid fa-circle">` pour éviter surcharge markup.
- Couleurs: utiliser `var(--color-secondary|--color-success|--color-warning|--color-danger)` au lieu de `@color-*` quand le thème repose sur custom properties héritées (bug résolu: icônes grises initialement car variables Less inexistantes).
- Accessibilité: cellule non interactive (`<td>` simple) avec `aria-label="{{localize importDomainStatus.domain.labelI18n}}"`. Ne pas ajouter `tabindex` ; focus clavier reste sur éléments interactifs.
- Contraste: sélectionner uniquement variables système déjà validées WCAG (≥3:1) sur fond sombre; vérifier visuellement après build.
- Tests: couvrir les 4 états + partiel (`pending`), clamp (validité invariant), présence des classes et des labels i18n. Un test de template vérifie existence de l'en-tête et placeholders `{{importDomainStatus.weapon.class}}`.
- Extension future: possibilité d'ajouter un tooltip non bloquant (préparer clé i18n `stats.status.tooltip.mixed`) — garder logique dans `_prepareContext()` pour fournir un éventuel message.

## I18n & JSON intégrité — importer (nouvelle mémoire)

Règles tirées d'un incident (JSON cassé) lors de l'ajout des clés de statut :

- Emplacement correct des nouvelles sous-clés: les statuts domaine doivent être insérés sous `loadWindow.stats.status` et non dans des objets sans rapport (`ACTION.FIELDS.target`).
- Duplication contrôlée FR: fichier `fr.json` contient deux segments `SETTINGS.OggDudeDataImporter` et `OggDudeDataImporter`; ajouter la sous-structure dans les deux blocs pour cohérence tant que la double consommation persiste.
- Validation immédiate: après modification d'un fichier `lang/*.json`, exécuter le test de localisation ciblé (`vitest run tests/importer/localization-oggdude.spec.mjs`) avant la suite complète pour réduire feedback loop.
- Prévention collisions: éviter qu'une clé existante (string) devienne objet. Avant d'ajouter un sous-objet, rechercher usages template `{{localize ...}}` sur la clé parent — si utilisé comme texte brut, créer une nouvelle clé (`previewButton`).
- Atomicité des patchs: ajouter virgule finale et sous-objet dans une seule opération pour ne pas laisser le JSON partiellement invalide entre commits.
- Tests à renforcer: envisager d'étendre le test de localisation pour vérifier la structure `stats.status.title/pending/success/mixed/error` dans les deux langues pour prévenir régressions.

## Double encapsulation bug pattern (nouvelle mémoire)

Pattern récurrent identifié lors du debug armor mapping - éviter `system.system` nesting :

- **Cause racine**: Pipeline `_storeItems()` encapsule automatiquement les données dans `.system` mais les mappers retournent déjà une structure `{ system: {...} }`.
- **Symptôme**: Items créés avec `armor.system.system.defense` au lieu de `armor.system.defense`, valeurs par défaut (0) au lieu des données mappées.
- **Solution Adaptateur**: Utiliser `const systemData = item.system ?? item` dans le pipeline pour accepter les deux formats (backward compatibility).
- **Validation**: Vérifier dans les tests que la structure finale respecte le schéma FoundryVTT attendu (`system.defense.base`, `system.soak.base`).
- **Debugging**: Utiliser `console.log` dans `_storeItems` pour tracer la structure avant/après encapsulation. Chercher `system.system` dans l'Inspector Foundry.

## Description structure pattern (nouvelle mémoire)

Standard FoundryVTT pour les descriptions d'items découvert lors du fix armor :

- **Structure attendue**: `{ public: "Description visible", secret: "Notes GM" }` au lieu d'un string simple.
- **Sanitisation**: Toujours utiliser `foundry.utils.htmlToText()` pour nettoyer le HTML avant stockage (prévention XSS).
- **Construction**: Fonction utilitaire `buildArmorDescription(xmlArmor)` centralise la logique de construction + sanitisation.
- **Backward compatibility**: Si ancien code attend un string, adapter les tests plutôt que changer la structure (standard FoundryVTT).
- **Template access**: Dans Handlebars, accéder via `{{system.description.public}}` et non `{{system.description}}`.

## Test import strategy pattern (nouvelle mémoire)

Stratégie pour éviter les erreurs de modules dans les tests d'import :

- **Import dynamique**: Utiliser `const { mapperFunction } = await import('../../module/...')` dans les tests au lieu d'imports statiques en haut de fichier.
- **Mock Foundry complet**: Vérifier que `globalThis.foundry.applications.api` existe avant d'importer les modules qui en dépendent.
- **Fonction correcte**: Utiliser le nom exact exporté (`armorMapper` pas `mapOggDudeArmor`) - vérifier les exports avec `grep_search`.
- **Test isolation**: Mock foundry dans `beforeEach()` pour éviter les fuites entre tests.
- **Debugging imports**: Si "is not a function", vérifier l'export exact avec `grep_search "export.*function"` sur le fichier cible.

## Talent Import Mapping – Description, DieModifiers & Flags (nouvelle mémoire)

Pattern consolidé introduit lors du correctif de mapping des Talents OggDude (rank, activation, description enrichie & modificateurs de dés). À appliquer pour tout domaine avec enrichissement textuel + données additives non contractuelles.

### Séparation de responsabilités
Créer un module dédié `oggdude-talent-diemodifiers-map.mjs` gérant uniquement:
1. Extraction brute des nœuds `<DieModifiers>`.
2. Normalisation élément → objet `{ type, skill?, characteristic?, value?, applyOnce? }`.
3. Formatage pour description (lignes textuelles prêtes à concaténation).
4. Sanitation texte (voir plus bas) + assemblage final.
Le mapper principal importe et orchestre sans dupliquer la logique d'assemblage.

### Assemblage déterministe de la description
Ordre strict (ne jamais réordonner dynamiquement):
1. Description source OggDude nettoyée.
2. Ligne blanche.
3. Source formatée: `Source: <Nom>[, p.<Page>]` si disponible.
4. Ligne blanche.
5. Section Die Modifiers seulement si ≥1 modificateur: titre `Die Modifiers:` puis une ligne par modificateur.

Ne jamais insérer d'en-tête vide quand il n'y a aucun modificateur; c'est un invariant testable.

### Sanitation & Limites
Règles appliquées avant enrichissement:
- Neutraliser `<script>` / `<style>` par remplacement (`<` → `&lt;` sur balises ouvrantes). Pas d'exécution potentielle.
- Supprimer balises propriétaires OggDude si présentes (`[BR]`, `[H3]`, `[color]`) ou les convertir en sauts de ligne (`[BR]`).
- Trim + collapse multi-espaces → espace simple.
- Troncature dure à 2000 caractères (post assemblage). Tests doivent couvrir la conservation d'un suffixe complet (éviter coupure milieu d'un mot critique; aucune logique de mot, juste cut brut documenté).

### Flags additive vs schéma
Ne jamais modifier le modèle Foundry (ex: `SwerpgTalent`) pour stocker DieModifiers tant que gameplay non défini. Stocker structure normalisée dans `flags.swerpg.oggdude.dieModifiers` (tableau d'objets) + conserver clé d'origine `flags.swerpg.oggdudeKey` pour traçabilité.

Avantages:
- Rétro-compatibilité sauvegardes existantes.
- Facilité d'évolution (ajout futur d'autres modificateurs) sans migrations.

### Incrément métriques
Incrémenter le compteur `dieModifiers` uniquement si le tableau final possède ≥1 entrée. Permet ratio clair talents enrichis / total. Exposé via `getTalentImportStats().dieModifiers`.

### Performance
Complexité O(n) par talent (n = nombre d'éléments DieModifier). Pas de regex lourde dans la boucle; sanitation textuelle faite une fois. Vérifier absence de double parsing XML.

### Tests essentiels
Couverture minimale exigée:
- Extraction: compter correctement chaque type supporté (Setback / Boost / RemoveSetback / UpgradeDifficulty / DecreaseDifficulty / ApplyOnce).
- Ignorer modificateurs sans skill ET sans characteristic (logger.warn). Ne pas lever exception.
- Description: présence ou absence section Die Modifiers selon cas; source correctement append; troncature à 2000 chars.
- Sanitation: suppression `<script>` & collapse espaces.
- Flags: structure exacte tableau d'objets; absence du champ si liste vide.

### Pièges évités (rétrospective)
- Duplication description builder dans le mapper principal → centralisé dans module DieModifiers.
- Insertion header Die Modifiers vide quand aucun modificateur → invariant ajouté.
- Pollution schéma principal (ajout champ dieModifiers) → usage des flags protégé.
- Troncature uniquement sur description initiale (perte section modificateurs) → appliquer troncature après assemblage complet.

### Extension future
Si besoin de rendre interactif (tooltip de chaque modificateur): préparer mapping `flags.swerpg.oggdude.dieModifiers[i].label` localisé sans casser structure ; la description reste texte brut pour compatibilité export.

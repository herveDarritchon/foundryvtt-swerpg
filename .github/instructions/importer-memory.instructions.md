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

## ImportStats standardisation (nouvelle mémoire)

- Tous les domaines doivent utiliser `ImportStats` comme seule source de vérité pour les compteurs. Incrémente `total` et `rejected`, laisse `imported` être calculé par le getter (`total - rejected`). Ne crée jamais de compteur parallèle `created/processed/failed` dans les utils.
- Les fonctions `increment*ImportStat(key, amount)` exposées par chaque util _doivent_ accepter un paramètre `amount` optionnel pour permettre des incréments batch (ex: compter les skills). Évite les versions sans `amount` qui cassent les tests communs.
- Quand une stat stocke des détails (ex: `unknownSkills`), utilise `addDetail(key, value, 'detailArray')`. Le compteur est la taille du `Set`; assure-toi que les tests vérifient la déduplication plutôt qu'un simple +1 par appel.
- Ré-exporte `reset*ImportStats` / `get*ImportStats` depuis les mappers et appelle `reset*ImportStats()` au début de chaque mapper et de chaque test pour éviter les fuites d'état entre runs.
- Les tests unitaires et d'intégration doivent valider la forme `{ total, rejected, imported, ... }` et s'attendre à ce que les stats inconnues soient créées automatiquement (`incrementStat('foo')` initialise `foo`). Mets à jour les assertions en conséquence lors des refactors.

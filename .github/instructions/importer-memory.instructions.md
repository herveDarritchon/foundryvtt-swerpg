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

## Extension future (caching/streaming)
Préparer code pour streaming en gardant buildJsonDataFromFile isolé; introduction future d'un parseur SAX pourra remplacer juste l'étape 6-2 sans affecter mappers.

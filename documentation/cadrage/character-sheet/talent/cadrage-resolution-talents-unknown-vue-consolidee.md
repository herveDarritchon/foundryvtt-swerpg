# Document de cadrage — Résolution des talents “Unknown Talent” dans la vue consolidée

## 1. Contexte

Dans l’onglet **Talents** de la fiche personnage, la vue consolidée affiche plusieurs talents achetés ou référencés depuis les arbres de spécialisation, mais tous apparaissent sous le libellé :

```txt
Unknown Talent
Unspecified
```

Exemples visibles dans le HTML fourni :

```html
<article class="line-item talent-consolidated" data-talent-id="conv">
  <h4 class="item-header talent-consolidated__name">Unknown Talent</h4>
  <span class="tag tag-neutral talent-consolidated__tag">Unspecified</span>
  ...
  <span class="source-name talent-source--resolved">Scoundrel</span>
</article>
```

Les `talentId` sont bien présents :

```txt
conv
fearsome
intim
quickdr
senseadv
tough
```

Les sources sont également résolues :

```txt
Scoundrel
Aggressor
```

Le problème semble donc localisé dans la **résolution du référentiel Talent**, et non dans la récupération des achats ou dans l’affichage Handlebars.

## 2. Constat technique vérifié

Dans `character.mjs`, le modèle de progression acteur contient actuellement :

```js
talentPurchases: new fields.ArrayField(
  new fields.SchemaField({
    treeId: new fields.StringField({ required: true, blank: false }),
    nodeId: new fields.StringField({ required: true, blank: false }),
    talentId: new fields.StringField({ required: true, blank: false }),
    specializationId: new fields.StringField({ required: true, blank: false }),
  }),
  { required: false, initial: [] },
)
```

Donc un achat de talent acteur stocke aujourd’hui uniquement :

```txt
treeId
nodeId
talentId
specializationId
```

Il ne stocke pas encore :

```txt
treeUuid
talentUuid
```

Dans `talents.hbs`, le template affiche uniquement les données préparées en amont :

```hbs
{{talent.name}}
{{talent.tags}}
{{talent.sources}}
```

Donc le template n’est probablement pas responsable du `Unknown Talent`. Il reçoit déjà un view-model dégradé.

## 3. Diagnostic

Le système connaît l’existence du talent acheté ou référencé, mais il ne retrouve pas l’Item Talent correspondant.

Le pipeline semble fonctionner jusqu’ici :

```txt
Actor
  → progression.talentPurchases
  → talentId trouvé
  → spécialisation/source trouvée
  → ligne consolidée créée
  → tentative de résolution du Talent référentiel
  → échec
  → fallback Unknown Talent
```

Le symptôme principal est donc :

```txt
talentId court présent, mais Item Talent référentiel non résolu.
```

[Inférence] La cause probable est un décalage entre la clé stockée dans les achats ou les nœuds d’arbre, par exemple `conv`, et la clé utilisée par le resolver pour chercher les Items Talent, par exemple :

```txt
item.id
item.uuid
item.system.id
item.system.uuid
item.system.talentId
item.system.code
```

## 4. Problème à résoudre

Il faut stabiliser la stratégie de lien entre :

```txt
un nœud d’arbre de spécialisation
un achat acteur
un Item Talent référentiel
la vue consolidée des talents
```

Le point central est :

```txt
Quelle clé fait autorité pour retrouver un Talent ?
```

Aujourd’hui, `talentId` joue ce rôle partiellement, mais il ne suffit pas si les Items Talent ne portent pas exactement la même clé au bon endroit.

## 5. Objectif

Permettre à la vue consolidée d’afficher les vrais talents achetés ou référencés par les arbres de spécialisation, avec :

```txt
nom réel du talent
type / activation / tags
rang si talent ranked
sources par spécialisation
fallback clair en cas de résolution impossible
logs exploitables en debug
```

Exemple attendu :

```txt
Convincing Demeanor
Passive
Sources: Scoundrel

Fearsome
Passive
Sources: Aggressor

Quick Draw
Active / Incidental
Sources: Scoundrel
```

Les libellés exacts dépendront des données importées.

## 6. Périmètre

### Inclus

Le cadrage couvre :

```txt
la résolution des talents dans la vue consolidée
la clarification des clés utilisées
les fallbacks en cas de talent non résolu
les logs de diagnostic
les tests unitaires du resolver/view-model
la vérification de compatibilité avec les arbres importés
```

### Exclu

Ce cadrage ne couvre pas encore :

```txt
l’achat interactif de talents depuis l’arbre
la dépense d’XP des talents
les effets mécaniques des talents
l’application automatique des bonus de talents
la refonte graphique de l’arbre
l’import complet OggDude si les données sources sont absentes
```

## 7. Décision de modèle recommandée

Il faut distinguer deux types de clés.

### Clé métier importée

```js
talentId: 'conv'
```

Rôle :

```txt
identifier le talent dans les données importées
rester lisible
permettre les rapprochements OggDude / données métier
servir de fallback de résolution
```

Cette clé est utile, mais elle n’est pas suffisante comme lien Foundry robuste.

### Lien Foundry résolu

```js
talentUuid: 'Compendium.swerpg.talents.Item.xxxxx'
```

Rôle :

```txt
pointer vers l’Item Talent réel
permettre fromUuid()
fonctionner entre monde et compendium
éviter les collisions d’id courts
```

La cible souhaitable à moyen terme :

```js
{
  ;(treeId, treeUuid, nodeId, talentId, talentUuid, specializationId)
}
```

Mais il faut l’introduire sans casser les données existantes.

## 8. Stratégie de résolution proposée

La résolution d’un talent devrait suivre un ordre clair.

### Étape 1 — Résolution par `talentUuid`

Si `talentUuid` existe :

```js
const talent = await fromUuid(talentUuid)
```

Si l’Item existe et est de type `talent`, il est utilisé.

### Étape 2 — Résolution par clé métier

Si `talentUuid` est absent ou invalide, chercher dans les Items Talent disponibles avec :

```txt
item.system.id === talentId
item.system.talentId === talentId
item.system.code === talentId
item.flags.swerpg.import.id === talentId
```

La liste exacte dépendra du modèle réel des Items Talent.

### Étape 3 — Résolution par index préconstruit

Créer un index de résolution au moment de préparer la vue :

```js
const talentsByBusinessId = new Map()
const talentsByUuid = new Map()
```

Cela évite de refaire des recherches répétées pour chaque ligne consolidée.

### Étape 4 — Fallback contrôlé

Si aucun Talent n’est trouvé :

```js
{
  talentId,
  name: game.i18n.localize('SWERPG.TALENT.UNKNOWN'),
  tags: [{ label: game.i18n.localize('SWERPG.TALENT.UNSPECIFIED') }],
  isResolved: false,
  resolutionStatus: 'unresolved'
}
```

Le fallback doit être volontaire, visible en debug, mais ne doit pas masquer silencieusement le problème.

## 9. View-model cible

La vue consolidée devrait recevoir un modèle stable de ce type :

```js
{
  talentId: 'conv',
  talentUuid: 'Compendium.swerpg.talents.Item.xxxxx',
  name: 'Convincing Demeanor',
  isResolved: true,
  isRanked: true,
  rank: 1,
  tags: [
    {
      label: 'Passive',
      cssClass: 'tag-neutral'
    }
  ],
  sources: [
    {
      specializationId: 'scoundrel',
      label: 'Scoundrel',
      cssClass: 'talent-source--resolved'
    }
  ],
  hasDegradedSources: false
}
```

En cas de talent non résolu :

```js
{
  talentId: 'conv',
  talentUuid: null,
  name: 'Unknown Talent',
  isResolved: false,
  isRanked: false,
  rank: 0,
  tags: [
    {
      label: 'Unspecified',
      cssClass: 'tag-neutral'
    }
  ],
  sources: [
    {
      specializationId: 'scoundrel',
      label: 'Scoundrel',
      cssClass: 'talent-source--resolved'
    }
  ],
  hasDegradedSources: false,
  resolutionStatus: 'talent-not-found'
}
```

## 10. Logs de diagnostic à ajouter

Ajouter un log ciblé dans le resolver de talents consolidés.

```js
logger.debug('[talents] resolving consolidated talent', {
  actorId: actor.id,
  actorName: actor.name,
  talentId,
  talentUuid,
  treeId,
  treeUuid,
  nodeId,
  specializationId,
})
```

En cas d’échec :

```js
logger.warn('[talents] unresolved consolidated talent', {
  actorId: actor.id,
  actorName: actor.name,
  talentId,
  talentUuid,
  treeId,
  treeUuid,
  nodeId,
  specializationId,
  knownTalentBusinessIds: Array.from(talentsByBusinessId.keys()),
})
```

En phase temporaire de debug, ajouter aussi :

```js
logger.debug('[talents] available talent index sample', {
  talents: talentItems.slice(0, 20).map((item) => ({
    id: item.id,
    uuid: item.uuid,
    name: item.name,
    type: item.type,
    systemId: item.system?.id,
    systemTalentId: item.system?.talentId,
    systemUuid: item.system?.uuid,
    flags: item.flags?.swerpg,
  })),
})
```

Ce log doit être retiré ou abaissé ensuite, car il peut vite devenir verbeux.

## 11. Critères d’acceptation

### Cas nominal

Étant donné un acteur avec des `talentPurchases` contenant un `talentId` existant dans les Items Talent référentiels, alors la vue consolidée affiche le nom réel du talent.

### Sources

Étant donné un talent présent dans plusieurs spécialisations, alors la vue consolidée l’affiche une seule fois avec plusieurs sources.

### Talent ranked

Étant donné un talent ranked acheté plusieurs fois, alors la vue consolidée affiche son rang consolidé.

### Talent non résolu

Étant donné un `talentId` sans Item Talent correspondant, alors la vue affiche `Unknown Talent`, conserve la source, et produit un log de diagnostic exploitable.

### Compatibilité données existantes

Étant donné un acteur existant dont les achats ne contiennent pas encore `talentUuid`, alors la résolution par `talentId` continue de fonctionner.

### Non-régression template

Le fichier `talents.hbs` ne doit pas contenir de logique métier de résolution. Il reste un template d’affichage.

## 12. Découpage proposé en sous-issues

### Issue 1 — Diagnostiquer la résolution actuelle des talents consolidés

Objectif : identifier précisément où le fallback `Unknown Talent` est produit.

Livrables :

```txt
localisation de la fonction de préparation du view-model talents
logs temporaires sur talentId / talentUuid / Items disponibles
constat documenté sur la clé réellement disponible côté Items Talent
```

Critère de sortie :

```txt
on sait si l’échec vient du modèle acteur, du modèle arbre, du modèle talent, ou du resolver.
```

### Issue 2 — Formaliser la stratégie de clés Talent

Objectif : définir officiellement les rôles de `talentId`, `talentUuid`, `system.id`, `system.uuid`.

Livrables :

```txt
mini ADR ou section dans l’ADR existant sur les clés
règle de priorité de résolution
règle de compatibilité avec les anciens achats
```

Décision recommandée :

```txt
talentId = clé métier importée
talentUuid = lien Foundry résolu
```

### Issue 3 — Mettre à niveau le resolver de talents consolidés

Objectif : permettre la résolution robuste d’un talent depuis les achats acteur.

Livrables :

```txt
index des Items Talent disponibles
résolution par UUID si disponible
fallback par talentId
fallback contrôlé Unknown Talent
logs warn en cas d’échec
```

Critère de sortie :

```txt
les talents connus ne s’affichent plus en Unknown Talent.
```

### Issue 4 — Enrichir progressivement les données persistées

Objectif : ajouter `talentUuid` et `treeUuid` aux achats futurs sans casser les achats existants.

Livrables :

```txt
extension du schema talentPurchases
code de création d’achat enrichi
compatibilité des anciennes données
```

Point d’attention :

```txt
ne pas imposer une migration lourde avant d’avoir stabilisé la résolution.
```

### Issue 5 — Couvrir par tests unitaires

Objectif : verrouiller le comportement de consolidation.

Cas à tester :

```txt
résolution par talentUuid
résolution fallback par talentId
talent inconnu
talent ranked multi-sources
source résolue
source dégradée
absence de talentPurchases
```

Critère de sortie :

```txt
les tests décrivent explicitement le comportement attendu de la vue consolidée.
```

### Issue 6 — Vérification visuelle Foundry

Objectif : valider dans Foundry que la fiche affiche les vrais talents.

Scénario de test manuel :

```txt
ouvrir Blue Shadow
onglet Talents
vérifier que conv, fearsome, intim, quickdr, senseadv, tough sont résolus
vérifier les sources Scoundrel / Aggressor
vérifier qu’aucun Unknown Talent n’apparaît pour les talents existants
```

## 13. Risques

### Risque 1 — Les Items Talent n’existent pas encore

Si les arbres contiennent `conv`, `fearsome`, etc., mais qu’aucun Item Talent correspondant n’existe dans le monde ou les compendiums, le resolver ne pourra rien afficher de mieux que `Unknown Talent`.

Dans ce cas, le problème n’est pas le resolver mais l’import ou le référentiel.

### Risque 2 — Les clés importées ne sont pas homogènes

Exemple :

```txt
tree node: conv
talent item: convincing-demeanor
name: Convincing Demeanor
```

Dans ce cas, il faut une table de mapping ou une normalisation d’import.

### Risque 3 — Confusion entre UUID métier et UUID Foundry

Il faut éviter d’avoir :

```txt
system.uuid
item.uuid
talentUuid
```

avec trois significations différentes.

Recommandation nette :

```txt
item.uuid = UUID Foundry natif
talentUuid = UUID Foundry stocké comme référence
system.id = clé métier stable
```

Je serais prudent avec `system.uuid` : le nom est ambigu, parce qu’il peut être confondu avec l’UUID Foundry.

## 14. Recommandation finale

La priorité n’est pas de modifier le template. Il faut traiter le sujet dans cet ordre :

```txt
1. localiser le resolver qui produit Unknown Talent
2. logger les clés disponibles côté achats, arbres et Items Talent
3. vérifier si les Items Talent existent réellement
4. choisir la clé canonique
5. rendre le resolver tolérant : UUID d’abord, talentId ensuite
6. enrichir les achats futurs avec talentUuid
7. couvrir les cas par tests
```

Le bug actuel est un bon révélateur d’un sujet plus profond : la vue consolidée ne doit pas dépendre uniquement d’identifiants courts importés. Ces identifiants sont utiles comme clés métier, mais le système doit progressivement s’appuyer sur des références Foundry robustes pour relier les arbres, les achats acteur et les Items Talent.

---
title: 'ADR-0013: Séparation entre clé métier stable et clé technique Foundry'
status: 'Proposed'
date: '2026-05-14'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'foundry-vtt', 'data-model', 'importer', 'talents', 'specialization-tree']
supersedes: ''
superseded_by: ''
---

## Status

**Proposed** - Cette décision définit la règle projet pour distinguer les identifiants métier stables des références techniques Foundry dans les données SWERPG.

## Context

Le système SWERPG importe des données métier issues de sources externes, notamment OggDude, puis les transforme en documents Foundry VTT.

Dans le cas des talents et des arbres de spécialisation, un problème est apparu : les nœuds des arbres contiennent actuellement des identifiants métier de talents, par exemple :

```js
{
  nodeId: 'r1c3',
  talentId: 'grit',
  row: 1,
  column: 3,
  cost: 5,
}
```

Ces identifiants sont utiles métier, mais ils ne sont pas des références Foundry.

L’application graphique d’arbre de spécialisation a tenté de résoudre ces valeurs comme des UUID Foundry :

```js
fromUuidSync('grit')
```

Cette résolution échoue, car `grit` n’est pas un UUID Foundry valide.

Résultat : les talents sont affichés comme `Unknown Talent`, alors que les nœuds, les positions et les coûts XP sont bien présents.

Le projet doit donc formaliser une règle claire : ne jamais confondre la clé métier stable d’un document avec sa clé technique Foundry.

Cette ADR reprend le format utilisé dans les ADR existants du projet, notamment la structure `Status`, `Context`, `Decision`, `Consequences`, `Alternatives Considered`, `Implementation Notes` et `References`.

## Decision

Le projet adopte la règle suivante :

> Toute donnée métier importée doit conserver une clé métier stable, et toute association technique entre documents Foundry doit utiliser une clé technique distincte.

En pratique :

```txt
id / talentId / specializationId = clé métier stable
uuid / talentUuid / specializationTreeUuid = clé technique Foundry
```

La clé métier ne doit pas être remplacée par l’UUID Foundry.

L’UUID Foundry ne doit pas être utilisé comme identité métier principale.

## Règle générale

### Clé métier

Une clé métier est un identifiant stable issu du domaine fonctionnel ou des données sources.

Exemples :

```txt
grit
tough
kill
plausden
advisor
ambassador
```

Elle sert à :

* reconnaître une donnée métier ;
* faire des correspondances pendant l’import ;
* garantir une stabilité logique entre plusieurs imports ;
* conserver une traçabilité vers la source externe.

Exemple pour un talent :

```js
{
  name: 'Grit',
  type: 'talent',
  system: {
    id: 'grit',
  },
}
```

### Clé technique Foundry

Une clé technique est une référence vers un document Foundry réellement créé.

Exemples :

```txt
Item.abc123
Compendium.world.swerpg-talents.Item.def456
```

Elle sert à :

* résoudre un document dans Foundry ;
* créer des associations directes entre documents ;
* éviter les recherches approximatives par nom ou par code ;
* permettre à l’UI de récupérer rapidement les données liées.

Exemple pour un talent créé dans le monde :

```js
{
  name: 'Grit',
  type: 'talent',
  system: {
    id: 'grit',
    uuid: 'Item.abc123',
  },
}
```

Exemple pour un talent créé dans un compendium :

```js
{
  name: 'Grit',
  type: 'talent',
  system: {
    id: 'grit',
    uuid: 'Compendium.world.swerpg-talents.Item.def456',
  },
}
```

## Application aux talents et arbres de spécialisation

### Item talent

Un item `talent` doit contenir :

```js
{
  name: 'Grit',
  type: 'talent',
  system: {
    id: 'grit',
    uuid: 'Item.abc123',
  },
}
```

Règles :

* `system.id` contient la clé métier stable.
* `system.uuid` contient l’UUID Foundry du document.
* `system.uuid` est rempli après création du document Foundry.
* `system.uuid` doit correspondre à `item.uuid`.

### Nœud d’arbre de spécialisation

Un nœud de `specialization-tree` doit contenir :

```js
{
  nodeId: 'r1c3',
  talentId: 'grit',
  talentUuid: 'Item.abc123',
  row: 1,
  column: 3,
  cost: 5,
}
```

Règles :

* `talentId` conserve la clé métier stable du talent.
* `talentUuid` référence l’item Foundry réellement associé.
* `talentUuid` doit correspondre à `system.uuid` du talent lié.
* L’UI doit utiliser `talentUuid` en priorité pour résoudre le talent.

## Ordre d’import attendu

L’importer doit respecter l’ordre suivant :

```txt
1. Importer ou retrouver les talents
2. Renseigner system.uuid sur les talents créés
3. Construire un index métier des talents
4. Importer les arbres de spécialisation
5. Enrichir chaque nœud avec talentUuid
```

Exemple :

```js
const createdTalents = await Item.createDocuments(talentData, options)

for (const talent of createdTalents) {
  await talent.update({
    'system.uuid': talent.uuid,
  })
}
```

Puis :

```js
const talentById = new Map()

for (const talent of createdTalents) {
  const talentId = String(talent.system?.id ?? '').trim().toLowerCase()

  if (!talentId) continue

  talentById.set(talentId, {
    id: talentId,
    uuid: talent.uuid,
    name: talent.name,
  })
}
```

Puis, lors du mapping des nœuds :

```js
function mapSpecializationTreeNode(rawNode, talentById) {
  const talentId = String(rawNode.talentId ?? '').trim().toLowerCase()
  const talent = talentById.get(talentId)

  return {
    nodeId: rawNode.nodeId,
    talentId: rawNode.talentId,
    talentUuid: talent?.uuid ?? null,
    row: rawNode.row,
    column: rawNode.column,
    cost: rawNode.cost,
  }
}
```

## Résolution côté UI

L’UI doit résoudre les associations par clé technique en priorité.

Exemple :

```js
function resolveTalentDetail(node) {
  const unknown = game.i18n.localize('SWERPG.TALENT.UNKNOWN')
  const talentRef = node.talentUuid ?? node.talentId

  if (!talentRef) {
    return { name: unknown, isRanked: false }
  }

  try {
    const item = fromUuidSync(talentRef)

    if (item) {
      return {
        name: item.name ?? unknown,
        isRanked: item.system?.isRanked ?? false,
      }
    }
  } catch {
    // Fallback temporaire pour les anciennes données sans talentUuid.
  }

  return { name: unknown, isRanked: false }
}
```

Pendant la période de transition, l’UI peut conserver un fallback par clé métier, mais ce fallback ne doit pas devenir le fonctionnement nominal.

## Consequences

### Positive

* **POS-001**: **Séparation claire des responsabilités** - La clé métier identifie le concept métier ; la clé technique référence le document Foundry.
* **POS-002**: **Résolution fiable des associations** - Les nœuds d’arbres peuvent retrouver directement les items talents associés.
* **POS-003**: **Compatibilité world items et compendiums** - La même règle fonctionne pour les documents créés dans le monde et dans un compendium.
* **POS-004**: **Moins de recherches fragiles** - L’UI n’a plus besoin de deviner un talent par nom, code ou champ alternatif.
* **POS-005**: **Import plus contrôlable** - Les erreurs d’association peuvent être détectées au moment de l’import.
* **POS-006**: **Meilleure maintenabilité** - Le modèle rend explicite la différence entre données source et références Foundry.

### Negative

* **NEG-001**: **Complexité d’import accrue** - L’import doit être séquencé pour créer les talents avant de créer les arbres.
* **NEG-002**: **Mise à jour post-création nécessaire** - L’UUID Foundry n’est connu qu’après création du document.
* **NEG-003**: **Migration des données existantes** - Les mondes déjà importés devront être enrichis progressivement avec les nouveaux champs techniques.
* **NEG-004**: **Risque de désynchronisation** - Si un document est déplacé, recréé ou réimporté, `system.uuid` doit rester cohérent avec `item.uuid`.

## Alternatives Considered

### Utiliser uniquement `talentId` comme clé universelle

* **ALT-001**: **Description**: Utiliser `talentId` à la fois comme clé métier et comme clé de résolution UI.
* **ALT-002**: **Rejection Reason**: Cela impose à l’UI de rechercher les talents par code métier dans les collections Foundry. Cette recherche est plus lente, plus fragile et dépend de la qualité du mapping.

### Remplacer `talentId` par l’UUID Foundry

* **ALT-003**: **Description**: Faire de `talentId` un UUID Foundry.
* **ALT-004**: **Rejection Reason**: Cette solution détruit la distinction entre identité métier et référence technique. Elle rend les données moins stables entre imports, mondes et compendiums.

### Utiliser le nom du talent comme clé d’association

* **ALT-005**: **Description**: Associer les nœuds aux talents par `item.name`.
* **ALT-006**: **Rejection Reason**: Le nom est localisable, modifiable et non garanti unique. Il ne doit jamais être utilisé comme clé technique principale.

### Résoudre dynamiquement à chaque affichage

* **ALT-007**: **Description**: Ne pas stocker `talentUuid`, et retrouver le talent à chaque rendu via `game.items.find(...)`.
* **ALT-008**: **Rejection Reason**: Cela déplace une responsabilité d’import vers l’UI, augmente le couplage et masque les erreurs de données au lieu de les révéler tôt.

## Implementation Notes

* **IMP-001**: **Champ `system.uuid`** - Les items importés qui doivent être associés techniquement doivent exposer leur UUID Foundry dans leur structure système.
* **IMP-002**: **Champ `talentUuid`** - Les nœuds d’arbre de spécialisation doivent référencer les talents via `talentUuid`.
* **IMP-003**: **Ordre d’import** - Les talents doivent être créés ou retrouvés avant la création des arbres de spécialisation.
* **IMP-004**: **Index métier** - L’importer doit construire un index par clé métier stable, par exemple `system.id`.
* **IMP-005**: **Post-update UUID** - L’UUID doit être renseigné après création du document Foundry.
* **IMP-006**: **Logs explicites** - Si un nœud référence un talent introuvable, l’importer doit produire un warning exploitable.
* **IMP-007**: **Rétrocompatibilité** - L’UI doit temporairement accepter les anciens nœuds sans `talentUuid`.
* **IMP-008**: **Tests ciblés** - Les tests doivent vérifier explicitement les valeurs métier et techniques attendues, conformément à ADR-0012 sur les tests lisibles et diagnostiques.
* **IMP-009**: **Code review** - Toute nouvelle association entre documents doit expliciter si elle utilise une clé métier ou une clé technique.
* **IMP-010**: **Pas d’association par nom** - Le nom affiché d’un document ne doit pas être utilisé comme clé d’association principale.

## Critères d’acceptation

### Import en world items

Après import :

```js
const talent = game.items.find(i => i.type === 'talent' && i.system.id === 'grit')
```

Alors :

```js
talent.system.uuid === talent.uuid
```

Et pour un nœud d’arbre utilisant ce talent :

```js
node.talentId === 'grit'
node.talentUuid === talent.uuid
```

### Import en compendium

Après import dans un compendium :

```js
talent.system.uuid === talent.uuid
```

Et :

```txt
talent.uuid
```

doit être de la forme :

```txt
Compendium.world.<pack-name>.Item.<document-id>
```

Les nœuds d’arbres importés dans le même contexte doivent référencer ce même UUID.

### UI

L’arbre de spécialisation doit afficher le nom réel du talent lorsque `node.talentUuid` est renseigné.

L’affichage `Unknown Talent` ne doit apparaître que si :

* `talentUuid` est absent ou invalide ;
* le fallback métier échoue ;
* le talent source est réellement introuvable.

## Migration

Une migration devra enrichir les données existantes.

Principe :

1. parcourir les items `talent` existants ;
2. renseigner `system.uuid` avec `item.uuid` si absent ou incorrect ;
3. construire un index `system.id -> item.uuid` ;
4. parcourir les items `specialization-tree` ;
5. renseigner `node.talentUuid` à partir de `node.talentId` ;
6. logger les nœuds non résolus.

Pseudo-code :

```js
for (const talent of game.items.filter(i => i.type === 'talent')) {
  if (talent.system?.uuid !== talent.uuid) {
    await talent.update({ 'system.uuid': talent.uuid })
  }
}

const talentById = new Map(
  game.items
    .filter(i => i.type === 'talent')
    .map(i => [String(i.system?.id ?? '').trim().toLowerCase(), i.uuid])
)

for (const tree of game.items.filter(i => i.type === 'specialization-tree')) {
  const nodes = tree.system.nodes.map((node) => {
    const talentId = String(node.talentId ?? '').trim().toLowerCase()

    return {
      ...node,
      talentUuid: node.talentUuid ?? talentById.get(talentId) ?? null,
    }
  })

  await tree.update({ 'system.nodes': nodes })
}
```

## References

* **REF-001**: Foundry VTT - Document UUIDs and `fromUuidSync`
* **REF-002**: Foundry VTT - Item documents
* **REF-003**: SWERPG - OggDude Importer architecture
* **REF-004**: SWERPG - Specialization tree importer
* **REF-005**: SWERPG ADR-0012 - Règles d’écriture des tests unitaires lisibles et diagnostiques
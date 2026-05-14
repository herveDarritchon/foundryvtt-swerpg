# Règle de cadrage — Clés métier et clés techniques pour les talents, arbres de spécialisation et nœuds

## 1. Intention

Cette règle cadre l’évolution de la gestion des clés dans l’import et l’exploitation des éléments suivants :

- les items `talent` ;
- les items `specialization-tree` ;
- les nœuds contenus dans les arbres de spécialisation ;
- les associations entre talents et nœuds.

Elle complète l’ADR-0013, qui pose la règle de séparation entre clé métier stable et clé technique Foundry.

---

## 2. Problème à résoudre

Aujourd’hui, les nœuds des arbres de spécialisation contiennent un champ de ce type :

```js
{
  nodeId: 'r1c3',
  talentId: 'grit',
  row: 1,
  column: 3,
  cost: 5,
}
````

`talentId` contient une clé métier issue de la donnée source, par exemple :

```txt
grit
tough
kill
plausden
```

Mais cette clé a parfois été utilisée comme si elle était une référence technique Foundry.

Exemple incorrect :

```js
fromUuidSync('grit')
```

Cela ne peut pas fonctionner, car `grit` n’est pas un UUID Foundry.

La conséquence visible est l’affichage de `Unknown Talent` dans l’arbre graphique, alors même que les nœuds, les positions et les coûts XP sont bien importés.

L’ADR-0013 formalise déjà cette distinction : `id / talentId / specializationId` sont des clés métier stables, tandis que `uuid / talentUuid / specializationTreeUuid` sont des clés techniques Foundry.

---

## 3. Règle générale

Toute donnée importée qui doit être associée à une autre donnée doit porter deux niveaux d’identification.

```txt
clé métier     = identité stable de la donnée
clé technique  = référence Foundry vers le document créé
```

La clé métier sert à comprendre et reconstruire les associations.

La clé technique sert à résoudre directement un document Foundry.

Les deux ne doivent pas être fusionnées.

---

## 4. Convention de nommage obligatoire

### Pour les talents

Un item `talent` doit contenir :

```js
{
  type: 'talent',
  name: 'Grit',
  system: {
    id: 'grit',
    uuid: 'Item.abc123',
  },
}
```

Règles :

```txt
system.id   = clé métier stable du talent
system.uuid = UUID Foundry réel du document talent
```

### Pour les arbres de spécialisation

Un item `specialization-tree` doit contenir :

```js
{
  type: 'specialization-tree',
  name: 'Advisor',
  system: {
    specializationId: 'advisor',
    uuid: 'Item.tree123',
    nodes: []
  },
}
```

Règles :

```txt
system.specializationId = clé métier stable de la spécialisation liée
system.uuid             = UUID Foundry réel de l’arbre
```

### Pour les nœuds d’arbre

Chaque nœud doit contenir :

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

```txt
nodeId     = clé métier locale du nœud dans l’arbre
talentId   = clé métier stable du talent associé
talentUuid = clé technique Foundry du talent associé
```

`talentUuid` doit correspondre à `system.uuid` du talent lié.

---

## 5. Règle d’import

L’import des talents et des arbres doit suivre un ordre strict.

```txt
1. Importer ou retrouver les talents
2. Renseigner system.uuid sur chaque talent
3. Construire un index métier des talents
4. Importer les arbres de spécialisation
5. Enrichir chaque nœud avec talentUuid
6. Logger les associations non résolues
```

L’ADR-0013 pose déjà cet ordre cible pour l’import.

---

## 6. Règle sur la création des UUID

L’UUID Foundry ne doit jamais être inventé ni calculé à l’avance.

Il doit être lu après création du document Foundry.

Exemple :

```js
const createdTalents = await Item.createDocuments(talentData, options)

for (const talent of createdTalents) {
  await talent.update({
    'system.uuid': talent.uuid,
  })
}
```

Cette règle s’applique aussi bien aux items créés dans le monde qu’aux documents créés dans un compendium.

---

## 7. Règle d’indexation

L’importer doit construire un index à partir de la clé métier stable.

Exemple :

```js
const talentById = new Map()

for (const talent of talents) {
  const talentId = String(talent.system?.id ?? '').trim().toLowerCase()

  if (!talentId) continue

  talentById.set(talentId, {
    id: talentId,
    uuid: talent.uuid,
    name: talent.name,
  })
}
```

Cet index sert uniquement pendant l’import ou la migration.

L’UI ne doit pas dépendre durablement d’une recherche dynamique par clé métier si `talentUuid` est disponible.

---

## 8. Règle de mapping des nœuds

Pendant l’import d’un arbre, chaque nœud doit être enrichi à partir de l’index des talents.

Exemple :

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

Si aucun talent n’est trouvé, le nœud doit quand même être importé, mais avec :

```js
talentUuid: null
```

et un warning explicite doit être produit.

Exemple :

```txt
[SpecializationTreeImporter] Talent not found for node r1c3: grit
```

---

## 9. Règle côté UI

L’interface doit résoudre les associations par clé technique en priorité.

Ordre de résolution :

```txt
1. node.talentUuid
2. fallback temporaire node.talentId
3. Unknown Talent
```

Exemple :

```js
const talentRef = node.talentUuid ?? node.talentId
```

Mais le fallback sur `talentId` est uniquement transitoire.

La cible nominale est :

```js
fromUuidSync(node.talentUuid)
```

L’ADR-0013 précise déjà que l’UI doit utiliser `talentUuid` en priorité et que le fallback métier ne doit pas devenir le fonctionnement nominal.

---

## 10. Règle d’interdiction

Les pratiques suivantes sont interdites pour les nouvelles implémentations.

### Interdit : utiliser une clé métier comme UUID

```js
fromUuidSync(node.talentId)
```

sauf si le code vérifie explicitement que `node.talentId` contient réellement un UUID, ce qui ne doit pas être le cas nominal.

### Interdit : remplacer `talentId` par un UUID

```js
{
  talentId: 'Item.abc123'
}
```

Le champ `talentId` doit rester une clé métier stable.

### Interdit : associer par nom

```js
candidate.name === node.talentId
```

Le nom est affichable, modifiable, traduisible et non garanti unique.

Il ne doit pas être utilisé comme clé d’association principale.

### Interdit : masquer les erreurs de mapping dans l’UI

L’UI peut afficher `Unknown Talent`, mais l’importer doit avoir loggé l’erreur en amont.

---

## 11. Règle de migration

Une migration devra enrichir les données existantes.

Elle doit :

1. parcourir les items `talent` ;
2. renseigner `system.uuid` avec `item.uuid` ;
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
    .map(i => [
      String(i.system?.id ?? '').trim().toLowerCase(),
      i.uuid,
    ])
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

---

## 12. Règle de validation des données

Après import ou migration, les invariants suivants doivent être vrais.

### Talent

```js
talent.system.id != null
talent.system.uuid === talent.uuid
```

### Nœud d’arbre

```js
node.nodeId != null
node.talentId != null
node.talentUuid != null
```

si le talent source existe.

### Association

```js
fromUuidSync(node.talentUuid)?.system?.id === node.talentId
```

### Arbre

Chaque arbre doit avoir des nœuds uniques par position logique :

```txt
nodeId unique
row + column cohérents
```

Un doublon de `nodeId`, `row` ou `column` doit être considéré comme une anomalie d’import.

---

## 13. Règle de responsabilité par couche

### Importer

Responsable de :

* créer ou retrouver les talents ;
* renseigner les UUID ;
* construire les index métier ;
* enrichir les nœuds ;
* logger les associations non résolues.

### Modèle métier

Responsable de :

* conserver les clés métier stables ;
* exprimer les règles de progression ;
* ne pas dépendre exclusivement des UUID Foundry.

### UI / Application

Responsable de :

* résoudre les documents liés par UUID ;
* afficher les informations enrichies ;
* conserver un fallback transitoire sur les anciennes données.

### Renderer graphique

Responsable uniquement de :

* dessiner les nœuds ;
* dessiner les connexions ;
* afficher les états transmis.

Le renderer ne doit pas faire de mapping métier.

---

## 14. Critères d’acceptation

### Import world items

Après import dans les items du monde :

```js
const talent = game.items.find(i => i.type === 'talent' && i.system.id === 'grit')
```

Alors :

```js
talent.system.uuid === talent.uuid
```

Et pour chaque nœud utilisant ce talent :

```js
node.talentId === 'grit'
node.talentUuid === talent.uuid
```

### Import compendium

Après import dans un compendium :

```js
talent.system.uuid === talent.uuid
```

Et l’UUID doit être de forme :

```txt
Compendium.world.<pack-name>.Item.<document-id>
```

Les nœuds des arbres importés dans le même contexte doivent référencer ce même UUID.

### UI

L’arbre doit afficher le nom réel du talent dès que `node.talentUuid` est renseigné.

`Unknown Talent` ne doit apparaître que si :

* `talentUuid` est absent ;
* `talentUuid` est invalide ;
* le fallback métier échoue ;
* le talent source est réellement introuvable.

---

## 15. Décision de cadrage

À partir de cette règle :

```txt
talentId n’est jamais considéré comme une référence Foundry.
talentUuid devient la référence technique d’association entre un nœud et un talent.
system.id reste la clé métier stable du talent.
system.uuid reflète l’UUID Foundry réel de l’item talent.
```

Le lien robuste attendu est donc :

```txt
specialization-tree.nodes[].talentId
  -> clé métier stable

specialization-tree.nodes[].talentUuid
  -> item talent Foundry

talent.system.id
  -> même clé métier que talentId

talent.system.uuid
  -> même valeur que talentUuid
```

Ce modèle doit être appliqué à l’import, à la migration, à l’UI et aux tests.

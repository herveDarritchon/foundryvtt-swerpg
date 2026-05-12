# Point de vigilance 3 — Import OggDude

Il faut le traiter maintenant, **avant le canvas / la vue graphique**, parce que la vue arbre ne pourra fonctionner que si les référentiels d’arbres importés contiennent les bons champs.

## Diagnostic

Le cadrage dit :

> Import OggDude : utile comme source de données, mais ne doit pas dicter le modèle métier.

C’est la bonne position.

Mais il faut préciser une chose : l’import OggDude ne doit pas seulement créer des talents avec une description. Il doit produire ou alimenter des **référentiels exploitables** :

```txt
TalentDefinition
SpecializationTree
TalentNode
connections
```

Sans ça, la V1 aura une belle architecture, mais pas de données utilisables.

## Décision de cadrage proposée

```md
### Point de vigilance — Import OggDude

**Décision** : à traiter dans la V1, mais uniquement au niveau minimal nécessaire au flux talents.

L’import OggDude doit alimenter le modèle cible sans dicter sa structure. Il doit produire ou compléter les référentiels nécessaires à la V1 :

- définitions génériques de talents ;
- arbres de spécialisation ;
- nœuds de talents ;
- positions des nœuds ;
- coûts XP par nœud ;
- connexions / prérequis d’accessibilité ;
- rattachement carrière / spécialisation lorsque disponible.

Les données brutes importées doivent être conservées dans `flags.swerpg.import` afin de permettre le diagnostic, la migration et les corrections futures.

Si une donnée OggDude est ambiguë ou incomplète, l’import doit :
- préserver la donnée brute ;
- appliquer un fallback documenté si possible ;
- produire un warning exploitable ;
- éviter de générer une structure silencieusement fausse.
```

## Champs minimaux requis

Pour que la V1 fonctionne, l’import doit pouvoir alimenter au minimum ceci.

### 1. Définition générique de talent

```js
{
  id: "parry",
  name: "Parer",
  activation: "active",
  ranked: true,
  description: "...",
  source: {
    system: "eote",
    book: "...",
    page: null
  },
  tags: []
}
```

Le point important : **pas de coût d’achat ici**.

Le coût dépend du nœud.

---

### 2. Arbre de spécialisation

```js
{
  id: "bodyguard",
  name: "Garde du corps",
  careerId: "hired-gun",
  source: {
    system: "eote",
    book: "...",
    page: null
  },
  nodes: [...],
  connections: [...]
}
```

À ce stade, le tree peut être un Item de type `specialization-tree`, ou un document référentiel équivalent. Le cadrage peut rester neutre, mais il doit exiger que le référentiel existe.

---

### 3. Nœud de talent

```js
{
  nodeId: "r1c1",
  talentId: "parry",
  row: 1,
  column: 1,
  cost: 5
}
```

Le `nodeId` doit être stable. Je recommande fortement un identifiant déterministe basé sur la position :

```txt
r{row}c{column}
```

ou, si plusieurs nœuds peuvent partager une case dans des données futures :

```txt
r{row}c{column}-{talentId}
```

Pour la V1, `r{row}c{column}` suffit si une case = un talent.

---

### 4. Connexions

```js
{
  from: "r1c1",
  to: "r2c1",
  type: "vertical"
}
```

ou :

```js
{
  from: "r1c1",
  to: "r1c2",
  type: "horizontal"
}
```

Les connexions doivent être orientées ou interprétables. Pour les règles d’achat, on doit pouvoir répondre à :

> Ce nœud est-il accessible depuis au moins un nœud déjà acheté ?

## Données ambiguës : comportement attendu

Il faut écrire ce que fait l’import quand les données sont imparfaites.

### Cas 1 : talent inconnu dans un arbre

Décision recommandée :

```md
Créer un placeholder contrôlé ou bloquer l’import de l’arbre avec warning.
```

Je préfère :

```md
Créer un placeholder contrôlé + warning.
```

Parce que ça permet de visualiser l’arbre et de corriger ensuite.

Exemple :

```js
{
  talentId: "unknown:raw-oggdude-id",
  name: "[Talent non résolu] ...",
  flags: {
    swerpg: {
      import: {
        unresolved: true,
        rawTalentRef: "..."
      }
    }
  }
}
```

### Cas 2 : coût manquant

Décision recommandée :

```md
Ne pas deviner le coût. Marquer le nœud comme non achetable et produire un warning.
```

Surtout ne pas faire `row * 5` en fallback silencieux, même si ça semble tentant. Ce serait recréer le problème.

### Cas 3 : connexions manquantes

Décision recommandée :

```md
Importer les nœuds, mais marquer l’arbre comme incomplet/non achetable tant que les connexions ne sont pas disponibles ou reconstruites par une règle validée.
```

Si vous avez une règle fiable basée sur la grille, elle doit être explicitement documentée. Sinon, pas de reconstruction magique.

### Cas 4 : activation inconnue

Décision recommandée :

```md
Importer avec activation = "unknown" ou "unspecified", afficher un tag neutre, et produire un warning non bloquant.
```

L’activation impacte l’affichage, pas l’achat.

## Ce que l’import ne doit pas faire en V1

Très important :

```md
L’import OggDude ne doit pas :
- créer des achats acteur ;
- décider qu’un talent est possédé ;
- stocker l’arbre complet dans l’acteur ;
- calculer le rang consolidé ;
- automatiser les effets mécaniques des talents ;
- imposer une structure ad hoc différente du modèle V1.
```

L’import alimente les référentiels. L’acteur stocke les achats.

## Décision sur le statut

```txt
Import OggDude : à traiter dans la V1, mais en périmètre minimal
```

Pas reporté, parce que sans import minimal, la vue arbre n’a rien de fiable à afficher.

Mais pas complet non plus, parce que l’import exhaustif de toutes les subtilités OggDude peut devenir une épique à lui seul.

## Texte prêt à ajouter au cadrage

```md
### Point de vigilance — Import OggDude

**Décision** : à traiter dans la V1, sur un périmètre minimal.

L’import OggDude doit alimenter les référentiels nécessaires à la V1 sans dicter le modèle métier. Il doit produire ou compléter :
- les définitions génériques de talents ;
- les arbres de spécialisation ;
- les nœuds de talents ;
- les positions des nœuds ;
- les coûts XP par nœud ;
- les connexions / prérequis d’accessibilité ;
- le rattachement carrière / spécialisation lorsque disponible.

Les données brutes doivent être conservées dans `flags.swerpg.import`.

L’import ne crée pas d’achats acteur, ne stocke pas les arbres complets dans l’acteur, ne calcule pas les rangs consolidés et n’automatise pas les effets mécaniques.

En cas de donnée ambiguë ou incomplète, l’import doit préserver la donnée brute, produire un warning exploitable, et éviter les fallbacks silencieux. Un nœud sans coût ou sans accessibilité fiable doit être marqué comme non achetable plutôt que corrigé par une règle implicite.
```

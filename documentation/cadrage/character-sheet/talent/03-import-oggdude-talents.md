# 03 — Import OggDude Talents V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Cadrage import — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document définit le périmètre minimal de l’import OggDude pour la V1 Talents Edge.

L’import doit alimenter les référentiels nécessaires à la progression talents, sans dicter le modèle métier.

La V1 doit pouvoir importer ou compléter :

- les définitions génériques de talents ;
- les arbres de spécialisation ;
- les nœuds de talents ;
- les positions ;
- les coûts XP ;
- les connexions ;
- les rattachements carrière / spécialisation lorsque disponibles.

---

## 2. Principe directeur

L’import OggDude alimente les référentiels.

Il ne crée pas d’état de progression acteur.

Donc l’import ne doit pas :

- créer d’achats acteur ;
- décider qu’un talent est possédé ;
- stocker un arbre complet dans l’acteur ;
- calculer un rang consolidé ;
- automatiser les effets mécaniques ;
- imposer une structure ad hoc incompatible avec le modèle V1.

---

## 3. Données importées attendues

### 3.1 Définition générique de talent

L’import doit produire ou compléter des définitions de talents.

Données minimales :

```js
{
  id: "parry",
  name: "Parer",
  description: "...",
  activation: "active",
  ranked: true,
  tags: [],
  source: {
    system: "eote",
    book: null,
    page: null
  }
}
````

Le coût XP ne doit pas être stocké sur la définition générique du talent.

---

### 3.2 Arbre de spécialisation

L’import doit produire des référentiels d’arbres de type `specialization-tree`.

Données minimales :

```js
{
  id: "bodyguard-tree",
  name: "Garde du corps",
  specializationId: "bodyguard",
  careerId: "hired-gun",
  nodes: [],
  connections: [],
  source: {
    system: "eote",
    book: null,
    page: null
  }
}
```

Les arbres peuvent être stockés :

* dans le monde ;
* dans un compendium monde ;
* dans un pack généré par import.

---

### 3.3 Nœud de talent

Chaque nœud importé doit porter :

```js
{
  nodeId: "r1c1",
  talentId: "parry",
  row: 1,
  column: 1,
  cost: 5
}
```

Le `nodeId` doit être stable.

Convention V1 recommandée :

```txt
r{row}c{column}
```

Exemples :

```txt
r1c1
r2c3
r5c4
```

---

### 3.4 Connexions

Les connexions doivent permettre de calculer l’accessibilité des nœuds.

Format indicatif :

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

Les connexions doivent être suffisamment explicites pour savoir si un nœud devient achetable depuis un nœud déjà acheté.

---

## 4. Données brutes OggDude

Les données brutes utiles au diagnostic doivent être conservées dans :

```txt
flags.swerpg.import
```

À conserver au minimum lorsque disponible :

* identifiant OggDude original ;
* type de donnée importée ;
* source brute ;
* références d’origine ;
* informations non résolues ;
* warnings d’import.

Objectif : permettre le debug, la migration et les corrections futures.

---

## 5. Gestion des données incomplètes

### 5.1 Talent inconnu

Si un nœud référence un talent introuvable :

* créer un placeholder contrôlé ;
* marquer la référence comme non résolue ;
* produire un warning.

Exemple :

```js
{
  talentId: "unknown:raw-oggdude-id",
  name: "[Talent non résolu]",
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

---

### 5.2 Coût manquant

Si le coût d’un nœud est manquant :

* ne pas deviner le coût ;
* ne pas appliquer de fallback `rank * 5` ;
* marquer le nœud comme invalide ou non achetable ;
* produire un warning.

---

### 5.3 Connexions manquantes

Si les connexions sont absentes ou incohérentes :

* importer les nœuds si possible ;
* marquer l’arbre comme incomplet ;
* empêcher les achats non fiables ;
* produire un warning.

Aucune reconstruction implicite ne doit être faite sans règle documentée.

---

### 5.4 Activation inconnue

Si l’activation est inconnue :

* importer avec une valeur neutre (`unknown`, `unspecified` ou équivalent) ;
* produire un warning non bloquant ;
* permettre l’affichage du talent.

L’activation impacte l’affichage, pas l’achat.

---

## 6. États issus de l’import

Un arbre ou un nœud importé peut être marqué :

| État         | Signification                                              |
| ------------ | ---------------------------------------------------------- |
| `valid`      | Données suffisantes pour l’affichage et l’achat.           |
| `incomplete` | Données partielles, affichage possible, achat à contrôler. |
| `invalid`    | Données insuffisantes ou incohérentes, achat interdit.     |

Un nœud sans coût fiable ou sans référence talent exploitable ne doit pas être achetable.

---

## 7. Rattachement spécialisation / arbre

Chaque arbre importé doit pouvoir être relié à une spécialisation.

Références possibles :

```txt
specializationId
specializationUuid
importKey
treeId
treeUuid
```

Si la résolution échoue :

* la spécialisation reste affichable ;
* l’arbre est marqué indisponible ou incomplet ;
* l’achat est interdit dans cet arbre ;
* un warning est produit.

---

## 8. Warnings attendus

L’import doit produire des warnings exploitables pour les cas suivants :

* talent introuvable ;
* coût manquant ;
* connexion invalide ;
* arbre sans spécialisation liée ;
* spécialisation sans arbre résolu ;
* doublon d’identifiant ;
* donnée brute non reconnue ;
* fallback appliqué explicitement.

Les warnings doivent aider à corriger les données, pas seulement signaler une erreur générique.

---

## 9. Tests attendus

Les tests ou scénarios manuels doivent couvrir au minimum :

* import d’une définition générique de talent ;
* import d’un arbre de spécialisation complet ;
* import de nœuds avec positions et coûts ;
* import de connexions ;
* conservation des données brutes dans `flags.swerpg.import`;
* talent inconnu transformé en placeholder ;
* coût manquant → nœud invalide ou non achetable ;
* connexions manquantes → arbre incomplet ;
* résolution spécialisation → arbre ;
* absence de création d’achats acteur.

---

## 10. Hors périmètre V1

L’import V1 ne couvre pas :

* automatisation des effets mécaniques ;
* création d’achats acteur ;
* calcul du rang consolidé ;
* édition manuelle des arbres ;
* correction graphique avancée des arbres ;
* talents signatures ;
* import exhaustif de toutes les subtilités OggDude si elles ne bloquent pas la V1.

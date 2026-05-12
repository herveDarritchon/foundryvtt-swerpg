# 01 — Modèle domaine Talents V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Cadrage domaine — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document définit le modèle métier cible de la V1 Talents Edge.

Il sert de référence pour :

- structurer les données talents ;
- éviter les confusions entre talent, nœud, arbre et achat acteur ;
- guider les futures issues GitHub liées au modèle domaine ;
- empêcher la reconduction des hypothèses héritées de Crucible ;
- garantir que les vues UI restent dérivées du modèle métier.

La V1 Talents Edge repose sur une règle centrale :

> Les achats de nœuds persistés sur l’acteur constituent la source de vérité de la progression talents du personnage.

---

## 2. Principes structurants

### 2.1 Séparation stricte des responsabilités

La V1 distingue explicitement cinq niveaux de données :

1. **Définition générique de talent**
2. **Arbre de spécialisation**
3. **Nœud de talent**
4. **Achat acteur**
5. **Vue consolidée des talents possédés**

Ces niveaux ne doivent pas être fusionnés.

En particulier :

- un talent générique ne porte pas le coût d’achat ;
- un arbre n’est pas stocké intégralement dans l’acteur ;
- un nœud représente une occurrence de talent dans un arbre ;
- un achat acteur porte sur un nœud, pas directement sur un talent générique ;
- la vue consolidée est dérivée, pas persistée comme source de vérité.

### 2.2 Source de vérité

La source de vérité métier est l’état d’achat des nœuds sur l’acteur.

Les éléments suivants sont recalculés à partir de cette source :

- rang consolidé d’un talent ;
- liste des talents possédés ;
- sources des talents ;
- états graphiques des nœuds ;
- accessibilité des nœuds suivants.

L’onglet Talents et la vue graphique d’arbre ne sont pas des sources de vérité.

---

## 3. Définition générique de talent

### 3.1 Définition

Une définition générique de talent décrit un talent indépendamment de tout arbre de spécialisation.

Elle représente le “quoi” du talent, mais pas son emplacement, son coût dans un arbre ou son état acheté par un acteur.

### 3.2 Données minimales

Une définition générique de talent doit permettre de porter au minimum :

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

### 3.3 Responsabilités

La définition générique de talent porte :

* le nom ;
* la description ;
* l’activation ;
* l’information ranked / non-ranked ;
* les tags utiles à l’affichage ;
* la source éditoriale ou importée.

### 3.4 Ce qu’elle ne porte pas

La définition générique de talent ne porte pas :

* le coût XP d’achat dans un arbre ;
* la position dans un arbre ;
* l’état acheté / non acheté ;
* le rang possédé par un acteur ;
* les connexions d’un arbre ;
* les effets mécaniques automatisés en V1.

Le coût d’achat dépend du nœud d’arbre, pas du talent générique.

---

## 4. Arbre de spécialisation

### 4.1 Définition

Un arbre de spécialisation est un référentiel monde / compendium décrivant la progression d’une spécialisation.

Il correspond à la structure d’achat des talents d’une spécialisation donnée.

### 4.2 Support technique cible

Les arbres de spécialisation V1 sont représentés par des Items de type :

```txt
specialization-tree
```

Ces Items peuvent être stockés :

* dans le monde ;
* dans un compendium monde ;
* dans un pack généré par import OggDude.

### 4.3 Données minimales

Un arbre de spécialisation doit permettre de porter au minimum :

```js
{
  id: "bodyguard-tree",
  name: "Garde du corps",
  specializationId: "bodyguard",
  specializationName: "Garde du corps",
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

### 4.4 Responsabilités

L’arbre de spécialisation porte :

* la spécialisation liée ;
* éventuellement la carrière liée ;
* les nœuds de talents ;
* les positions des nœuds ;
* les coûts XP par nœud ;
* les connexions entre nœuds ;
* les métadonnées d’import et de source.

### 4.5 Ce qu’il ne porte pas

L’arbre de spécialisation ne porte pas :

* l’état acheté par un acteur ;
* le rang consolidé d’un talent ;
* l’historique des achats ;
* les effets mécaniques automatisés ;
* les données propres à un personnage.

---

## 5. Nœud de talent

### 5.1 Définition

Un nœud de talent est une occurrence d’un talent dans un arbre de spécialisation.

Un même talent peut apparaître dans plusieurs nœuds, dans le même arbre ou dans plusieurs arbres.

### 5.2 Données minimales

Un nœud de talent doit permettre de porter au minimum :

```js
{
  nodeId: "r1c1",
  talentId: "parry",
  row: 1,
  column: 1,
  cost: 5,
  prerequisites: [],
  connections: []
}
```

### 5.3 Identifiant de nœud

Le `nodeId` doit être stable.

La convention recommandée pour la V1 est :

```txt
r{row}c{column}
```

Exemples :

```txt
r1c1
r2c3
r5c4
```

Si les données futures imposent plusieurs nœuds sur une même case, une convention enrichie pourra être introduite plus tard.

### 5.4 Responsabilités

Le nœud porte :

* la référence vers le talent générique ;
* la position dans l’arbre ;
* le coût XP ;
* les connexions ou prérequis d’accès ;
* l’état référentiel nécessaire pour calculer l’accessibilité.

### 5.5 Coût

Le coût d’achat est porté par le nœud.

Aucun coût ne doit être calculé depuis :

* le rang du talent ;
* la définition générique du talent ;
* un fallback générique de type `rank * 5` ;
* une logique héritée de Crucible.

---

## 6. Spécialisations possédées par l’acteur

### 6.1 Définition

Un acteur possède une ou plusieurs spécialisations.

La V1 Talents Edge ne gère pas l’achat d’une nouvelle spécialisation. Elle part du principe que les spécialisations sont déjà présentes sur l’acteur.

### 6.2 Résolution spécialisation → arbre

Chaque spécialisation possédée doit pouvoir être résolue vers un arbre de spécialisation via une référence stable.

Références possibles :

```txt
treeUuid
treeId
importKey
```

ou équivalent technique validé lors de l’implémentation.

### 6.3 Cas d’arbre introuvable

Si l’arbre ne peut pas être résolu :

* la spécialisation reste affichable ;
* l’arbre est marqué indisponible ou incomplet ;
* aucun achat ne doit être possible dans cet arbre ;
* l’UI doit fournir un message compréhensible ;
* un warning technique peut être produit.

### 6.4 Multi-spé

La V1 doit considérer toutes les spécialisations possédées par l’acteur.

Aucune logique liée aux talents ne doit supposer :

* qu’un personnage ne possède qu’une seule spécialisation ;
* que la première spécialisation est la seule pertinente ;
* que les talents ou arbres peuvent être calculés depuis une seule spécialisation.

Les spécialisations possédées servent notamment à :

* déterminer les arbres consultables ;
* sélectionner le contexte d’achat courant ;
* vérifier qu’un achat est réalisé dans une spécialisation possédée ;
* consolider les talents possédés ;
* consolider les rangs des talents ranked ;
* afficher les sources des talents dans l’onglet Talents.

---

## 7. Achat acteur

### 7.1 Définition

Un achat acteur est l’état persistant indiquant qu’un personnage a acheté un nœud donné.

Il ne représente pas directement “un talent possédé”, mais “un nœud acheté dans un arbre”.

### 7.2 Données minimales

Un achat acteur doit permettre de porter au minimum :

```js
{
  treeId: "bodyguard-tree",
  nodeId: "r1c1",
  talentId: "parry",
  specializationId: "bodyguard"
}
```

Selon les conventions Foundry retenues, certaines références peuvent être des UUID :

```js
{
  treeUuid: "Item.xxxxx",
  nodeId: "r1c1",
  talentUuid: "Item.yyyyy",
  specializationUuid: "Item.zzzzz"
}
```

### 7.3 Responsabilités

L’achat acteur permet de recalculer :

* les talents possédés ;
* les rangs consolidés ;
* les sources de talents ;
* les nœuds achetés ;
* les nœuds accessibles ;
* les coûts XP associés aux achats.

### 7.4 Ce que l’achat acteur ne doit pas contenir

L’achat acteur ne doit pas contenir :

* l’historique complet d’achat ;
* les anciennes valeurs ;
* les nouvelles valeurs ;
* les métadonnées détaillées de transaction ;
* une copie complète du talent ;
* une copie complète de l’arbre ;
* les effets mécaniques automatisés.

L’historique d’achat relève du système d’audit/log.

---

## 8. Vue consolidée des talents possédés

### 8.1 Définition

La vue consolidée est une représentation dérivée destinée à l’onglet Talents.

Elle est recalculée à partir :

* des achats acteur ;
* des définitions de talents ;
* des arbres de spécialisation ;
* des spécialisations possédées.

### 8.2 Données affichables

La vue consolidée doit permettre d’afficher :

```js
{
  talentId: "parry",
  name: "Parer",
  activation: "active",
  ranked: true,
  rank: 2,
  sources: [
    {
      specializationId: "bodyguard",
      treeId: "bodyguard-tree",
      nodeId: "r1c1"
    },
    {
      specializationId: "mercenary-soldier",
      treeId: "mercenary-soldier-tree",
      nodeId: "r2c3"
    }
  ]
}
```

### 8.3 Source de vérité

La vue consolidée n’est pas une source de vérité.

Elle ne doit pas être modifiée directement par l’UI.

Elle doit pouvoir être reconstruite à tout moment depuis les achats acteur et les référentiels.

---

## 9. Talents ranked

### 9.1 Règle

Pour les talents ranked, chaque nœud acheté portant le même `talentId` augmente le rang consolidé.

Exemple :

```txt
Parer acheté dans un premier arbre → rang consolidé 1
Parer acheté dans un second arbre → rang consolidé 2
```

### 9.2 Affichage

L’onglet Talents affiche le rang consolidé.

La vue graphique peut afficher :

* le nœud acheté ;
* le rang consolidé actuel ;
* les sources du talent si nécessaire.

### 9.3 Source du rang

Le rang consolidé est calculé depuis les achats acteur.

Il ne doit pas être maintenu manuellement comme donnée principale.

---

## 10. Talents non-ranked présents dans plusieurs arbres

### 10.1 Règle

Un talent non-ranked peut apparaître dans plusieurs nœuds et plusieurs arbres.

Chaque nœud peut être acheté pour permettre la progression dans l’arbre concerné.

Cependant, le bénéfice du talent reste non cumulatif dans la vue consolidée.

### 10.2 Exemple

Si le talent non-ranked `Dur à cuire` est acheté dans deux arbres différents :

* les deux nœuds peuvent être marqués comme achetés ;
* les deux nœuds peuvent contribuer à la progression de leurs arbres respectifs ;
* l’onglet Talents n’affiche pas deux bénéfices cumulés ;
* la vue consolidée affiche le talent une seule fois, avec plusieurs sources.

### 10.3 Conséquence UI

L’UI doit pouvoir signaler qu’un talent non-ranked est déjà possédé mais que le nœud peut malgré tout être acheté pour progresser dans l’arbre concerné.

---

## 11. États minimaux de nœud

### 11.1 États requis

La V1 doit calculer au minimum les états suivants :

| État                    | Signification                                                          |
| ----------------------- | ---------------------------------------------------------------------- |
| `purchased` / acheté    | Le nœud est acheté par l’acteur.                                       |
| `available` / achetable | Le nœud peut être acheté maintenant.                                   |
| `locked` / verrouillé   | Le nœud existe mais ses prérequis ou connexions ne sont pas remplis.   |
| `invalid` / invalide    | Le nœud ou ses références sont incomplets, non résolus ou incohérents. |

### 11.2 Nœud invalide

Un nœud invalide peut résulter de :

* talent introuvable ;
* arbre introuvable ;
* coût manquant ;
* position incohérente ;
* connexion invalide ;
* import incomplet ;
* référence cassée.

Un nœud invalide ne doit pas être achetable.

---

## 12. Accessibilité de base d’un nœud

### 12.1 Règle minimale

Un nœud est achetable si :

* sa spécialisation est possédée ;
* l’arbre est résolu ;
* le nœud est résolu ;
* le nœud n’est pas déjà acheté ;
* le nœud n’est pas invalide ;
* l’acteur dispose de l’XP nécessaire ;
* le nœud est racine ou connecté à un nœud déjà acheté selon les connexions de l’arbre.

### 12.2 Nœud racine

Un nœud racine est un nœud accessible sans achat préalable dans le même arbre.

La méthode exacte d’identification d’un nœud racine dépendra du modèle retenu :

* champ explicite `root: true` ;
* absence de prérequis ;
* rangée initiale ;
* connexions entrantes absentes.

La convention retenue devra être fixée dans la couche règles d’achat.

---

## 13. Données persistées sur l’acteur

### 13.1 Données persistées

L’acteur persiste uniquement l’état nécessaire au jeu et à la progression :

* spécialisations possédées ;
* achats de nœuds de talents ;
* références vers les arbres concernés ;
* références vers les talents concernés ;
* références nécessaires au recalcul des coûts XP.

### 13.2 Données non persistées

L’acteur ne persiste pas :

* les arbres complets ;
* les définitions complètes de talents ;
* la vue consolidée comme source de vérité ;
* l’historique détaillé des achats ;
* les effets mécaniques automatisés ;
* les données d’audit/log.

---

## 14. Invariants métier

Les invariants suivants doivent rester vrais dans toute l’implémentation V1 :

1. Un achat porte sur un nœud d’arbre.
2. Un nœud appartient à un arbre de spécialisation.
3. Un arbre de spécialisation est un référentiel monde/compendium.
4. L’acteur ne stocke pas les arbres complets.
5. Un talent générique ne porte pas le coût d’achat.
6. Le coût d’achat vient du nœud.
7. La vue consolidée est dérivée.
8. Le rang consolidé est dérivé des achats acteur.
9. Les talents non-ranked ne cumulent pas leurs bénéfices.
10. Plusieurs nœuds non-ranked peuvent être achetés s’ils servent la progression d’arbres distincts.
11. Les spécialisations possédées doivent toutes être prises en compte.
12. Aucune logique V1 liée aux talents ne doit supposer que seule la première spécialisation est pertinente.
13. L’historique détaillé relève de l’audit/log, pas de l’acteur.

---

## 15. Hors périmètre du modèle domaine V1

Le modèle domaine V1 ne couvre pas :

* automatisation mécanique des effets de talents ;
* projection ActiveEffects ;
* talents signatures ;
* achat de nouvelles spécialisations ;
* consultation des spécialisations non possédées ;
* édition manuelle des arbres ;
* remboursement / suppression complète avec recalcul intelligent ;
* mode MJ override ;
* drag & drop d’achat depuis la fiche.

---

## 16. Issues GitHub dérivables

Ce document prépare notamment les issues suivantes :

* définir le type `specialization-tree` ;
* définir la structure des nœuds de talent ;
* définir la structure des achats acteur ;
* résoudre les spécialisations possédées vers leurs arbres ;
* calculer la vue consolidée des talents possédés ;
* gérer les talents ranked ;
* gérer les talents non-ranked présents dans plusieurs arbres ;
* calculer les états minimaux des nœuds ;
* traiter les arbres ou nœuds invalides ;
* supprimer ou isoler les hypothèses mono-spécialisation dans les flux talents.

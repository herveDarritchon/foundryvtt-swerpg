# Point de vigilance 2 — Règles d’achat Crucible

Je le traiterais **avant le canvas hérité**, parce que l’UI arbre doit s’appuyer sur une règle métier saine. Sinon, tu risques de refaire une belle vue graphique branchée sur une mauvaise logique.

## Diagnostic

Le problème identifié dans ton cadrage est sérieux :

```txt
coût hardcodé à rank * 5
logique isCreation comme garde-fou
mélange XP / talent points
logiques réparties entre talent.mjs, actor-mixins/talents.mjs et module/lib/talents/*.mjs
```

Ces éléments sentent clairement l’héritage Crucible ou une logique générique non Edge.

Pour Edge, la règle centrale doit être :

> Un talent s’achète via un nœud précis d’un arbre de spécialisation possédé. Le coût vient du nœud. L’accessibilité vient des connexions/prérequis de l’arbre. Le rang consolidé vient des achats acteur.

Donc ce point est **à traiter dans la V1**, sans ambiguïté.

---

## Décision de cadrage proposée

À ajouter dans l’instruction des points de vigilance :

```md
### Point de vigilance — Règles d’achat Crucible

**Décision** : à traiter dans la V1.

La V1 remplace les règles d’achat héritées de Crucible par une couche domaine dédiée aux talents Edge.

La logique d’achat ne doit plus :
- calculer le coût depuis le rang du talent ;
- utiliser `isCreation` comme garde-fou métier ;
- mélanger XP, talent points et états UI ;
- dépendre directement du rendu graphique ;
- modifier la vue consolidée comme source de vérité.

La logique d’achat doit :
- partir d’un acteur ;
- vérifier que la spécialisation concernée est possédée ;
- vérifier que l’arbre de spécialisation référencé existe ;
- vérifier que le nœud existe dans cet arbre ;
- vérifier que le nœud n’est pas déjà acheté ;
- vérifier que les prérequis / connexions rendent le nœud accessible ;
- lire le coût XP depuis le nœud ;
- vérifier que l’acteur dispose de l’XP nécessaire ;
- persister l’achat du nœud sur l’acteur ;
- déclencher le recalcul de la vue consolidée ;
- laisser l’audit/log tracer l’opération sans stocker l’historique dans l’acteur.
```

---

## Couche domaine attendue

Je recommanderais de formaliser une couche pure, testable sans Foundry.

Nom possible :

```txt
module/domain/talents/talent-purchase-service.mjs
```

ou :

```txt
module/lib/talents/edge-talent-purchase.mjs
```

Mais conceptuellement, il faut éviter une logique enfouie dans :

* la fiche acteur ;
* le modèle `Talent`;
* la vue PIXI ;
* les handlers d’événements UI.

La bonne forme :

```txt
canPurchaseTalentNode(actor, specializationTree, nodeId)
purchaseTalentNode(actor, specializationTree, nodeId)
buildOwnedTalentSummary(actor, talentDefinitions, specializationTrees)
getAccessibleTalentNodes(actor, specializationTree)
```

Avec une séparation claire :

```txt
Règle métier pure
↓
Adaptateur Foundry / Actor.update()
↓
UI refresh
↓
Audit/log
```

---

## Règles minimales à couvrir en V1

### 1. Achat simple

Un nœud non acheté, accessible, dans un arbre possédé, peut être acheté si l’acteur a assez d’XP.

### 2. Talent ranked

Un talent ranked peut être acheté plusieurs fois **uniquement via plusieurs nœuds valides**.

Le rang consolidé est :

```txt
nombre d’achats acteur portant sur le même talentId
```

ou éventuellement :

```txt
somme des achats valides du même talentId
```

Mais surtout pas :

```txt
rank + 1 parce que le talent est ranked
```

hors contexte de nœud.

### 3. Talent non-ranked

Un talent non-ranked ne doit pas être acheté plusieurs fois comme bénéfice cumulable.

Cas à trancher : si le même talent non-ranked apparaît dans plusieurs arbres, est-ce qu’on autorise l’achat du second nœud ?

Pour Edge, je recommanderais :

```md
Un talent non-ranked déjà possédé est considéré comme acquis. Si un autre nœud du même talent apparaît dans un autre arbre, il peut être marqué comme “déjà possédé” ou “achat non nécessaire”, mais ne doit pas augmenter le rang ni doubler l’effet.
```

À décider techniquement, parce que ça impacte l’UI arbre.

### 4. Accessibilité par connexions

Un nœud est achetable si :

* il appartient à l’arbre sélectionné ;
* sa spécialisation est possédée ;
* il est dans la rangée accessible initiale, ou connecté à un nœud déjà acheté selon les règles du template ;
* ses prérequis éventuels sont remplis.

### 5. XP

Le coût vient du nœud.

```txt
node.cost
```

Pas du talent.

Pas du rang.

Pas d’un calcul générique.

---

## Point à décider tout de suite : talents non-ranked en doublon

C’est le seul vrai choix métier à arbitrer maintenant.

Je te propose cette décision :

```md
Un talent non-ranked déjà possédé n’est pas cumulable. Si un nœud correspondant apparaît dans un autre arbre de spécialisation possédé, la V1 l’affiche comme déjà acquis / non cumulable. L’achat du nœud peut être interdit en V1 pour éviter les dépenses XP inutiles, sauf décision contraire ultérieure.
```

C’est protecteur pour le joueur.

Mais il y a une nuance : dans les règles FFG, certains talents non-ranked peuvent apparaître dans plusieurs arbres ; acheter une autre occurrence peut parfois servir à progresser dans cet arbre même si le bénéfice du talent n’est pas doublé. Donc interdire totalement l’achat peut bloquer l’accès aux nœuds suivants.

La meilleure décision V1 serait donc :

```md
Un talent non-ranked déjà possédé peut être acheté à nouveau si l’achat d’un nœud différent est nécessaire pour progresser dans un autre arbre. Le bénéfice du talent reste non cumulatif, mais le nœud acheté compte pour l’accessibilité de l’arbre concerné.
```

C’est plus fidèle à la logique des arbres.

---

## Décision recommandée

Voici la version que je mettrais dans le cadrage :

```md
### Point de vigilance — Règles d’achat Crucible

**Décision** : à traiter dans la V1.

La V1 remplace les règles d’achat héritées de Crucible par une couche domaine Edge dédiée, testable sans Foundry.

Le coût d’un achat est toujours lu depuis le nœud de l’arbre de spécialisation. Aucun coût ne doit être calculé depuis le rang du talent.

Un achat porte sur un nœud d’arbre, pas directement sur une définition générique de talent.

Pour les talents ranked, chaque nœud acheté portant le même talent augmente le rang consolidé.

Pour les talents non-ranked, plusieurs nœuds distincts peuvent être achetés si cela est nécessaire à la progression dans plusieurs arbres, mais le bénéfice du talent reste non cumulatif dans la vue consolidée.

La logique d’achat doit vérifier :
- que la spécialisation est possédée ;
- que l’arbre existe ;
- que le nœud existe ;
- que le nœud n’est pas déjà acheté ;
- que le nœud est accessible ;
- que l’acteur dispose de l’XP nécessaire ;
- que l’achat peut être persisté sur l’acteur.

Les anciennes logiques `isCreation`, `rank * 5`, talent points ou équivalents Crucible doivent être supprimées, isolées ou neutralisées pour le flux V1.
```

## Statut du point

```txt
Règles d’achat Crucible : À traiter dans la V1
```

Pas reporté. Pas optionnel.

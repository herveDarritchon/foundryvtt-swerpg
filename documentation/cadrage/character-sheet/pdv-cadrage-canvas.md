# Point de vigilance 4 — Canvas hérité

C’est le point où il faut être dur : **le canvas actuel ne doit pas être adapté**. Il doit être considéré comme un reliquat technique à auditer, puis largement remplacé.

## Diagnostic

Le cadrage dit déjà :

> Le code actuel de l'arbre de talents peut servir de référence technique ponctuelle, mais il n'est pas considéré comme une base métier réutilisable.

C’est la bonne décision.

Le risque, maintenant, serait qu’en implémentation quelqu’un se dise :

> “On va juste adapter `talent-tree.mjs` et remplacer deux/trois champs.”

Mauvaise idée.

Pourquoi ? Parce que l’existant semble partir d’une logique Crucible :

```txt
un arbre global
des nodes génériques
une choice wheel
des coûts ou achats non Edge
un couplage fort UI / achat / état
```

Or la V1 Edge demande :

```txt
plusieurs arbres de spécialisation
un seul contexte d’achat UI
des arbres possédés seulement
des nœuds avec coût propre
des achats persistés sur l’acteur
une vue consolidée dérivée
aucune choice wheel métier
```

Donc l’ancien canvas peut inspirer quelques détails techniques, mais pas structurer la nouvelle feature.

---

## Décision de cadrage proposée

```md
### Point de vigilance — Canvas hérité

**Décision** : à traiter dans la V1 comme audit technique, mais sans reconduction fonctionnelle de l’existant.

Le canvas / arbre de talents hérité de Crucible n’est pas une base métier réutilisable. La V1 réimplémente une vue graphique dédiée aux arbres de spécialisation Edge, indépendante du canvas de scène Foundry.

Les modules existants liés à l’arbre peuvent être consultés uniquement pour identifier des patterns techniques génériques :
- initialisation d’un rendu PIXI dans une application dédiée ;
- rendu de formes simples ;
- gestion du pan / zoom ;
- gestion du hover / clic ;
- nettoyage du cycle de vie à la fermeture ;
- éventuels helpers graphiques découplés du métier.

Aucune logique métier héritée ne doit être reconduite si elle suppose :
- un arbre global ;
- une choice wheel métier ;
- un coût calculé hors nœud ;
- un achat direct de talent générique ;
- une source de vérité UI ;
- une dépendance au canvas de scène ;
- une logique Crucible de création/progression.
```

---

## Ce qui peut être réutilisé

Uniquement des patterns techniques, pas des règles.

| Élément hérité                 |                  Statut recommandé | Pourquoi                                                                        |
| ------------------------------ | ---------------------------------: | ------------------------------------------------------------------------------- |
| `talent-tree.mjs`              |                     **À réécrire** | Probable cœur d’une logique d’arbre global.                                     |
| `talent-tree-node.mjs`         |                     **À réécrire** | Le nœud Edge doit porter coût, référence talent, état achat/accessibilité.      |
| `talent-choice-wheel.mjs`      |           **À ignorer / reporter** | La “choice wheel” ne correspond pas au fonctionnement standard des arbres Edge. |
| HUD / infobulle                | **Réutilisable comme inspiration** | Seulement pour patterns UI : affichage détails, hover, état.                    |
| Gestion événements souris      | **Réutilisable comme inspiration** | À condition d’être découplée du métier.                                         |
| Rendu de connexions            | **Réutilisable comme inspiration** | Si c’est purement graphique.                                                    |
| Ouverture/fermeture de fenêtre | **Réutilisable comme inspiration** | À adapter à une application Foundry dédiée.                                     |
| Intégration canvas scène       |                      **À ignorer** | La vue ne doit pas dépendre du canvas principal.                                |

---

## Point important : abandonner la “choice wheel” en V1

Je le formaliserais explicitement.

La `talent-choice-wheel` est suspecte parce qu’elle suppose qu’un nœud peut ouvrir un choix de talents. Ce n’est pas le comportement standard attendu pour un arbre de spécialisation Edge.

Décision recommandée :

```md
La V1 ne reconduit pas la logique de choice wheel comme mécanisme métier. Un nœud correspond à une occurrence de talent définie par l’arbre de spécialisation. L’interaction principale d’un nœud est : consulter / acheter / comprendre pourquoi il est verrouillé.
```

Tu peux garder plus tard un menu radial comme **pure interaction UI** si tu veux, mais pas comme mécanique de choix de talent.

---

## Architecture cible de la vue graphique

À ce stade, le cadrage peut rester général, mais il faut fixer les responsabilités.

```txt
Application Foundry dédiée
↓
Charge acteur + spécialisations possédées
↓
Résout les arbres référentiels disponibles
↓
Calcule les états de nœuds via la couche domaine
↓
Rend les nœuds / connexions
↓
Sur achat : appelle le service domaine
↓
Met à jour acteur
↓
Recalcule vue consolidée + états graphiques
```

Surtout :

```txt
La vue graphique ne calcule pas les règles d’achat elle-même.
```

Elle demande à la couche domaine :

```js
getTreeState(actor, specializationTree)
canPurchaseNode(actor, specializationTree, nodeId)
purchaseNode(actor, specializationTree, nodeId)
```

---

## États graphiques minimaux

La vue arbre doit afficher au minimum :

```txt
owned / acheté
available / achetable
locked / verrouillé
alreadyOwnedNonRanked / déjà possédé via autre arbre, mais nœud éventuellement achetable pour progression
invalid / données incomplètes
```

Je recommande d’inclure `invalid` dès la V1, parce que l’import OggDude peut produire des nœuds incomplets.

### États proposés

```js
{
  nodeId: "r2c3",
  talentId: "parry",
  purchaseState: "purchased" | "available" | "locked" | "invalid",
  displayState: {
    ranked: true,
    consolidatedRank: 2,
    cost: 10,
    missingReason: null
  }
}
```

Pour les non-ranked déjà possédés dans un autre arbre, je ne créerais pas un état principal séparé. Je mettrais plutôt un flag :

```js
{
  purchaseState: "available",
  alreadyOwnedNonRanked: true,
  benefitAlreadyOwned: true
}
```

Comme ça, l’UI peut dire :

> “Talent déjà possédé ; acheter ce nœud peut néanmoins débloquer la progression dans cet arbre.”

---

## Ce que la vue ne doit pas faire

À écrire clairement :

```md
La vue graphique ne doit pas :
- stocker l’état métier durable ;
- calculer elle-même les coûts ;
- décider seule de l’accessibilité ;
- créer des talents possédés hors achat de nœud ;
- modifier directement la vue consolidée ;
- dépendre du canvas de scène Foundry ;
- reprendre la logique de choice wheel Crucible comme modèle d’achat.
```

---

## Texte prêt à ajouter au cadrage

```md
### Point de vigilance — Canvas hérité

**Décision** : à traiter dans la V1 comme audit technique, sans reconduction fonctionnelle.

Le canvas / arbre de talents hérité de Crucible n’est pas une base métier réutilisable. La V1 réimplémente une vue graphique dédiée aux arbres de spécialisation Edge, indépendante du canvas de scène Foundry.

Les modules existants peuvent seulement servir à identifier des patterns techniques génériques : rendu PIXI, pan/zoom, gestion du hover/clic, rendu de connexions, cycle de vie d’une vue graphique. Aucune logique métier héritée ne doit être reprise si elle suppose un arbre global, une choice wheel métier, un coût calculé hors nœud, un achat direct de talent générique, ou une source de vérité portée par l’UI.

La V1 ne reconduit pas la logique de choice wheel comme mécanisme métier. Un nœud correspond à une occurrence de talent définie par l’arbre de spécialisation. L’interaction principale d’un nœud est : consulter, acheter, ou comprendre pourquoi il est verrouillé.

La vue graphique délègue les règles d’achat, d’accessibilité et de consolidation à la couche domaine. Elle ne stocke pas l’état métier durable et ne dépend pas du canvas de scène Foundry.
```

## Statut du point

```txt
Canvas hérité : à traiter dans la V1 comme audit technique, mais à réécrire fonctionnellement.
```

Ce n’est pas reporté, parce qu’il faut encadrer ce qu’on fait de l’existant.
Mais ce n’est pas une migration : c’est une **réimplémentation contrôlée**.
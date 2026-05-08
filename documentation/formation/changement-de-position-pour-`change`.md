Oui. La raison profonde n’est pas “déplacer un tableau pour embêter les développeurs”. C’est une décision d’architecture.

Avant V14, `changes` était une propriété **core** de `ActiveEffect`. Donc Foundry disait implicitement :

```txt
Un ActiveEffect contient une liste standard de changements.
Tous les systèmes utilisent globalement la même structure.
```

En V14, `changes` passe dans `system.changes`. Donc Foundry dit maintenant :

```txt
Un ActiveEffect est aussi un document propre au système.
La structure exacte de ses changements appartient au système.
```

C’est ça le vrai changement.

---

## 1. Pourquoi Foundry a fait ça ?

La raison officielle donnée dans l’issue de migration est de permettre un **plus grand contrôle par les clients/packages sur la structure de `EffectChangeData`**. Foundry indique que le tableau est migré vers le `TypeDataModel` à `ActiveEffect#system`, et que les `TypeDataModels` fournis par les packages doivent implémenter ce champ, idéalement en sous-classant `foundry.data.ActiveEffectTypeDataModel`. Foundry précise aussi que le modèle impose seulement que chaque change contienne `type`, `phase` et `priority`. ([GitHub][1])

Donc la motivation est très claire : **sortir les Active Effects d’un format unique trop rigide**.

Avant, Foundry imposait un modèle assez universel :

```js
{
  key,
  mode,
  value,
  priority
}
```

C’était pratique pour les bonus simples, mais trop limité pour des systèmes complexes.

En V14, Foundry laisse les systèmes définir des formes de changements plus adaptées :

```js
{
  type: "add",
  key: "system.attributes.speed",
  value: "3",
  phase: "apply",
  priority: 20
}
```

mais aussi, potentiellement :

```js
{
  type: "grantTrait",
  trait: "flying",
  phase: "prepareTraits",
  priority: 10
}
```

ou :

```js
{
  type: "rollOption",
  selector: "attack",
  option: "advantage",
  phase: "prepareRolls",
  priority: 30
}
```

Ça, l’ancien modèle le permettait mal ou seulement en détournant `key`, `mode`, `value` et `flags`.

---

## 2. Le problème de l’ancien modèle

L’ancien modèle était trop centré sur une idée simple :

```txt
Je prends une valeur de l’Actor.
Je la modifie.
```

Exemple :

```js
{
  key: "system.attributes.ac.value",
  mode: CONST.ACTIVE_EFFECT_MODES.ADD,
  value: "2"
}
```

Pour un bonus de CA, ça marche.

Mais dès qu’un système veut exprimer des règles plus riches, le modèle devient sale.

Exemples :

```txt
Accorder l’avantage à certains jets.
Ajouter une option de roll.
Ajouter une règle spéciale.
Modifier le token.
Gérer une aura.
Gérer un effet qui expire à un événement précis.
Ajouter une condition qui est aussi un statut visible.
Créer une règle qui dépend de la source de l’effet.
Gérer un effet qui existe mais ne doit pas s’appliquer parce que l’item n’est pas équipé.
```

En V13 et avant, on finissait souvent avec :

```txt
flags système
hooks maison
macros
modules comme DAE
valeurs magiques dans key/value
logique cachée dans prepareData
effets désactivés artificiellement
```

Donc le problème n’était pas que les Active Effects ne marchaient pas. Le problème était qu’ils étaient devenus un **fourre-tout bricolé** dès qu’un système avait des règles sérieuses.

---

## 3. Ce que permet `system.changes`

Le déplacement vers `system.changes` veut dire que les changes appartiennent maintenant au **data model du système**.

C’est exactement le même raisonnement que pour les Actors et les Items.

Avant, personne ne trouverait normal d’avoir tous les systèmes avec le même `Actor.data` figé par Foundry. Chaque système a son propre `Actor.system`.

En V14, Foundry applique cette logique aux Active Effects :

```txt
Actor.system       → données d’acteur propres au système
Item.system        → données d’item propres au système
ActiveEffect.system → données d’effet propres au système
```

C’est cohérent.

Et surtout, ça permet au système de valider, migrer, documenter et spécialiser ses effets.

Par exemple, un système peut décider que ses Active Effects ont :

```js
system: {
  category: "condition",
  sourceType: "spell",
  stackGroup: "morale",
  changes: [...]
}
```

Ou bien :

```js
system: {
  changes: [...],
  suppression: {
    requiresEquippedItem: true,
    requiresAttunement: true
  }
}
```

Ou encore :

```js
system: {
  rules: [...],
  changes: [...]
}
```

Avant V14, on aurait probablement mis tout ça dans :

```js
flags["my-system"]
```

Ce qui marche, mais c’est moins propre, moins validé, moins migrable, et plus difficile à exposer dans une feuille d’effet.

---

## 4. En quoi ça change vraiment les choses ?

### Avant : l’effet était surtout un patch

Ancien modèle mental :

```txt
ActiveEffect = patch temporaire sur l’Actor
```

Donc un effet était principalement une liste de modifications.

### Maintenant : l’effet devient un objet de règles

Nouveau modèle mental :

```txt
ActiveEffect = document système typé qui décrit un état, une règle, une durée, une origine, une cible et des changements.
```

C’est plus puissant.

Un effet peut maintenant être :

```txt
un bonus numérique,
une condition,
un effet d’item,
un effet de sort,
une aura,
un effet environnemental,
un effet de token,
un conteneur de règles système,
un état supprimé temporairement,
un effet avec expiration événementielle.
```

Le passage à `system.changes` est la base technique qui rend ça propre.

---

## 5. Pourquoi ne pas avoir gardé `changes` à la racine ?

Parce que `changes` à la racine appartenait au **Core**.

Donc si un système voulait changer la structure des changes, il devait soit :

1. rester dans le format imposé ;
2. détourner les champs existants ;
3. ajouter des `flags` ;
4. surcharger beaucoup de logique ;
5. attendre que le Core accepte son cas particulier.

En mettant `changes` dans `system`, Foundry dit :

```txt
Le Core fournit le cadre.
Le système définit la forme exacte de ses effets.
```

C’est une inversion importante.

Le Core n’a plus besoin de savoir tous les types de règles possibles pour tous les jeux. C’est le système qui sait.

---

## 6. Exemple concret : système simple

Dans un système simple, ça ne change presque rien fonctionnellement.

Avant :

```js
changes: [
  {
    key: "system.speed",
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    value: "2",
    priority: 20
  }
]
```

Après :

```js
system: {
  changes: [
    {
      key: "system.speed",
      type: "add",
      value: "2",
      phase: "apply",
      priority: 20
    }
  ]
}
```

Pour un petit système, c’est surtout une migration syntaxique.

---

## 7. Exemple concret : système complexe

Prenons un système avec :

```txt
bonus typés,
avantages,
conditions,
règles de cumul,
effets supprimés si l’objet n’est pas équipé,
effets de token,
expiration à la fin d’un tour,
roll options.
```

L’ancien modèle forçait souvent à faire ça :

```js
changes: [
  {
    key: "flags.mySystem.rollOptions.attack.advantage",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    value: "true"
  }
]
```

C’est moche parce que l’effet ne décrit pas vraiment une règle. Il écrit dans un chemin technique.

En V14, on peut tendre vers un modèle plus déclaratif :

```js
system: {
  changes: [
    {
      type: "rollOption",
      selector: "attack",
      option: "advantage",
      phase: "prepareRolls",
      priority: 20
    }
  ]
}
```

Là, l’effet dit clairement :

```txt
J’ajoute une option de jet.
Elle concerne les attaques.
L’option est advantage.
Elle s’applique pendant la phase prepareRolls.
```

C’est plus lisible, plus maintenable, plus testable.

---

## 8. À quoi sert `phase` ?

C’est un point très important.

Dans l’ancien modèle, on avait surtout une logique d’application assez linéaire :

```txt
préparer l’acteur
appliquer les effets
calculer les données
```

Mais en vrai, les systèmes ont souvent plusieurs moments différents :

```txt
préparation des données de base
préparation des traits
préparation des statistiques
préparation des attaques
préparation des jets
préparation de l’affichage
préparation du token
```

Le champ `phase` permet de dire **à quel moment logique** le changement doit être appliqué.

Exemple :

```js
{
  type: "add",
  key: "system.attributes.strength.value",
  value: "2",
  phase: "apply",
  priority: 20
}
```

vs :

```js
{
  type: "rollOption",
  selector: "perception",
  option: "advantage",
  phase: "prepareRolls",
  priority: 20
}
```

Ce ne sont pas les mêmes moments du pipeline.

C’est fondamental pour éviter le vieux problème :

```txt
Mon effet est bien appliqué, mais il est écrasé par prepareDerivedData après.
```

Ou l’inverse :

```txt
Mon effet s’applique trop tard, donc le total affiché n’en tient pas compte.
```

---

## 9. À quoi sert `priority` ?

`priority` existait déjà dans l’esprit, mais V14 le remet dans un cadre plus propre.

Il sert à résoudre l’ordre d’application.

Exemple :

```txt
multiply avant add
add avant upgrade
upgrade avant override
```

Foundry V14 définit des priorités par défaut pour les types natifs : `custom: 0`, `multiply: 10`, `add/subtract: 20`, `downgrade: 30`, `upgrade: 40`, `override: 50`. ([GitHub][1])

Pourquoi c’est important ?

Parce que :

```txt
(base 10 + 2) × 2 = 24
(base 10 × 2) + 2 = 22
```

L’ordre change le résultat.

Donc `priority` permet au système de dire :

```txt
ce changement s’applique avant celui-là
```

Ce n’est pas un détail technique. C’est une règle de jeu.

---

## 10. À quoi sert `type` ?

`type` remplace le vieux réflexe `mode`.

Avant :

```js
mode: CONST.ACTIVE_EFFECT_MODES.ADD
```

Maintenant, on pense plutôt :

```js
type: "add"
```

Mais l’intérêt n’est pas juste le renommage.

`type` peut devenir un vocabulaire extensible.

Les types natifs peuvent être :

```txt
add
subtract
multiply
override
upgrade
downgrade
custom
```

Mais un système peut aussi raisonner avec des types métiers :

```txt
grantTrait
grantAction
rollOption
applyResistance
suppressEffect
tokenOverride
```

Le Core impose seulement un minimum structurel, ce qui donne de la liberté aux systèmes. ([GitHub][1])

---

## 11. Le bénéfice pour les migrations

Mettre `changes` dans `system` facilite aussi les migrations.

Pourquoi ?

Parce que le système peut écrire une migration ciblée :

```js
if (effect.type === "condition") {
  // migrer les anciens changes de condition
}

if (effect.system.category === "equipment") {
  // migrer les effets d'équipement
}
```

Avec l’ancien modèle, beaucoup d’informations étaient éclatées entre :

```txt
effect.changes
effect.flags
effect.origin
effect.disabled
item.system
actor.system
```

En V14, un système peut regrouper ce qui lui appartient dans :

```txt
effect.system
```

C’est plus propre.

---

## 12. Le bénéfice pour les feuilles d’effet

Avant, une sheet d’Active Effect devait souvent afficher un tableau générique :

```txt
key | mode | value | priority
```

C’était très technique.

Avec `system.changes`, un système peut créer une UI plus intelligente.

Par exemple, au lieu de demander à un MJ :

```txt
key = system.attributes.ac.bonus
mode = ADD
value = 2
```

La sheet peut proposer :

```txt
Type d’effet : Bonus
Statistique : Armure
Catégorie : Statut
Valeur : +2
Durée : 1 round
Expiration : début du prochain tour
```

Puis générer derrière :

```js
{
  type: "add",
  key: "system.modifiers.ac.status",
  value: "2",
  phase: "apply",
  priority: 20
}
```

C’est beaucoup plus accessible.

---

## 13. Le bénéfice pour l’écosystème

C’est aussi une décision utile pour les modules.

Avant, les modules qui voulaient enrichir les Active Effects devaient se battre avec un modèle core assez fermé. D’où l’importance historique de modules comme Dynamic Active Effects, qui ajoute des capacités que le Core ne couvrait pas ou couvrait mal. La page du package DAE mentionne notamment la capacité à changer plus de champs, référencer d’autres champs dans les calculs, appeler des macros ou appliquer d’autres effets/conditions. ([foundryvtt.com][2])

En V14, Foundry absorbe une partie de ces besoins dans le Core : effets plus structurables, valeurs dynamiques, effets de token, expiration plus riche, etc. Les notes V14 indiquent par exemple que les Active Effects peuvent maintenant modifier des propriétés de Token via `Actor.tokenOverrides`, comme vision, modes de détection, lumière, image, alpha, disposition ou taille. ([foundryvtt.com][3])

Donc `system.changes` est une brique de cette évolution : moins de hacks, plus de contrat système.

---

## 14. La contrepartie : ce n’est pas gratuit

Il y a un coût.

Pour les anciens développeurs, c’est plus lourd :

```txt
il faut un ActiveEffect TypeDataModel ;
il faut migrer les anciens effets ;
il faut adapter les sheets ;
il faut adapter les macros ;
il faut documenter les types de changes du système ;
il faut tester l’ordre d’application ;
il faut décider quelles règles sont natives, custom ou déclaratives.
```

Donc oui, V14 rend les Active Effects plus puissants, mais elle force aussi les systèmes à être plus sérieux.

C’est une bonne chose pour un système maintenu à long terme. C’est pénible pour un système ancien qui avait beaucoup de code opportuniste.

---

## 15. La réponse courte à donner aux développeurs

Le déplacement de `changes` vers `system.changes` sert à trois choses principales.

Premièrement, **redonner la main aux systèmes**. Les effets ne sont plus limités à un tableau core générique. Chaque système peut définir son propre modèle d’effet.

Deuxièmement, **rendre les effets plus expressifs**. Un effet peut maintenant représenter autre chose qu’un simple patch de donnée : condition, règle de jet, effet d’item, effet de token, aura, état temporaire, etc.

Troisièmement, **réduire les hacks historiques**. Moins de flags détournés, moins de hooks dispersés, moins de modules nécessaires pour des cas désormais couverts par le Core.

La phrase à retenir :

> Avant V14, `changes` disait : “voici comment le Core modifie l’Actor”.
> En V14, `system.changes` dit : “voici comment ce système décrit et applique ses effets”.

Et c’est une vraie différence d’architecture, pas un simple renommage.

[1]: https://github.com/foundryvtt/foundryvtt/issues/13740?utm_source=chatgpt.com "Migrate `ActiveEffect#changes` to ` ..."
[2]: https://foundryvtt.com/packages/dae?utm_source=chatgpt.com "Dynamic Active Effects"
[3]: https://foundryvtt.com/releases/14.353?utm_source=chatgpt.com "Release 14.353"

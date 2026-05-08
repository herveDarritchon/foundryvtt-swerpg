# Rapport comparatif — Active Effects “V1” vs Active Effects “V2” dans Foundry VTT V14

Je vais appeler :

* **Active Effects V1** : le modèle historique introduit autour de V7/V8 et encore reconnaissable jusqu’en V13.
* **Active Effects V2** : la refonte V14, explicitement nommée ainsi dans les notes de version Foundry VTT V14. Foundry
  présente V14 comme une version qui “étend significativement” les Active Effects avec expiration améliorée, événements
  d’expiration et modification du token de l’acteur. ([foundryvtt.com][1])

L’idée centrale : **V14 ne change pas seulement quelques champs. Elle change le statut architectural des Active Effects.** Avant, c’était surtout un mécanisme de modification de données d’Actor. En V14, cela devient un système plus
structuré : modèle typé, durées plus riches, registre d’expiration, interaction avec le token, valeurs dynamiques,
meilleures bases pour les systèmes.

---

# 1. Résumé exécutif

Pour des développeurs habitués à V7/V8/V9/V10/V11/V12/V13, les changements importants sont les suivants :

| Sujet                   | Avant V14 — “V1”                                      | V14 — “V2”                                                                | Impact développeur                                       |
|-------------------------|-------------------------------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------|
| Emplacement des changes | `ActiveEffect#changes` à la racine                    | `ActiveEffect#system#changes`                                             | Migration obligatoire du modèle de données               |
| Modèle de données       | Structure relativement fixe                           | `ActiveEffect` possède un `system` typé via `TypeDataModel`               | Les systèmes doivent fournir un modèle AE propre         |
| Forme des changes       | Change classique : key/mode/value/priority            | Structure plus flexible, avec `type`, `phase`, `priority` requis          | Les systèmes peuvent étendre la logique plus proprement  |
| Durée                   | Principalement durée temporelle / combat plus limitée | `start`, `duration.units`, `duration.value`, `duration.expiry`            | Fin des bricolages courants sur rounds/tours             |
| Expiration              | Souvent gérée par système/module                      | Registre natif `ActiveEffect.registry`                                    | Les systèmes doivent s’intégrer au registre              |
| Token                   | AE modifie surtout Actor                              | AE peut aussi modifier des propriétés du Token via `Actor.tokenOverrides` | Torches, vision, lumière, apparence deviennent natifs    |
| Valeurs dynamiques      | Pas de référence native robuste aux données Actor     | Les valeurs d’effet peuvent référencer les données Actor                  | Moins besoin de `custom` ou de modules pour certains cas |
| Modes de changement     | Add, multiply, override, upgrade, downgrade, custom   | Ajout officiel de `subtract`                                              | Suppression de valeurs et malus plus propres             |
| Transfert legacy        | Ancien framework de transfert, déprécié               | Suppression finale du legacy transferral                                  | Les systèmes doivent utiliser le modèle moderne          |
| Statuts / icônes        | Plus limité                                           | Meilleur contrôle de présentation prévu en V14                            | Effets et conditions plus propres côté UX                |

---

# 2. Le plus gros changement : `changes` n’est plus à la racine

## Avant V14

Historiquement, on écrivait ou lisait souvent :

```js
effect.changes
```

ou on créait un effet comme ceci :

```js
await actor.createEmbeddedDocuments("ActiveEffect", [{
  name: "Bless",
  changes: [
    {
      key: "system.attributes.attack.bonus",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: "1",
      priority: 20
    }
  ],
  duration: {
    rounds: 10
  }
}]);
```

C’était le modèle mental des Active Effects V1 : un document `ActiveEffect` avec une propriété racine `changes`.

## En V14

Le changement structurel est explicite : Foundry migre `ActiveEffect#changes` vers `ActiveEffect#system#changes`.
L’objectif annoncé est de donner plus de contrôle aux clients et aux packages sur la structure de `EffectChangeData`.
Les modèles AE fournis par les packages doivent implémenter ce champ, le plus simplement en sous-classant
`foundry.data.ActiveEffectTypeDataModel`. ([GitHub][2])

Donc le modèle devient plutôt :

```js
await actor.createEmbeddedDocuments("ActiveEffect", [{
  name: "Bless",
  type: "base",
  system: {
    changes: [
      {
        key: "system.attributes.attack.bonus",
        type: "add",
        value: "1",
        phase: "apply",
        priority: 20
      }
    ]
  },
  duration: {
    units: "rounds",
    value: 10,
    expiry: "turnStart"
  }
}]);
```

Les noms exacts de `type`, `phase`, `expiry` doivent être vérifiés dans l’API effective et dans le système cible, mais
le principe est celui-ci : **les changes font désormais partie du `system` data model de l’effet**.

## Conséquence

C’est le point qui va casser le plus de code ancien.

À migrer :

```js
effect.changes
```

vers :

```js
effect.system.changes
```

Et à migrer dans les créations :

```js
{
  changes: [...]
}
```

vers :

```js
{
  system: {
    changes: [...]
  }
}
```

Le vrai enjeu n’est pas seulement syntaxique : un système V14 doit maintenant considérer les Active Effects comme des
documents avec **leur propre modèle système**, pas comme un document core avec un simple tableau générique de
changements.

---

# 3. Le modèle Active Effect devient réellement typé

En V14, `ActiveEffect` possède officiellement un champ `system` dans son schéma, via un `TypeDataField`. L’API V14 liste
notamment `_id`, `name`, `img`, `origin`, `duration`, `start`, `statuses`, `system`, `transfer`, `type`, etc., dans le
schéma de base. ([foundryvtt.com][3])

C’est une bascule importante.

## Avant

Beaucoup de systèmes traitaient les Active Effects comme une fonctionnalité “core” presque externe au système :

```txt
Actor.system est typé.
Item.system est typé.
ActiveEffect est semi-générique.
```

## Maintenant

Le système doit penser :

```txt
Actor.system est typé.
Item.system est typé.
ActiveEffect.system est aussi typé.
```

Cela ouvre une vraie possibilité de design :

```js
class MySystemActiveEffectModel extends foundry.data.ActiveEffectTypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      ...super.defineSchema(),
      category: new fields.StringField({
        choices: ["condition", "equipment", "spell", "aura", "environment"]
      }),
      rules: new fields.ArrayField(new fields.ObjectField())
    };
  }
}
```

## Conséquence pour les anciens développeurs

Les développeurs V7/V8 ont souvent l’habitude de mettre des choses dans :

```js
effect.flags["my-system"]
```

En V14, il faut se poser la question franchement :

* si la donnée est un vrai concept système : **mettez-la dans `effect.system`** ;
* si c’est une donnée de module ou une extension non canonique : **gardez `flags`** ;
* si c’est une donnée de compatibilité temporaire : **prévoir une migration, pas une dépendance éternelle aux flags**.

---

# 4. Les changes deviennent plus flexibles

La note GitHub liée à la migration précise qu’en V14 il est seulement imposé qu’un objet de changement contienne `type`,
`phase` et `priority`. ([GitHub][2])

C’est un changement conceptuel majeur.

## Avant

Le format mental était :

```js
{
  key: "...",
    mode
: ...,
  value: "...",
    priority
: ...
}
```

## En V14

Le format devient plus ouvert :

```js
{
  key: "...",
    type
:
  "add",
    value
:
  "...",
    phase
:
  "apply",
    priority
:
  20
}
```

Ce que cela signifie pour un système : on n’est plus limité à penser “un change = une modification directe de chemin de
données”. Un système peut définir des changements plus riches, tant qu’il respecte le contrat minimal.

## Opportunité

On peut faire des effects plus déclaratifs :

```js
{
  type: "grantTrait",
    phase
:
  "apply",
    priority
:
  20,
    trait
:
  "flying"
}
```

ou :

```js
{
  type: "rollOption",
    phase
:
  "prepareRolls",
    priority
:
  10,
    selector
:
  "perception",
    option
:
  "advantage"
}
```

## Risque

Il ne faut pas transformer les Active Effects en langage de programmation non documenté. Si chaque système invente 40
types de changes opaques, les MJ et les développeurs de modules vont détester.

La bonne pratique : garder les changes standards pour les modifications simples, et réserver les changes custom/système
aux règles impossibles à exprimer proprement avec `add`, `subtract`, `multiply`, `override`, `upgrade`, `downgrade`.

---

# 5. Nouveau mode `subtract`

V14 ajoute officiellement le mode `subtract`. Les constantes V14 listent `add`, `custom`, `downgrade`, `multiply`,
`override`, `subtract`, `upgrade`, avec leurs priorités par défaut : `custom: 0`, `multiply: 10`, `add: 20`,
`subtract: 20`, `downgrade: 30`, `upgrade: 40`, `override: 50`. ([foundryvtt.com][4])

L’API précise aussi que `subtract` dépend du type de la valeur courante : nombre soustrait, chaîne remplacée par chaîne
vide, élément retiré d’un tableau si présent, etc. ([foundryvtt.com][3])

## Avant

Pour retirer un élément d’une liste ou faire un malus, beaucoup de systèmes faisaient :

```txt
add avec valeur négative
custom
override complet de tableau
hook maison
```

## En V14

On peut exprimer plus proprement :

```js
{
  key: "system.traits.languages",
    type
:
  "subtract",
    value
:
  "elvish",
    phase
:
  "apply",
    priority
:
  20
}
```

ou :

```js
{
  key: "system.attributes.speed.value",
    type
:
  "subtract",
    value
:
  "10",
    phase
:
  "apply",
    priority
:
  20
}
```

## Conséquence

C’est une amélioration réelle, mais elle doit être utilisée avec discipline. Sur des tableaux d’objets complexes,
`subtract` peut être insuffisant ou ambigu. Il est plus sûr sur :

```txt
number
string
array de primitives
```

À éviter sans validation sur :

```txt
array d’objets
sets complexes
maps
structures imbriquées
```

---

# 6. Les valeurs d’Active Effects peuvent référencer les données Actor

C’était une demande historique : pouvoir utiliser des références de type `@...` dans les valeurs d’effets. L’issue
originale demandait que le symbole `@` permette d’utiliser les données de l’acteur dans la valeur d’un change, comme
dans les Rolls. ([GitHub][5])

V14 indique explicitement que les changements d’Active Effects peuvent désormais référencer les données de
l’acteur. ([foundryvtt.com][6]) L’API V14 montre aussi que l’application d’un change peut recevoir des `replacementData`
utilisés pour résoudre les expressions `@`. ([foundryvtt.com][3])

## Avant

On faisait souvent :

```js
value: "2"
```

ou alors on passait par du `custom` pour dire :

```txt
bonus = niveau du personnage
bonus = modificateur de caractéristique
bonus = rang de compétence
```

## En V14

On peut concevoir des effets comme :

```js
{
  key: "system.attributes.hp.temp",
    type
:
  "add",
    value
:
  "@level",
    phase
:
  "apply",
    priority
:
  20
}
```

ou :

```js
{
  key: "system.damage.bonus",
    type
:
  "add",
    value
:
  "@abilities.str.mod",
    phase
:
  "apply",
    priority
:
  20
}
```

Le chemin exact dépend du `rollData` ou des données de remplacement fournies par l’acteur/système. Il faut tester dans
le système concerné.

## Conséquence

C’est probablement l’un des changements qui réduit le plus la dépendance à des modules type DAE ou à des hooks maison.
Attention cependant : ce n’est pas une excuse pour tout mettre en expressions textuelles. Les expressions dynamiques
doivent rester simples et prévisibles.

---

# 7. La durée est refondue

C’est le deuxième gros changement après `system.changes`.

## Avant

Les Active Effects avaient des durées, mais les systèmes et modules finissaient souvent par coder eux-mêmes les règles :

```txt
expire à la fin du tour
expire au début du prochain round
expire après la prochaine attaque
expire à la fin du combat
expire après repos
```

Les anciens développeurs connaissent le problème : beaucoup de logique dans des hooks `updateCombat`, `deleteCombat`,
`preUpdateActor`, etc.

## En V14

Foundry introduit un modèle plus robuste.

L’issue V14 sur les durées indique que `ActiveEffectData` possède désormais une propriété `start` contenant notamment
combat, combatant, initiative, round, turn et world time ; elle indique aussi que `duration` est modifié avec `units`,
`value` et `expiry`. ([GitHub][7])

Les notes V14 précisent que les durées peuvent être exprimées dans plus d’unités que les secondes et peuvent inclure un
événement d’expiration : début ou fin de combat, tour ou round. Les systèmes peuvent étendre ces options avec des
événements personnalisés et annoncer leur occurrence via `ActiveEffect.registry#refresh`. ([foundryvtt.com][6])

## Nouveau modèle mental

Avant :

```txt
duration.seconds
duration.rounds
duration.turns
startTime
startRound
startTurn
```

En V14 :

```txt
start = quand l’effet a commencé
duration.units = unité
duration.value = quantité
duration.expiry = événement qui autorise/force l’expiration
```

Conceptuellement :

```js
duration: {
  units: "rounds",
    value
:
  1,
    expiry
:
  "turnEnd"
}
```

ou :

```js
duration: {
  units: "combat",
    value
:
  1,
    expiry
:
  "combatEnd"
}
```

Les identifiants exacts doivent être vérifiés dans l’API et les constantes du build V14 utilisé.

## Conséquence

Pour les systèmes : **arrêter de bricoler les durées si le core sait maintenant le faire**.

Les anciens hooks de gestion de durée doivent être audités :

```js
Hooks.on("updateCombat", ...)
Hooks.on("deleteCombat", ...)
Hooks.on("combatTurn", ...)
Hooks.on("combatRound", ...)
```

Certains resteront nécessaires pour des règles très spécifiques. Mais les effets “jusqu’à la fin du tour”, “pendant 1
round”, “jusqu’à la fin du combat” doivent être migrés vers le modèle natif autant que possible.

---

# 8. Apparition du `ActiveEffect.registry`

V14 introduit un registre natif. L’API décrit `ActiveEffect.registry` comme une classe d’aide qui accepte
l’enregistrement des Active Effects et gère leurs données de durée préparée et d’expiration. ([foundryvtt.com][3])

Les notes V14 indiquent aussi que les Active Effects temporaires sont suivis dans ce nouveau registre, qui peut suivre,
mettre à jour et supprimer les effets expirés ou modifiés. ([foundryvtt.com][6])

## Avant

Chaque système sérieux avait tendance à inventer son propre registre mental :

```txt
effets temporaires stockés dans flags
durées recalculées dans prepareData
suppression au changement de round
suppression au changement de combat
```

## En V14

Il y a un centre de gravité natif :

```js
ActiveEffect.registry
```

## Conséquence

Les systèmes devraient :

1. utiliser les durées natives dès que possible ;
2. définir des événements d’expiration personnalisés seulement si le core ne couvre pas le besoin ;
3. appeler `ActiveEffect.registry.refresh` pour annoncer ces événements personnalisés lorsque c’est pertinent ;
4. éviter de supprimer manuellement des effets dans plusieurs hooks dispersés.

C’est un gain de robustesse, mais cela impose une refonte des systèmes qui avaient beaucoup de logique maison autour des
effets temporaires.

---

# 9. `isTemporary`, `isExpiryTrackable`, `isSuppressed`, `modifiesActor`

L’API V14 expose des accesseurs utiles : `isExpiryTrackable`, `isSuppressed`, `isTemporary`, `modifiesActor`, `target`,
etc. `isSuppressed` est décrit comme le fait qu’une logique système, ou à défaut un statut expiré, rend l’effet
inéligible à l’application. ([foundryvtt.com][3])

## Pourquoi c’est important

Dans l’ancien monde, beaucoup de systèmes faisaient :

```js
effect.disabled = true
```

pour des choses qui n’étaient pas vraiment “désactivées”, mais plutôt “non applicables maintenant”.

Exemples :

```txt
Objet dans l’inventaire mais non équipé.
Sort préparé mais non actif.
Aura hors portée.
Effet transféré mais source supprimée.
Effet expiré mais pas encore nettoyé.
Condition supprimée temporairement.
```

## En V14

Il faut distinguer :

```txt
disabled : l’effet est désactivé volontairement.
expired : l’effet a atteint sa durée/condition d’expiration.
suppressed : le système décide qu’il ne doit pas s’appliquer maintenant.
```

## Recommandation

Pour les vieux systèmes : ne continuez pas à tout faire avec `disabled`.

Un objet non équipé devrait plutôt rendre ses effets **suppressed**, pas nécessairement `disabled`.

Pourquoi ? Parce que `disabled` est une intention utilisateur ou document. `suppressed` est une conséquence de règles.

---

# 10. Les Active Effects peuvent modifier le Token

C’est un changement majeur.

V14 ajoute la possibilité de modifier des propriétés de Token via Active Effects. Foundry indique que l’`Actor` définit
maintenant un champ `tokenOverrides`, permettant de modifier vision, modes de détection, émission de lumière, image,
alpha, disposition, taille, etc. La note précise aussi que le changement de dimensions sur grille n’est pas traité
automatiquement et qu’un système peut surcharger `TokenDocument#_onOverrideSize` pour gérer sa
logique. ([foundryvtt.com][6])

## Avant

Pour faire une torche automatique, une vision nocturne, une invisibilité visuelle, un masque changeant l’image du token,
on utilisait souvent :

```txt
macro
module
hook sur token
ATL / Active Token Effects / DAE selon les écosystèmes
modification directe du TokenDocument
```

## En V14

Ces cas deviennent des cas natifs d’Active Effects.

Exemples :

```txt
Torche équipée → lumière émise par le token
Lunettes nocturnes → mode de vision ajouté
Invisibilité → alpha ou statut visuel
Déguisement magique → image du token remplacée
Agrandissement → taille/disposition du token, avec prudence
```

## Conséquence

C’est une grosse réduction de dette technique pour les systèmes qui dépendaient de modules d’effets de token.

Mais attention : **Actor et Token ne sont pas la même chose**.

Questions à résoudre côté système :

```txt
L’effet doit-il modifier tous les tokens de l’acteur ?
Seulement le token actif ?
Que faire avec les tokens non liés ?
Que faire avec plusieurs tokens du même acteur sur plusieurs scènes ?
Que faire quand le token est supprimé ?
```

La capacité est native, mais la politique de jeu reste à définir dans le système.

---

# 11. Les effets de région deviennent un vrai cas d’usage

V14 ajoute aussi des régions de scène et des comportements. Dans le contexte Active Effects, le comportement
`ApplyActiveEffectRegionBehaviorType` applique des effets configurés à l’acteur du token lorsqu’il entre dans une
région, puis les retire lorsqu’il en sort. C’est documenté dans l’API V14. ([foundryvtt.com][8])

## Avant

Pour une aura ou un terrain dangereux, on faisait souvent :

```txt
template mesuré
macro
module d’automatisation
hook sur déplacement de token
application manuelle d’un effet
```

## En V14

Une région peut devenir la source d’un Active Effect.

Exemples :

```txt
zone de brouillard → vision réduite
aura sacrée → bonus aux sauvegardes
terrain difficile → réduction de mouvement
champ toxique → condition empoisonné
zone de silence → tag “silenced”
```

## Conséquence

Les systèmes doivent maintenant penser les Active Effects selon trois origines possibles :

```txt
Actor / Item / Condition
Token / scène / région
Règle système / automatisation
```

C’est plus puissant, mais plus complexe. Il faut absolument renseigner proprement `origin` et éviter les effets
impossibles à tracer.

---

# 12. Transfert des effets : fin du legacy transferral

Les notes V14 Prototype 1 annoncent la suppression finale du framework de “legacy transferral”, qui avait été déprécié
en V12. ([foundryvtt.com][9])

## Avant

Certains systèmes/modules dépendaient encore de comportements historiques de transfert d’effets d’Item vers Actor.

## En V14

Il faut utiliser le modèle moderne.

## Conséquence

Audit obligatoire pour les systèmes anciens :

```js
effect.transfer
```

Mais aussi tous les endroits où le système présume que :

```txt
un effet d’item est copié sur l’acteur
un effet d’item reste synchronisé avec l’item source
un effet transféré est supprimé automatiquement quand l’item disparaît
un effet transféré se désactive automatiquement quand l’item n’est plus équipé
```

Ce dernier point n’est pas “gratuit”. Le système doit décider sa règle.

---

# 13. Conditions et statuts : V14 solidifie le lien

Foundry documente les Active Effects comme provenant de trois sources : effets d’acteur, effets de condition/statut, et
effets d’item. Les conditions sont souvent définies au niveau système et appliquées via le Token
HUD. ([foundryvtt.com][10])

L’API V14 expose `ActiveEffect.fromStatusEffect(statusId)`, qui crée une instance d’Active Effect à partir d’un
identifiant de statut défini dans `CONFIG.statusEffects`. ([foundryvtt.com][3])

## Ce qui change dans la pratique

Les conditions doivent être traitées comme des Active Effects de première classe.

Pour les développeurs anciens : il faut éviter de garder deux mondes séparés :

```txt
status icon d’un côté
ActiveEffect de l’autre
condition système dans flags encore ailleurs
```

Le bon modèle V14 est plutôt :

```txt
Status → ActiveEffect → statuses / changes / duration / origin
```

## Recommandation

Pour chaque condition système, définir :

```txt
id stable
label localisé
icône
statuses associés
changes éventuels
durée éventuelle
règles système consommées ailleurs
```

---

# 14. Meilleur support UX : compendiums, drag-and-drop, icônes

V14 annonce plusieurs améliorations prévues ou intégrées autour des Active Effects : fournir un compendium d’effets
prédéfinis, glisser-déposer un Active Effect sur un token pour l’appliquer à son acteur, et mieux contrôler la
présentation des icônes de statut. ([foundryvtt.com][9])

## Conséquence

Les systèmes peuvent enfin traiter les Active Effects comme du contenu utilisateur :

```txt
packs d’effets standards
bibliothèques de conditions
auras prédéfinies
effets d’environnement
effets de classe
effets de sort
```

Avant, beaucoup de systèmes cachaient les effets dans les items ou les créaient en code. En V14, il devient plus naturel
d’avoir des compendiums d’effets.

---

# 15. Comparaison “mental model” pour développeurs V7/V8

## Ancien modèle mental

```txt
Un Active Effect est une liste de changements qui patchent l’Actor préparé.
```

## Nouveau modèle mental

```txt
Un Active Effect est un document système typé, temporaire ou permanent, pouvant modifier l’Actor ou son Token, avec des changements structurés, une durée riche, un événement d’expiration, un registre natif, une origine traçable et une interaction plus propre avec les statuts, items, régions et données Actor.
```

C’est beaucoup plus ambitieux.

---

# 16. Ce qui casse probablement dans un système V13

Voici la checklist brutale.

## 1. Accès à `effect.changes`

À chercher :

```js
effect.changes
effect.data.changes
effect.update({ changes: ... })
createEmbeddedDocuments("ActiveEffect", [{ changes: ... }])
```

À migrer vers :

```js
effect.system.changes
effect.update({ "system.changes": ... })
createEmbeddedDocuments("ActiveEffect", [{ system: { changes: ... } }])
```

## 2. Usage de `mode`

Les anciens changes utilisaient souvent :

```js
mode: CONST.ACTIVE_EFFECT_MODES.ADD
```

En V14, la structure mise en avant parle de `type`, `phase`, `priority`. Foundry indique que le minimum imposé est
`type`, `phase`, `priority`. ([GitHub][2])

Il faut donc auditer les mappings :

```txt
mode → type
CONST.ACTIVE_EFFECT_MODES.ADD → "add"
CONST.ACTIVE_EFFECT_MODES.OVERRIDE → "override"
```

Ne pas faire ça à l’aveugle : vérifier dans le système cible et dans la build V14 utilisée.

## 3. Modèles ActiveEffect absents

Si le système définit des `TypeDataModel` pour Actor et Item mais rien pour ActiveEffect, il est probablement incomplet
pour V14.

La note officielle dit que les AE `TypeDataModels` fournis par les packages doivent implémenter le champ des changes, en
sous-classant simplement `foundry.data.ActiveEffectTypeDataModel` si besoin. ([GitHub][2])

## 4. Durées maison

À chercher :

```js
updateCombat
deleteCombat
combatRound
combatTurn
effect.duration.rounds
effect.duration.turns
effect.duration.seconds
flags.mySystem.expireAt
```

À remplacer autant que possible par le modèle V14 :

```txt
start
duration.units
duration.value
duration.expiry
ActiveEffect.registry
```

## 5. Effets visuels de token via modules

À auditer :

```txt
ATL
Active Token Effects
macros de torche
hooks de vision
modifications directes de token.light
modifications directes de token.sight
```

En V14, beaucoup de ces cas peuvent devenir des Active Effects natifs via token overrides. ([foundryvtt.com][6])

## 6. Transfert legacy

À chercher :

```txt
legacy transferral
logique maison de copie item → actor
suppression manuelle d’effets transférés
désactivation à l’équipement
```

La suppression finale du legacy transferral en V14 impose une vraie migration. ([foundryvtt.com][9])

---

# 17. Exemple de migration simple

## Avant V14

```js
await actor.createEmbeddedDocuments("ActiveEffect", [{
  name: "Hâte",
  icon: "icons/svg/upgrade.svg",
  changes: [
    {
      key: "system.attributes.speed.value",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: "10",
      priority: 20
    }
  ],
  duration: {
    rounds: 10
  },
  disabled: false
}]);
```

## V14 conceptuel

```js
await actor.createEmbeddedDocuments("ActiveEffect", [{
  name: "Hâte",
  type: "base",
  img: "icons/svg/upgrade.svg",
  system: {
    changes: [
      {
        key: "system.attributes.speed.value",
        type: "add",
        value: "10",
        phase: "apply",
        priority: 20
      }
    ]
  },
  duration: {
    units: "rounds",
    value: 10,
    expiry: null
  },
  disabled: false
}]);
```

Le code exact dépend du modèle du système, mais c’est le changement d’architecture à retenir.

---

# 18. Exemple de migration plus intéressante : torche

## Avant

Souvent :

```txt
Item “Torche”
Macro OnUse
modifie token.light
restaure token.light à la fin
risque de conflit si plusieurs effets modifient la lumière
```

## En V14

```txt
Item “Torche”
Active Effect transféré ou appliqué
change ciblant les tokenOverrides de l’Actor
durée optionnelle
suppression/suppression logique quand l’item est éteint
```

Résultat : beaucoup moins de code procédural.

Mais il faut gérer les conflits :

```txt
Torche + sort de lumière + vision magique
Quel effet gagne ?
Priorités ?
Override ou add ?
Suppression quand l’objet est déséquipé ?
```

La capacité technique est meilleure ; la responsabilité de design reste au système.

---

# 19. Ce qu’il ne faut pas dire aux vieux développeurs

Il ne faut pas leur dire : “c’est pareil, il suffit de remplacer `changes` par `system.changes`”.

C’est faux.

Le changement de chemin est le symptôme. Le vrai changement est :

```txt
ActiveEffect devient un vrai document de système.
Les changes deviennent typables/extensibles.
La durée devient événementielle.
L’expiration devient registrée.
Le Token devient une cible possible.
Les valeurs peuvent être dynamiques.
Les régions peuvent appliquer des effets.
```

Donc une migration superficielle peut faire tourner le code, mais elle ne profite pas de V14 et risque de garder toute
la dette historique.

---

# 20. Recommandations de migration

## Niveau 1 — Compatibilité minimale

À faire pour que le système démarre :

```txt
Migrer changes → system.changes.
Ajouter un ActiveEffect TypeDataModel.
Adapter les créations d’effets.
Adapter les sheets d’effets.
Adapter les macros système.
Vérifier les modes de changement.
```

## Niveau 2 — Migration saine

À faire pour que le système soit vraiment V14 :

```txt
Migrer les durées vers duration.units/value/expiry.
Utiliser ActiveEffect.registry.
Remplacer les hooks maison de durée quand possible.
Remplacer les flags d’effet système par effect.system.
Clarifier disabled vs suppressed vs expired.
Auditer les effets d’item transférés.
```

## Niveau 3 — Modernisation complète

À faire pour exploiter V14 :

```txt
Créer des compendiums d’effets prédéfinis.
Utiliser les tokenOverrides pour lumière, vision, apparence.
Utiliser les régions pour auras et terrains.
Permettre les valeurs dynamiques avec @data lorsque c’est pertinent.
Créer une vraie taxonomie des effets : condition, item, spell, aura, environment.
Documenter les change types spécifiques du système.
```

---

# 21. Positionnement clair : V14 est une rupture raisonnable

Pour un développeur V7/V8, la V14 peut être frustrante parce qu’elle casse des habitudes. Mais elle corrige de vraies
limites historiques.

## Ce que la V1 faisait bien

```txt
Simple à comprendre.
Facile à manipuler.
Suffisant pour +1, -2, override simple.
Compatible avec beaucoup de hacks.
```

## Ce que la V1 faisait mal

```txt
Durées faibles.
Pas assez de modèle système.
Trop de logique dans flags/hooks/modules.
Token presque hors périmètre.
Transfert item/actor parfois ambigu.
Peu adaptée aux effets spatiaux.
Valeurs dynamiques compliquées.
```

## Ce que la V2 apporte

```txt
Modèle propre.
Durée événementielle.
Expiration native.
Token comme cible.
Valeurs dynamiques.
Effets de région.
Meilleure extensibilité système.
```

## Ce que la V2 impose

```txt
Migration réelle.
Modèle de données ActiveEffect.
Révision des sheets.
Révision des macros.
Révision des modules de compatibilité.
Plus de rigueur dans la définition des effets.
```

---

# 22. Conclusion

La meilleure façon d’expliquer V14 à des anciens développeurs Foundry est celle-ci :

**Les Active Effects V1 étaient un tableau de patches appliqués à l’Actor. Les Active Effects V2 sont un sous-système de
règles temporaires, typé, traçable, extensible, capable d’interagir avec l’Actor, le Token, les conditions, les items,
les durées, les régions et les données dynamiques.**

Le changement à ne pas rater est `changes → system.changes`, mais ce n’est que la surface.

Le vrai travail pour un système V14+ est de décider :

```txt
Quels effets sont des bonus simples ?
Quels effets sont des conditions ?
Quels effets sont des effets d’item ?
Quels effets sont des effets de token ?
Quels effets sont des effets de région ?
Quels effets doivent expirer via le registre ?
Quels effets doivent être suppressed plutôt que disabled ?
Quels effets nécessitent un change custom système ?
```

Un système qui répond clairement à ces questions sera plus stable, plus lisible et plus compatible avec l’avenir de
Foundry VTT. Un système qui se contente de porter ses anciens hacks V8/V9 vers V14 gardera les mêmes problèmes, mais
dans une architecture plus stricte.

[1]: https://foundryvtt.com/releases/14.356 "Release 14.356 | Foundry Virtual Tabletop"

[2]: https://github.com/foundryvtt/foundryvtt/issues/13740 "Migrate `ActiveEffect#changes` to `ActiveEffect#system#changes` · Issue #13740 · foundryvtt/foundryvtt · GitHub"

[3]: https://foundryvtt.com/api/classes/foundry.documents.ActiveEffect.html "ActiveEffect | Foundry Virtual Tabletop - API Documentation - Version 14"

[4]: https://foundryvtt.com/api/v14/variables/CONST.ACTIVE_EFFECT_CHANGE_TYPES.html "ACTIVE_EFFECT_CHANGE_TYPES | Foundry Virtual Tabletop - API Documentation - Version 14"

[5]: https://github.com/foundryvtt/foundryvtt/issues/5841 "Allow Active Effect change values to reference actor data · Issue #5841 · foundryvtt/foundryvtt · GitHub"

[6]: https://foundryvtt.com/releases/14.353 "Release 14.353 | Foundry Virtual Tabletop"

[7]: https://github.com/foundryvtt/foundryvtt/issues/13332 "Allow for indicating ActiveEffect duration using time units other than seconds · Issue #13332 · foundryvtt/foundryvtt · GitHub"

[8]: https://foundryvtt.com/releases/14.356?utm_source=chatgpt.com "Release 14.356"

[9]: https://foundryvtt.com/releases/14.349 "Release 14.349 | Foundry Virtual Tabletop"

[10]: https://foundryvtt.com/article/active-effects/ "Active Effects | Foundry Virtual Tabletop"

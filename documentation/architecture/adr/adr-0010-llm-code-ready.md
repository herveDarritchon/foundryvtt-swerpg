# LLM Code Brief — ADR-0010 — Modèle canonique SWERPG des effets mécaniques des Talents

## Usage prévu

Ce document est une version opérationnelle de l’ADR destinée à Claude Code, Codex, OpenCode ou tout autre agent de développement.

Il ne remplace pas l’ADR complète. Il sert de brief d’implémentation et de garde-fou architectural.

## Objectif de l’agent

Implémenter progressivement le modèle canonique des effets mécaniques des Talents dans le système Foundry VTT SWERPG, en respectant les décisions suivantes :

1. `system.effects` est la source de vérité métier des effets SWERPG.
2. `system.actions` décrit les activations cliquables ou assistées.
3. `system.description.*` reste obligatoire et ne doit jamais être supprimé.
4. `actorHooks` reste une extension experte, pas le canal standard.
5. Les `ActiveEffect` Foundry V14 sont une projection technique optionnelle, pas un remplacement de `system.effects`.
6. Le système reste en JavaScript vanilla, avec JSDoc, validateurs runtime et tests Vitest.

## Décision centrale à respecter

```txt
system.effects
= ce que l’effet veut dire dans les règles Star Wars Edge / SWERPG

ActiveEffect Foundry
= comment Foundry applique, persiste, expire ou affiche certains effets
```

Architecture cible :

```txt
Talent / Item
  system.effects[]      ← source de vérité métier SWERPG
  system.actions[]      ← déclencheurs joueur / MJ

Effect Engine SWERPG
  résout contexte, timing, coût, scope, direction, conditions

Foundry Bridge
  produit éventuellement un ActiveEffect V14
```

Règle absolue :

```txt
Ne jamais faire de `ActiveEffect` la source de vérité métier.
Ne jamais convertir automatiquement tous les Talents en ActiveEffects.
```

## Problème à résoudre

Les Talents Star Wars Edge ne sont pas de simples blocs de texte. Ils peuvent :

- ajouter ou retirer des dés ;
- modifier des seuils ;
- modifier des dégâts ;
- modifier les blessures critiques ;
- accorder des relances ;
- accorder des compétences de carrière ;
- coûter du stress, une action, une manœuvre, une broutille, un point de Destin ;
- se déclencher avant ou après un jet ;
- dépendre d’une cible, d’un contexte, d’une confirmation ou d’une dépense de symboles.

Le système doit donc disposer d’un modèle lisible, validable, importable et progressivement automatisable.

## Modèle conceptuel obligatoire

Chaque Talent doit pouvoir être représenté selon ces couches :

```txt
system.description.*  = texte lisible par les humains
system.effects        = effets mécaniques canonisés SWERPG
system.actions        = activations cliquables ou assistées
flags.swerpg.*        = import brut, mapping, warnings, traçabilité
actorHooks            = extension experte uniquement
ActiveEffect Foundry  = projection technique optionnelle
```

## Règles d’architecture

### Règle 1 — Le texte reste présent

Ne jamais supprimer ni remplacer `system.description.*` par la donnée structurée.

Le texte reste utile pour :

- le MJ ;
- les joueurs ;
- la vérification manuelle ;
- les effets narratifs ;
- les imports incertains ;
- les Talents non automatisés.

### Règle 2 — `system.effects` est le modèle canonique métier

Un effet SWERPG décrit l’intention mécanique.

Exemples :

- `Robustesse` : augmenter le seuil de stress ;
- `Endurci` : augmenter le seuil de blessure ;
- `Filature` : ajouter des dés à certains tests ;
- `Coup mortel` : modifier une blessure critique sortante ;
- `Esquive` : réaction à une attaque entrante avec coût variable en stress.

### Règle 3 — `system.actions` déclenche, mais ne porte pas toute la logique

Une action représente ce que l’utilisateur clique ou confirme.

Une action peut :

- appliquer un coût ;
- poster une carte de chat ;
- déclencher un test ;
- préparer un effet temporaire ;
- référencer un ou plusieurs effets.

Une action doit référencer `system.effects` via `effectRefs` quand c’est possible.

### Règle 4 — `actorHooks` n’est pas le standard

Ne pas utiliser `actorHooks` pour les effets modélisables avec `system.effects`.

`actorHooks` est réservé à :

- prototypes ;
- compatibilité temporaire ;
- effets impossibles à modéliser en V1 ;
- comportements explicitement codés par un développeur.

### Règle 5 — ActiveEffect V14 est une projection optionnelle

Un `ActiveEffect` Foundry peut être généré uniquement si l’effet SWERPG nécessite :

- persistance Foundry ;
- expiration ;
- visibilité native dans l’UI Foundry ;
- effet sur Actor, Item ou Token ;
- compatibilité avec les mécanismes standards de Foundry.

Un `ActiveEffect` généré doit porter une traçabilité :

```js
flags: {
  swerpg: {
    generatedFrom: {
      itemUuid: "...",
      effectId: "...",
      schemaVersion: 1
    }
  }
}
```

Un `ActiveEffect` généré depuis SWERPG ne doit pas être édité directement comme source métier. Toute édition métier doit se faire sur l’Item source ou via un builder SWERPG.

## Périmètre V1 strict

Implémenter d’abord uniquement :

```txt
- system.description
- system.effects
- system.actions minimal
- constantes JS
- contrats JSDoc
- validateurs runtime
- tests Vitest
- UI minimale de lecture
- import brut OggDude conservé dans flags.swerpg.import.raw
- mapping manuel ou semi-manuel
```

Ne pas faire en V1 stricte :

```txt
- pas de TypeScript
- pas de DSL complète
- pas d’automatisation globale
- pas de conversion automatique de tous les Talents en ActiveEffects
- pas de suppression des descriptions textuelles
- pas d’actorHooks générés automatiquement
- pas de mappings incertains appliqués automatiquement
```

## Périmètre V1.5

Ajouter ensuite un bridge Foundry contrôlé :

```txt
- projection de certains effets simples vers ActiveEffect V14
- flags.swerpg.generatedFrom
- nettoyage des ActiveEffects générés si l’Item source est supprimé, désactivé ou migré
- journalisation des effets projetés
```

## Périmètre V2

Ajouter progressivement :

```txt
- réactions assistées
- effets temporaires
- expiration Foundry plus fine
- conditions avancées
- choix utilisateur
- intégration plus forte au moteur de jets
```

## Types d’effets V1 autorisés

Le noyau strict V1 doit privilégier :

```js
modifyDerivedStat
modifyDicePool
modifyDamage
modifyCritical
grantCareerSkill
rerollCheck
custom
```

Repousser hors V1 stricte sauf besoin déjà implémenté :

```js
modifyRecovery
modifyItem
applyCondition
```

Raison : ces types nécessitent d’autres sous-systèmes stables : conditions, items, équipements, attachments, récupération, repos, fin de rencontre.

## Stratégies d’application attendues

Chaque effet doit pouvoir indiquer comment il est appliqué :

```js
application: {
  strategy: "computed" | "activeEffect" | "chatOnly" | "manual",
  targetDocument: "actor" | "item" | "token" | "roll",
  persist: boolean,
  generated: boolean
}
```

Interprétation :

- `computed` : calculé directement par le moteur SWERPG, non persisté en ActiveEffect ;
- `activeEffect` : projetable vers ActiveEffect Foundry ;
- `chatOnly` : produit uniquement une carte de chat ou une aide de résolution ;
- `manual` : affiché comme rappel, pas d’application automatique.

## Direction de l’effet

Le modèle doit distinguer la direction de l’effet :

```js
direction: "self" | "outgoing" | "incoming" | "target" | "ally" | "area"
```

Exemples :

```js
// Coup mortel
{
  direction: "outgoing",
  timing: "beforeCriticalRoll"
}
```

```js
// Esquive
{
  direction: "incoming",
  timing: "whenTargetedByCombatCheck"
}
```

## Exemples de choix attendus

### Robustesse

- Type : `modifyDerivedStat`
- Direction : `self`
- Timing : `prepareData`
- Application : `computed`
- ActiveEffect : non nécessaire en V1

### Filature

- Type : `modifyDicePool`
- Direction : `self`
- Timing : `beforeRoll`
- Scope : Coordination, Discrétion
- Application : `computed`
- Automation : `auto` ou `assisted` selon maturité du moteur de jets

### Coup mortel

- Type : `modifyCritical`
- Direction : `outgoing`
- Timing : `beforeCriticalRoll`
- Application : `computed` ou `assisted`
- Important : ne pas modéliser comme `scope.actor = "target"` seul, car l’effet appartient à l’attaquant.

### Esquive

- Type : `modifyDicePool`
- Direction : `incoming`
- Timing : `whenTargetedByCombatCheck`
- Coût : stress variable jusqu’au rang
- Application : `computed` pour le jet courant, pas ActiveEffect permanent
- ActiveEffect : seulement si une future implémentation veut matérialiser une durée ou une visibilité temporaire

## Critères d’acceptation

L’implémentation est acceptable si :

- un Talent peut contenir `system.effects` sans casser les descriptions existantes ;
- les effets sont validés par des validateurs runtime ;
- les actions peuvent référencer des effets existants ;
- les imports bruts sont conservés dans `flags.swerpg.import.raw` ;
- un mapping incertain produit un warning et n’est pas appliqué automatiquement ;
- aucun `actorHooks` n’est généré automatiquement ;
- aucun ActiveEffect n’est généré automatiquement sauf stratégie explicite `activeEffect` ;
- tout ActiveEffect généré porte `flags.swerpg.generatedFrom` ;
- les tests Vitest couvrent au minimum validation, références action-effet, scaling par rang, filtrage par timing, filtrage par scope.

## Anti-patterns interdits

Ne pas faire :

```txt
Tout Talent → ActiveEffect Foundry
```

Ne pas faire :

```txt
ActiveEffect Foundry = modèle métier principal
```

Ne pas faire :

```txt
actorHooks générés automatiquement depuis OggDude
```

Ne pas faire :

```txt
suppression du texte descriptif parce que l’effet est structuré
```

Ne pas faire :

```txt
application automatique d’un mapping low/medium confidence
```

## Prompt recommandé pour Claude Code / Codex

```txt
Tu travailles dans un système Foundry VTT 14+ nommé SWERPG, développé en JavaScript vanilla.

Implémente le modèle canonique des effets mécaniques de Talents selon l’ADR-0010.

Contraintes absolues :
- ne pas introduire TypeScript ;
- utiliser JavaScript vanilla, JSDoc, constantes, validateurs runtime et tests Vitest ;
- `system.effects` est la source de vérité métier ;
- les ActiveEffects Foundry V14 ne sont qu’une projection technique optionnelle ;
- ne jamais convertir automatiquement tous les Talents en ActiveEffects ;
- ne pas générer de actorHooks pour les effets standards ;
- conserver les descriptions textuelles existantes ;
- conserver les données importées brutes dans `flags.swerpg.import.raw`.

Commence par :
1. identifier les fichiers de modèle de données Item / Talent existants ;
2. ajouter `system.effects`, `system.actions`, `system.activation`, `system.schemaVersion` si absents ;
3. créer les constantes JS nécessaires ;
4. créer les validateurs runtime ;
5. ajouter les tests Vitest ;
6. ne pas encore automatiser agressivement le moteur de jets.

Avant de modifier le code, inspecte la structure actuelle du dépôt et propose un plan court avec les fichiers à créer ou modifier.
```

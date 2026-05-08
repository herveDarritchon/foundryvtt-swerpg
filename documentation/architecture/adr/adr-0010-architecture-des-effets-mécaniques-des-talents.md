# ADR-0010 — Modèle canonique SWERPG des effets mécaniques des Talents

## Statut

Proposé — corrigé

## Date

2026-05-08

## Décision structurante

Cette ADR ne fait pas des Active Effects Foundry le modèle métier principal des Talents.

La décision retenue est la suivante :

```txt
system.effects
= ce que l’effet veut dire dans les règles Star Wars Edge / SWERPG

ActiveEffect Foundry
= comment Foundry applique, persiste, expire ou affiche certains effets
```

Autrement dit :

```txt
Talent / Item
  system.effects[]      ← source de vérité métier SWERPG
  system.actions[]      ← déclencheurs joueur / MJ

Effect Engine SWERPG
  résout le contexte, le timing, les coûts, le scope, la direction et les conditions

Foundry Bridge
  produit éventuellement un ActiveEffect V14
```

`system.effects` est donc un modèle métier interne capable de produire ou piloter des `ActiveEffect` Foundry, mais il ne remplace pas complètement les `ActiveEffect`.

## Contexte

Dans SWERPG, un `Item` de type `talent` peut aujourd’hui porter plusieurs types d’informations :

- `system.description.*` : texte lisible par le MJ et les joueurs ;
- `system.effects` : effets mécaniques canonisés par SWERPG ;
- `system.actions` : actions potentiellement cliquables ;
- `actorHooks` : points d’extension branchés sur les hooks Foundry / système ;
- `flags.*` : stockage libre, notamment pour les données importées ou intermédiaires ;
- `ActiveEffect` Foundry : documents Foundry pouvant appliquer, persister, expirer ou afficher certains effets techniques.

Les imports, notamment OggDude, commencent à fournir des données structurées comme des modificateurs de dés (`DieModifiers`). Cependant, aucun format canonique n’existe encore pour représenter les effets mécaniques des Talents dans SWERPG.

Cette absence de modèle produit une zone grise :

- certains Talents restent purement textuels ;
- certains effets pourraient être encodés localement dans des structures non standardisées ;
- les imports risquent de diverger des futurs builders internes ;
- le moteur de résolution des jets ne dispose pas d’un contrat clair pour lire les effets ;
- les Talents, armes, armures, équipements, conditions et pouvoirs de Force risquent de développer des modèles parallèles ;
- les Active Effects Foundry pourraient devenir, à tort, une deuxième source de vérité concurrente.

Le livre de règles distingue déjà des Talents passifs et actifs, avec des effets variés : augmentation de seuils, ajout ou retrait de dés, modification de blessures critiques, coût en stress, dépense de point de Destin, action dédiée, manœuvre, réaction ou effet après réussite. Des exemples comme `Robustesse`, `Endurci`, `Filature`, `Esquive`, `Coup mortel`, `Dose de stimulant`, `Sens de la rhétorique` ou `Répartie caustique` montrent que les Talents ne peuvent pas être traités comme de simples blocs de texte si l’on veut préparer une automatisation fiable.

Foundry V14 renforce en parallèle le rôle des Active Effects : les notes de version V14 mentionnent notamment une refonte des Active Effects et l’extension des durées avec des événements d’expiration comme début ou fin de combat, tour ou round.[^foundry-14-356][^foundry-14-353] L’API V14 confirme aussi qu’un `ActiveEffect` appartient à la collection `effects` de son document parent.[^foundry-activeeffect-api]

Cette ADR doit donc trancher deux niveaux différents :

1. comment SWERPG représente métier un effet de Talent ;
2. quand et comment cet effet peut être projeté vers un `ActiveEffect` Foundry.

## Problème

Nous devons décider comment un Talent encode ses effets mécaniques dans SWERPG sans créer de conflit avec les mécanismes natifs de Foundry.

Plus précisément, il faut trancher :

1. le rôle de `system.description.*` ;
2. le rôle de `system.effects` ;
3. le rôle de `system.actions` ;
4. le rôle de `actorHooks` ;
5. le rôle de `flags.swerpg.*` ;
6. le rôle des `ActiveEffect` Foundry ;
7. la source de vérité entre `system.effects` et `Actor.effects` / `Item.effects` ;
8. le niveau de structuration attendu pour les effets ;
9. l’alignement avec les autres types d’Items ;
10. le mode d’implémentation compatible avec la stack JavaScript vanilla du système.

## Décision

SWERPG adopte un modèle semi-déclaratif pour les effets mécaniques des Talents.

Un Talent doit être représenté par cinq couches métier distinctes :

```txt
system.description.*  = texte lisible par les humains
system.effects        = effets mécaniques canonisés SWERPG
system.actions        = activations cliquables ou assistées
flags.swerpg.*        = import brut, métadonnées, statut de mapping
actorHooks            = extension experte uniquement
```

À ces couches métier s’ajoute une couche technique optionnelle :

```txt
ActiveEffect Foundry  = projection runtime / persistance / expiration / affichage, si pertinent
```

La structure canonique des effets mécaniques d’un Talent est :

```js
system.effects = []
```

Cette structure devient la source de vérité métier des effets exploitables par SWERPG.

`system.description.*` reste obligatoire pour conserver la lisibilité et la fidélité au texte de référence.

`system.actions` est utilisé lorsqu’un Talent demande une activation volontaire, une confirmation, une dépense de coût, un test ou une carte de chat.

`actorHooks` ne constitue pas le modèle standard des effets de Talents. Il est réservé aux cas avancés, temporaires ou impossibles à exprimer avec le modèle déclaratif.

`flags.swerpg.*` peut stocker des données d’import, des données brutes OggDude, des informations de mapping, des avertissements, des métadonnées de compatibilité et la traçabilité des effets générés.

Les `ActiveEffect` Foundry ne sont jamais la source de vérité métier. Ils peuvent être générés, synchronisés ou supprimés par un bridge SWERPG lorsque l’effet métier peut être exprimé proprement comme effet Foundry.

Le modèle est implémenté en JavaScript vanilla. Les contrats de données sont documentés avec JSDoc et sécurisés par des validateurs runtime. Aucune migration vers TypeScript n’est décidée par cette ADR.

## Décisions détaillées

### 1. `system.description.*`

`system.description.*` conserve le texte lisible du Talent.

Ce texte reste la référence humaine pour :

- le MJ ;
- les joueurs ;
- la vérification manuelle ;
- les Talents non automatisés ;
- les effets narratifs ou ambigus ;
- la comparaison entre la donnée structurée et le texte de référence.

Le texte ne doit pas être supprimé, même lorsqu’un effet est structuré dans `system.effects`.

### 2. `system.effects`

`system.effects` devient le format canonique métier des effets mécaniques.

Un effet décrit ce que le Talent modifie, accorde ou déclenche :

- un modificateur de dés ;
- un seuil ;
- une défense ;
- un bonus aux dégâts ;
- un modificateur de blessure critique ;
- une relance ;
- une compétence de carrière ;
- une condition temporaire ;
- un effet manuel ou narratif ;
- une intention mécanique pouvant être calculée, proposée, affichée ou projetée vers Foundry.

Le modèle est volontairement semi-déclaratif en V1. Il doit être suffisamment structuré pour être exploitable par l’UI et le moteur de jets, mais pas encore aussi ambitieux qu’une DSL complète.

Le contrat de données exact de `system.effects` est décrit dans le document technique associé :

```txt
docs/specs/talent-effects-technical-design.md
```

### 3. `system.actions`

`system.actions` décrit ce que le joueur ou le MJ peut cliquer, déclencher ou confirmer.

Une action peut :

- appliquer un coût ;
- poster une carte dans le chat ;
- déclencher un test ;
- préparer un effet temporaire ;
- référencer un ou plusieurs effets dans `system.effects`.

Une action ne doit pas contenir toute la logique métier. Elle doit principalement référencer des effets.

Règle retenue :

```txt
Action = ce que le joueur déclenche.
Effect = ce que le système applique, calcule, propose ou projette.
Hook = comment le moteur se branche au cycle Foundry/SWERPG.
ActiveEffect = comment Foundry matérialise certains effets.
```

### 4. `actorHooks`

`actorHooks` est réservé aux extensions expertes.

Il peut être utilisé pour :

- des cas impossibles à modéliser en V1 ;
- des prototypes ;
- des Talents très spécifiques ;
- des comportements écrits explicitement par un développeur ;
- des compatibilités temporaires.

Il ne doit pas être utilisé pour :

- représenter les effets standards ;
- stocker les données importées ;
- générer automatiquement des comportements depuis OggDude ;
- remplacer `system.effects` ;
- contourner le moteur d’effets pour des cas modélisables déclarativement.

### 5. `flags.swerpg.*`

`flags.swerpg.*` sert à stocker :

- les données brutes importées ;
- l’origine de l’import ;
- le statut de mapping ;
- le niveau de confiance du mapping ;
- les avertissements ;
- les informations non encore normalisées ;
- la traçabilité des `ActiveEffect` générés par SWERPG.

Exemple de mapping import :

```js
{
  flags: {
    swerpg: {
      import: {
        source: "oggdude",
        sourceId: "DODGE",
        raw: {
          dieModifiers: []
        }
      },
      mapping: {
        status: "partiallyMapped",
        confidence: "medium",
        reviewed: false,
        warnings: [
          "Variable strain cost requires user choice at activation time."
        ]
      }
    }
  }
}
```

Exemple de traçabilité sur un `ActiveEffect` généré :

```js
{
  flags: {
    swerpg: {
      generatedFrom: {
        itemUuid: "Actor.abc.Item.def",
        effectId: "esquive-upgrade-incoming-combat-check",
        schemaVersion: 1
      }
    }
  }
}
```

### 6. Active Effects Foundry V14

SWERPG ne prend pas les Active Effects V2 de Foundry comme modèle canonique métier.

Le modèle canonique des effets mécaniques reste `system.effects`, car il doit représenter des intentions propres aux règles Star Wars FFG : modification de pool narratif, dépense d’avantages, coût en stress, timing de résolution, effet après réussite, choix de cible, réaction ou effet contextuel.

Les Active Effects V2 de Foundry sont utilisés comme couche d’application, de persistance, d’expiration ou d’affichage uniquement lorsque l’effet SWERPG peut être exprimé proprement sous forme d’effet Foundry.

Règle :

- `system.effects` décrit l’effet métier ;
- le moteur SWERPG résout l’applicabilité ;
- un bridge Foundry peut générer un `ActiveEffect` V14 temporaire ou permanent ;
- l’`ActiveEffect` généré n’est jamais la source de vérité métier ;
- toute modification métier doit se faire sur le Talent, l’Item source ou un builder SWERPG, pas directement sur l’`ActiveEffect` généré.

Règle interdite :

```txt
Tout Talent → ActiveEffect Foundry
```

Cette règle est rejetée, car beaucoup de Talents sont contextuels, liés à un jet précis, déclenchés après réussite, dépendants d’une dépense de stress, d’avantages ou de triomphes, soumis à confirmation, narratifs ou seulement semi-automatisables.

Exemples :

- `Robustesse` peut être calculé directement dans les données préparées de l’Actor ;
- `Filature` peut être appliqué ou proposé lors de la construction d’un pool de dés ;
- `Coup mortel` doit être résolu sur une critique sortante infligée par l’acteur ;
- `Esquive` est une réaction à un test entrant et ne doit pas devenir par défaut un `ActiveEffect` permanent ;
- `Dose de stimulant` peut produire une carte de chat et, plus tard, un effet temporaire si le modèle de conditions ou d’altérations temporaires le justifie.

### 7. Stratégie d’application des effets

Chaque effet structuré peut indiquer une stratégie d’application.

Le détail est défini dans le technical design, mais l’intention ADR est la suivante :

```js
application: {
  strategy: "computed" | "activeEffect" | "chatOnly" | "manual",
  targetDocument: "actor" | "item" | "token" | "roll",
  persist: false,
  generated: false
}
```

Définition fonctionnelle :

| Stratégie | Usage |
|---|---|
| `computed` | Effet calculé par SWERPG sans création d’ActiveEffect |
| `activeEffect` | Effet projeté vers un `ActiveEffect` Foundry |
| `chatOnly` | Effet affiché ou guidé par carte de chat |
| `manual` | Effet conservé comme information structurée mais appliqué manuellement |

Par défaut, un effet V1 doit être `computed`, `chatOnly` ou `manual`.

La stratégie `activeEffect` doit être utilisée explicitement, pas automatiquement.

### 8. Direction d’application des effets

Le modèle doit distinguer le bénéficiaire ou le sens mécanique d’un effet.

Le détail est défini dans le technical design, mais l’intention ADR est la suivante :

```js
direction: "self" | "outgoing" | "incoming" | "target" | "ally" | "area"
```

Cette notion est nécessaire pour éviter les ambiguïtés entre :

- un effet sur mes propres jets ;
- un effet sur les jets qui me ciblent ;
- un effet sur mes dégâts sortants ;
- un effet sur les critiques que j’inflige ;
- un effet sur les dégâts que je reçois ;
- un effet sur un allié ou une zone.

Exemple : `Coup mortel` ne doit pas être modélisé comme un effet porté par la cible. C’est un effet sortant de l’attaquant sur les critiques qu’il inflige.

```js
direction: "outgoing",
timing: "beforeCriticalRoll",
scope: {
  rollTypes: ["critical"]
}
```

Exemple : `Esquive` est un effet entrant, déclenché lorsqu’un test de combat cible l’acteur.

```js
direction: "incoming",
timing: "whenTargetedByCombatCheck"
```

### 9. Choix d’implémentation JavaScript vanilla

Le système SWERPG reste en JavaScript vanilla.

Cette ADR ne décide pas d’introduire TypeScript.

Le modèle d’effets doit être implémenté avec :

- des objets JavaScript simples ;
- des constantes JavaScript pour les valeurs autorisées ;
- des contrats documentés en JSDoc ;
- des validateurs runtime ;
- des tests Vitest.

Les noms comme `EffectDefinition`, `ActionDefinition`, `EffectScope`, `EffectCost`, `EffectApplication`, `EffectDirection` ou `AutomationLevel` désignent des contrats métier documentés, pas des interfaces TypeScript.

Les validateurs runtime sont nécessaires parce que les effets peuvent provenir :

- d’un import OggDude ;
- d’une migration ;
- d’un builder interne ;
- d’une édition manuelle ;
- d’un futur outil de génération.

## Niveau de structuration retenu

La décision retenue est :

```txt
Option B — modèle semi-déclaratif métier + projection Foundry optionnelle
```

Ce modèle permet :

- de conserver le texte ;
- de structurer les effets fréquents ;
- de préparer l’automatisation ;
- de garder les cas complexes en manuel ou semi-assisté ;
- de migrer progressivement vers un moteur d’effets plus puissant ;
- d’utiliser les Active Effects Foundry lorsque c’est réellement pertinent ;
- d’éviter que les Active Effects deviennent une deuxième source de vérité métier.

L’option `texte only` est rejetée, car elle empêche toute automatisation fiable.

L’option `ActiveEffect only` est rejetée, car elle confond le modèle métier SWERPG et le mécanisme technique Foundry.

L’option `DSL complète` est repoussée, car elle serait prématurée et risquerait de sur-modéliser les Talents avant d’avoir assez de cas réels encodés.

## Types d’effets V1

Le noyau V1 strict comprend les types d’effets suivants :

```js
/**
 * Types d’effets mécaniques supportés en V1 stricte.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_TYPES = Object.freeze({
  MODIFY_DICE_POOL: "modifyDicePool",
  MODIFY_DERIVED_STAT: "modifyDerivedStat",
  MODIFY_DAMAGE: "modifyDamage",
  MODIFY_CRITICAL: "modifyCritical",
  GRANT_CAREER_SKILL: "grantCareerSkill",
  REROLL_CHECK: "rerollCheck",
  CUSTOM: "custom"
});
```

Ces types couvrent les familles les plus fréquentes et les plus utiles pour une première automatisation.

Les types suivants sont repoussés à une phase ultérieure, sauf besoin déjà cadré dans une ADR ou une spec dédiée :

```js
MODIFY_RECOVERY: "modifyRecovery",
MODIFY_ITEM: "modifyItem",
APPLY_CONDITION: "applyCondition"
```

Justification :

- `modifyItem` ouvre le chantier armes, armures, attachments, mods, rareté, encombrement et hard points ;
- `applyCondition` suppose un modèle de conditions stable ;
- `modifyRecovery` suppose d’avoir cadré les scènes de fin de rencontre, le repos et les workflows de récupération.

Les effets non représentables proprement en V1 doivent utiliser :

```js
{
  type: "custom",
  ui: {
    automationLevel: "manual"
  },
  application: {
    strategy: "manual"
  }
}
```

ou :

```js
{
  type: "custom",
  ui: {
    automationLevel: "chat-card"
  },
  application: {
    strategy: "chatOnly"
  }
}
```

Un effet `custom` ne doit pas être appliqué automatiquement sans traitement spécifique.

## Modèle commun avec les autres Items

Le modèle `system.effects` ne doit pas rester spécifique aux Talents.

Il doit servir de pilote pour un modèle commun applicable à terme aux :

- armes ;
- armures ;
- équipements ;
- pouvoirs de Force ;
- conditions temporaires ;
- capacités spéciales.

La bonne abstraction n’est pas :

```txt
effet de Talent
```

mais :

```txt
effet mécanique provenant d’une source
```

La source peut être un Talent, une arme, une armure, un pouvoir de Force, un équipement ou un statut.

## Phasing

### V0 — Conservation texte et import brut

- conserver la description lisible ;
- conserver les données brutes OggDude dans `flags.swerpg.import.raw` ;
- ne pas automatiser ;
- ne pas générer de `actorHooks` ;
- ne pas générer automatiquement d’`ActiveEffect`.

### V1 — Modèle déclaratif métier strict

- mapper les effets fréquents vers `system.effects` ;
- supporter les effets passifs simples ;
- ajouter `application.strategy` ;
- ajouter `direction` ;
- afficher les effets structurés dans l’UI ;
- marquer les mappings incertains ;
- documenter les contrats avec JSDoc ;
- valider les effets avec des validateurs runtime ;
- ne pas générer automatiquement d’`ActiveEffect`, sauf passifs simples explicitement autorisés par une spec dédiée.

### V1.5 — Bridge ActiveEffect V14 contrôlé

- créer un bridge SWERPG vers les `ActiveEffect` V14 ;
- générer des `ActiveEffect` uniquement pour les effets compatibles ;
- tracer chaque `ActiveEffect` généré avec `flags.swerpg.generatedFrom` ;
- empêcher la confusion entre édition de l’`ActiveEffect` et édition métier du Talent ;
- journaliser les effets projetés ;
- gérer la suppression ou la resynchronisation des `ActiveEffect` générés.

### V2 — Actions cliquables assistées et effets temporaires

- représenter les Talents activables dans `system.actions` ;
- permettre les coûts simples : stress, point de Destin, action, manœuvre, broutille ;
- poster des cartes dans le chat ;
- préparer des effets temporaires ou contextuels ;
- utiliser les durées / expirations Foundry lorsque c’est pertinent ;
- valider les actions avec des validateurs runtime.

### V3 — Intégration au moteur de jets

- collecter les effets applicables ;
- filtrer par timing, scope, direction et conditions ;
- proposer ou appliquer les effets ;
- laisser le joueur ou le MJ confirmer les effets assistés ;
- ne créer un `ActiveEffect` que si l’effet a besoin de persistance, d’expiration, d’affichage Foundry ou d’altération documentée d’un Actor / Item / Token.

### V4 — DSL d’effets avancée

- enrichir les conditions ;
- enrichir les durées ;
- gérer les effets imbriqués ;
- gérer les choix dynamiques complexes ;
- intégrer plus fortement les pouvoirs de Force, armes, armures et statuts.

La V4 ne doit pas être interprétée comme une décision d’introduire TypeScript. Elle désigne uniquement un enrichissement futur du modèle déclaratif.

## Conséquences positives

Cette décision permet :

- une meilleure lisibilité des Talents ;
- une séparation claire entre texte, donnée, action, comportement et projection Foundry ;
- une meilleure compatibilité avec les imports ;
- une UI de builder plus réaliste ;
- une automatisation progressive ;
- un modèle partagé avec les autres Items ;
- une réduction de la dette technique autour de `actorHooks` ;
- une utilisation raisonnée des Active Effects Foundry V14 ;
- une réduction du risque de double source de vérité ;
- une implémentation compatible avec la stack JavaScript vanilla actuelle ;
- une validation runtime des données venant d’imports ou de migrations.

## Conséquences négatives

Cette décision implique :

- de définir un schéma stable pour `system.effects` ;
- de maintenir des constantes JavaScript pour les valeurs autorisées ;
- de documenter les contrats de données en JSDoc ;
- de créer et maintenir des validateurs runtime ;
- de migrer progressivement les Talents existants ;
- de maintenir un statut de mapping pour les imports ;
- de gérer des effets partiellement automatisés ;
- de ne pas tout automatiser immédiatement ;
- d’accepter une phase hybride entre texte, effets structurés, effets manuels et Active Effects générés ;
- de créer un bridge Foundry explicite pour les effets projetables ;
- de gérer la synchronisation et la suppression des Active Effects générés ;
- d’empêcher l’édition directe des Active Effects générés comme si c’étaient des définitions métier.

## Alternatives rejetées

### Alternative A — Texte uniquement

Rejetée.

Cette option est simple à court terme, mais bloque :

- les jets assistés ;
- les actions cliquables ;
- le builder de Talents ;
- les imports structurés ;
- la factorisation avec les autres Items.

### Alternative B — `actorHooks` comme canal principal

Rejetée.

Cette option donne une grande flexibilité, mais transforme chaque Talent en mini-script.

Elle rendrait le système :

- difficile à valider ;
- difficile à migrer ;
- difficile à importer ;
- difficile à exposer dans l’UI ;
- difficile à tester automatiquement.

### Alternative C — Active Effects Foundry comme modèle principal

Rejetée.

Cette option utiliserait directement les `ActiveEffect` Foundry comme langage principal des effets de Talents.

Elle est rejetée parce qu’elle confond :

```txt
intention mécanique SWERPG
```

et :

```txt
mécanisme technique Foundry d’application / durée / affichage
```

Elle poserait plusieurs problèmes :

- coûts variables difficiles à représenter ;
- effets qui ne vivent que pendant un jet ;
- Talents déclenchés après réussite ;
- Talents dépendants d’avantages ou de triomphes ;
- Talents demandant confirmation joueur / MJ ;
- risque de doublon entre `Item.system.effects` et `Actor.effects` ;
- risque d’Active Effects persistants alors que l’effet devrait être contextuel ;
- complexité de migration accrue.

### Alternative D — DSL complète immédiate

Rejetée pour la V1.

Une DSL complète pourra émerger plus tard, mais elle serait prématurée maintenant.

### Alternative E — Introduction de TypeScript pour typer le modèle

Rejetée dans le cadre de cette ADR.

Le projet reste en JavaScript vanilla.

La rigueur du modèle sera assurée par :

- JSDoc ;
- constantes JavaScript ;
- validateurs runtime ;
- tests Vitest.

Cette décision pourra être réévaluée dans une ADR séparée si le projet décide un jour d’introduire TypeScript.

## Décisions explicitement ouvertes

Les points suivants restent à trancher dans des ADR ou specs séparées :

1. format exact des compétences internes ;
2. format exact des dés SWERPG dans le moteur de jets ;
3. format définitif du bridge `system.effects` → `ActiveEffect` ;
4. stratégie d’édition UI des Active Effects générés ;
5. modèle des conditions temporaires ;
6. modèle des effets d’armes, armures, gear et pouvoirs de Force ;
7. UX précise des réactions en combat ;
8. degré d’automatisation accepté par défaut ;
9. emplacement exact des fichiers de constantes, validateurs et helpers dans l’arborescence du projet.

Le point suivant n’est plus ouvert :

```txt
system.effects est-il un remplacement des Active Effects Foundry ?
```

Décision : non. `system.effects` est le modèle métier canonique ; `ActiveEffect` est une projection technique optionnelle.

## Décision finale

Les Talents SWERPG doivent utiliser un modèle semi-déclaratif métier :

```txt
system.description.* = lisibilité humaine
system.effects       = effets mécaniques canonisés SWERPG
system.actions       = activations cliquables
flags.swerpg.*       = import brut, métadonnées et traçabilité
actorHooks           = extension experte uniquement
ActiveEffect         = projection Foundry optionnelle
```

Le modèle `system.effects` doit être conçu comme le futur socle commun des effets mécaniques de tous les Items.

Les Active Effects Foundry V14 doivent être utilisés comme couche d’application, d’expiration, de persistance ou d’affichage quand ils sont adaptés, mais jamais comme langage métier principal des Talents.

L’implémentation doit rester compatible avec la stack actuelle :

```txt
JavaScript vanilla
+ JSDoc
+ constantes JavaScript
+ validateurs runtime
+ tests Vitest
```

## Phrase de référence

Un Talent ne doit pas être un script.

Un Talent ne doit pas non plus être réduit à un ActiveEffect Foundry.

Il doit être une donnée mécanique déclarative SWERPG que le système sait afficher, interpréter, assister, calculer et, lorsque c’est pertinent, projeter vers un ActiveEffect Foundry.

Ce contrat doit être documenté en JSDoc et sécurisé par validation runtime, sans imposer TypeScript au projet.

[^foundry-14-356]: Foundry Virtual Tabletop, “Release 14.356”, 12 mars 2026, https://foundryvtt.com/releases/14.356.
[^foundry-14-353]: Foundry Virtual Tabletop, “Release 14.353”, 16 janvier 2026, https://foundryvtt.com/releases/14.353.
[^foundry-activeeffect-api]: Foundry Virtual Tabletop API Documentation, “ActiveEffect — Version 14”, consulté le 8 mai 2026, https://foundryvtt.com/api/classes/foundry.documents.ActiveEffect.html.
[^foundry-ae-system-changes]: Foundry VTT GitHub, “Migrate `ActiveEffect#changes` to `ActiveEffect#system#changes`”, issue #13740, 15 janvier 2026, https://github.com/foundryvtt/foundryvtt/issues/13740.

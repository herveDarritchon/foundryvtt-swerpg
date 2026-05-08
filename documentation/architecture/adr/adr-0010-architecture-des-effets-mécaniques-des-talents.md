# ADR-0010 — Architecture des effets mécaniques des Talents

## Statut

Proposé

## Date

2026-05-08

## Contexte

Dans SWERPG, un `Item` de type `talent` peut aujourd’hui porter plusieurs types d’informations :

- `system.description.*` : texte lisible par le MJ et les joueurs ;
- `system.actions` : actions potentiellement cliquables ;
- `actorHooks` : points d’extension branchés sur les hooks Foundry / système ;
- `flags.*` : stockage libre, notamment pour les données importées ou intermédiaires.

Les imports, notamment OggDude, commencent à fournir des données structurées comme des modificateurs de dés (`DieModifiers`). Cependant, aucun format canonique n’existe encore pour représenter les effets mécaniques des Talents dans SWERPG.

Cette absence de modèle produit une zone grise :

- certains Talents restent purement textuels ;
- certains effets pourraient être encodés localement dans des structures non standardisées ;
- les imports risquent de diverger des futurs builders internes ;
- le moteur de résolution des jets ne dispose pas d’un contrat clair pour lire les effets ;
- les Talents, armes, armures, équipements et pouvoirs de Force risquent de développer des modèles parallèles.

Le livre de règles distingue déjà des Talents passifs et actifs, avec des effets variés : augmentation de seuils, ajout ou retrait de dés, modification de blessures critiques, coût en stress, dépense de point de Destin, action dédiée, manœuvre, réaction ou effet après réussite. Des exemples comme `Robustesse`, `Endurci`, `Filature`, `Esquive`, `Coup mortel`, `Dose de stimulant`, `Sens de la rhétorique` ou `Répartie caustique` montrent que les Talents ne peuvent pas être traités comme de simples blocs de texte si l’on veut préparer une automatisation fiable.

## Problème

Nous devons décider comment un Talent encode ses effets mécaniques dans SWERPG.

Plus précisément, il faut trancher :

1. le rôle de `system.description.*` ;
2. le rôle de `system.effects` ou d’une structure équivalente ;
3. le rôle de `system.actions` ;
4. le rôle de `actorHooks` ;
5. le rôle de `flags.swerpg.*` ;
6. le niveau de structuration attendu pour les effets ;
7. l’alignement avec les autres types d’Items ;
8. le mode d’implémentation compatible avec la stack JavaScript vanilla du système.

## Décision

SWERPG adopte un modèle semi-déclaratif pour les effets mécaniques des Talents.

Un Talent doit être représenté par cinq couches distinctes :

```txt
system.description.*  = texte lisible par les humains
system.effects        = effets mécaniques canonisés
system.actions        = activations cliquables ou assistées
flags.swerpg.*        = import brut, métadonnées, statut de mapping
actorHooks            = extension experte uniquement
````

La structure canonique des effets mécaniques d’un Talent est :

```js
system.effects = []
```

Cette structure devient la source principale des effets exploitables par le système.

`system.description.*` reste obligatoire pour conserver la lisibilité et la fidélité au texte de référence.

`system.actions` est utilisé uniquement lorsqu’un Talent demande une activation volontaire du joueur ou du MJ.

`actorHooks` ne constitue pas le modèle standard des effets de Talents. Il est réservé aux cas avancés, temporaires ou impossibles à exprimer avec le modèle déclaratif.

`flags.swerpg.*` peut stocker des données d’import, des données brutes OggDude, des informations de mapping, des avertissements ou des métadonnées de compatibilité. Ce n’est pas le format canonique final.

Le modèle est implémenté en JavaScript vanilla. Les contrats de données sont documentés avec JSDoc et sécurisés par des validateurs runtime. Aucune migration vers TypeScript n’est décidée par cette ADR.

## Décisions détaillées

### 1. `system.description.*`

`system.description.*` conserve le texte lisible du Talent.

Ce texte reste la référence humaine pour :

* le MJ ;
* les joueurs ;
* la vérification manuelle ;
* les Talents non automatisés ;
* les effets narratifs ou ambigus.

Le texte ne doit pas être supprimé, même lorsqu’un effet est structuré dans `system.effects`.

### 2. `system.effects`

`system.effects` devient le format canonique des effets mécaniques.

Un effet décrit ce que le Talent modifie ou accorde :

* un modificateur de dés ;
* un seuil ;
* une défense ;
* un bonus aux dégâts ;
* un modificateur de blessure critique ;
* une relance ;
* une compétence de carrière ;
* une condition temporaire ;
* un effet manuel ou narratif.

Le modèle est volontairement semi-déclaratif en V1. Il doit être suffisamment structuré pour être exploitable par l’UI et le moteur de jets, mais pas encore aussi ambitieux qu’une DSL complète.

Le contrat de données exact de `system.effects` est décrit dans le document technique associé :

```txt
docs/specs/talent-effects-technical-design.md
```

### 3. `system.actions`

`system.actions` décrit ce que le joueur peut cliquer ou déclencher volontairement.

Une action peut :

* appliquer un coût ;
* poster une carte dans le chat ;
* déclencher un test ;
* préparer un effet temporaire ;
* référencer un ou plusieurs effets dans `system.effects`.

Une action ne doit pas contenir toute la logique métier. Elle doit principalement référencer des effets.

Règle retenue :

```txt
Action = ce que le joueur déclenche.
Effect = ce que le système applique ou propose.
Hook = comment le moteur se branche au cycle Foundry/SWERPG.
```

### 4. `actorHooks`

`actorHooks` est réservé aux extensions expertes.

Il peut être utilisé pour :

* des cas impossibles à modéliser en V1 ;
* des prototypes ;
* des Talents très spécifiques ;
* des comportements écrits explicitement par un développeur ;
* des compatibilités temporaires.

Il ne doit pas être utilisé pour :

* représenter les effets standards ;
* stocker les données importées ;
* générer automatiquement des comportements depuis OggDude ;
* remplacer `system.effects`.

### 5. `flags.swerpg.*`

`flags.swerpg.*` sert à stocker :

* les données brutes importées ;
* l’origine de l’import ;
* le statut de mapping ;
* le niveau de confiance du mapping ;
* les avertissements ;
* les informations non encore normalisées.

Exemple :

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

### 6. Choix d’implémentation JavaScript vanilla

Le système SWERPG reste en JavaScript vanilla.

Cette ADR ne décide pas d’introduire TypeScript.

Le modèle d’effets doit être implémenté avec :

* des objets JavaScript simples ;
* des constantes JavaScript pour les valeurs autorisées ;
* des contrats documentés en JSDoc ;
* des validateurs runtime ;
* des tests Vitest.

Les noms comme `EffectDefinition`, `ActionDefinition`, `EffectScope`, `EffectCost` ou `AutomationLevel` désignent des contrats métier documentés, pas des interfaces TypeScript.

Les validateurs runtime sont nécessaires parce que les effets peuvent provenir :

* d’un import OggDude ;
* d’une migration ;
* d’un builder interne ;
* d’une édition manuelle ;
* d’un futur outil de génération.

## Niveau de structuration retenu

La décision retenue est :

```txt
Option B — modèle semi-déclaratif
```

Ce modèle permet :

* de conserver le texte ;
* de structurer les effets fréquents ;
* de préparer l’automatisation ;
* de garder les cas complexes en manuel ou semi-assisté ;
* de migrer progressivement vers un moteur d’effets plus puissant.

L’option `texte only` est rejetée, car elle empêche toute automatisation fiable.

L’option `DSL complète` est repoussée, car elle serait prématurée et risquerait de sur-modéliser les Talents avant d’avoir assez de cas réels encodés.

## Types d’effets V1

Le noyau V1 comprend les types d’effets suivants :

```js
/**
 * Types d’effets mécaniques supportés en V1.
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
  MODIFY_RECOVERY: "modifyRecovery",
  MODIFY_ITEM: "modifyItem",
  APPLY_CONDITION: "applyCondition",
  CUSTOM: "custom"
});
```

Ces types couvrent les familles les plus fréquentes de Talents.

Les effets non représentables proprement en V1 doivent utiliser :

```js
{
  type: "custom",
  ui: {
    automationLevel: "manual"
  }
}
```

ou :

```js
{
  type: "custom",
  ui: {
    automationLevel: "chat-card"
  }
}
```

Un effet `custom` ne doit pas être appliqué automatiquement sans traitement spécifique.

## Modèle commun avec les autres Items

Le modèle `system.effects` ne doit pas rester spécifique aux Talents.

Il doit servir de pilote pour un modèle commun applicable à terme aux :

* armes ;
* armures ;
* équipements ;
* pouvoirs de Force ;
* conditions temporaires ;
* capacités spéciales.

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

* conserver la description lisible ;
* conserver les données brutes OggDude dans `flags.swerpg.import.raw` ;
* ne pas automatiser ;
* ne pas générer de `actorHooks`.

### V1 — Effets déclaratifs simples

* mapper les effets fréquents vers `system.effects` ;
* supporter les effets passifs simples ;
* afficher les effets structurés dans l’UI ;
* marquer les mappings incertains ;
* documenter les contrats avec JSDoc ;
* valider les effets avec des validateurs runtime.

### V2 — Actions cliquables assistées

* représenter les Talents activables dans `system.actions` ;
* permettre les coûts simples : stress, point de Destin, action, manœuvre, broutille ;
* poster des cartes dans le chat ;
* préparer des effets temporaires ou contextuels ;
* valider les actions avec des validateurs runtime.

### V3 — Intégration au moteur de jets

* collecter les effets applicables ;
* filtrer par timing, scope et conditions ;
* proposer ou appliquer les effets ;
* laisser le joueur ou le MJ confirmer les effets assistés.

### V4 — DSL d’effets avancée

* enrichir les conditions ;
* enrichir les durées ;
* gérer les effets imbriqués ;
* gérer les choix dynamiques complexes ;
* intégrer plus fortement les pouvoirs de Force, armes, armures et statuts.

La V4 ne doit pas être interprétée comme une décision d’introduire TypeScript. Elle désigne uniquement un enrichissement futur du modèle déclaratif.

## Conséquences positives

Cette décision permet :

* une meilleure lisibilité des Talents ;
* une séparation claire entre texte, donnée, action et comportement ;
* une meilleure compatibilité avec les imports ;
* une UI de builder plus réaliste ;
* une automatisation progressive ;
* un modèle partagé avec les autres Items ;
* une réduction de la dette technique autour de `actorHooks` ;
* une implémentation compatible avec la stack JavaScript vanilla actuelle ;
* une validation runtime des données venant d’imports ou de migrations.

## Conséquences négatives

Cette décision implique :

* de définir un schéma stable pour `system.effects` ;
* de maintenir des constantes JavaScript pour les valeurs autorisées ;
* de documenter les contrats de données en JSDoc ;
* de créer et maintenir des validateurs runtime ;
* de migrer progressivement les Talents existants ;
* de maintenir un statut de mapping pour les imports ;
* de gérer des effets partiellement automatisés ;
* de ne pas tout automatiser immédiatement ;
* d’accepter une phase hybride entre texte, effets structurés et effets manuels.

## Alternatives rejetées

### Alternative A — Texte uniquement

Rejetée.

Cette option est simple à court terme, mais bloque :

* les jets assistés ;
* les actions cliquables ;
* le builder de Talents ;
* les imports structurés ;
* la factorisation avec les autres Items.

### Alternative B — `actorHooks` comme canal principal

Rejetée.

Cette option donne une grande flexibilité, mais transforme chaque Talent en mini-script.

Elle rendrait le système :

* difficile à valider ;
* difficile à migrer ;
* difficile à importer ;
* difficile à exposer dans l’UI ;
* difficile à tester automatiquement.

### Alternative C — DSL complète immédiate

Rejetée pour la V1.

Une DSL complète pourra émerger plus tard, mais elle serait prématurée maintenant.

### Alternative D — Introduction de TypeScript pour typer le modèle

Rejetée dans le cadre de cette ADR.

Le projet reste en JavaScript vanilla.

La rigueur du modèle sera assurée par :

* JSDoc ;
* constantes JavaScript ;
* validateurs runtime ;
* tests Vitest.

Cette décision pourra être réévaluée dans une ADR séparée si le projet décide un jour d’introduire TypeScript.

## Décision finale

Les Talents SWERPG doivent utiliser un modèle semi-déclaratif :

```txt
system.description.* = lisibilité humaine
system.effects       = effets mécaniques canonisés
system.actions       = activations cliquables
flags.swerpg.*       = import brut et métadonnées
actorHooks           = extension experte uniquement
```

Le modèle `system.effects` doit être conçu comme le futur socle commun des effets mécaniques de tous les Items.

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

Il doit être une donnée mécanique déclarative que le système sait afficher, interpréter, assister et progressivement automatiser.

Ce contrat doit être documenté en JSDoc et sécurisé par validation runtime, sans imposer TypeScript au projet.

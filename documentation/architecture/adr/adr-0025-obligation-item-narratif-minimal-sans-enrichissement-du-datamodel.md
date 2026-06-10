---
title: 'ADR-0025: Obligation — item narratif minimal, sans enrichissement du DataModel'
status: 'Accepted'
date: '2026-06-08'
authors: 'Hervé Darritchon'
tags: ['architecture', 'obligation', 'datamodel', 'narrative', 'item']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Validée le 2026-06-08. Mise à jour documentaire le 2026-06-10 pour aligner le contrat sur les 8 champs réels du modèle et noter que l'intégration Audit Log consomme ces champs sans en ajouter de nouveaux. Cette ADR formalise que l'item `obligation` reste volontairement simple, principalement narratif, et que son modèle de données actuel ne doit pas être enrichi sans besoin métier nouveau, explicite et validé.

## Context

L'item `obligation` dans SWERPG représente avant tout un contenu narratif : dette, responsabilité, engagement, contrainte ou problème personnel porté par un personnage.

Le système dispose déjà d'un modèle en place, simple, connu du code, des sheets, de l'import et des tests. Ce modèle couvre :

- un contenu éditable libre via `description` ;
- une valeur d'obligation via `value` ;
- un support limité pour les obligations "extra" de création via `isExtra`, `extraXp` et `extraCredits`.

La question traitée par cette ADR est la suivante :

Faut-il enrichir l'item `obligation` avec de nouveaux champs structurés supplémentaires (catégorie, statut, gravité, faction, créancier, déclencheurs, résolution, tags métier, progression, effets, etc.) ?

À ce stade, aucun besoin produit validé n'impose une telle complexification. Le besoin principal est au contraire de conserver un item souple, éditable, peu contraint, centré sur le texte et facile à maintenir.

Le modèle actuel de `module/models/obligation.mjs` est le suivant :

```js
{
  description:   HTMLField,
  value:         NumberField,
  isExtra:       BooleanField,
  extraXp:       NumberField,
  extraCredits:  NumberField,
  campaignDelta: NumberField,   // évolution nette en campagne
  campaignNote:  StringField,   // justification narrative de la dernière évolution
  transformedTo: StringField,   // nouveau type narratif si l'obligation change de nature
}
```

Les cinq premiers champs (`description`, `value`, `isExtra`, `extraXp`, `extraCredits`) couvrent la création de personnage et les bonus initiaux. Les trois suivants (`campaignDelta`, `campaignNote`, `transformedTo`) ont été ajoutés pour soutenir l'évolution narrative en campagne — ils sont déjà présents dans le code, les tests et les feuilles de personnage avant l'introduction de l'Audit Log.

Plus précisément, le contrat actuel est :

```js
description: new fields.HTMLField({ required: false, initial: undefined })

value: new fields.NumberField({
  required: true,
  integer: true,
  nullable: false,
  min: 0,
  max: 50,
  initial: 10,
  step: 5,
})

isExtra: new fields.BooleanField({
  required: false,
  nullable: false,
  initial: false,
})

extraXp: new fields.NumberField({
  required: true,
  integer: true,
  nullable: false,
  min: 0,
  max: 20,
  initial: 0,
  step: 5,
})

extraCredits: new fields.NumberField({
  required: true,
  integer: true,
  nullable: false,
  min: 0,
  max: 5000,
  initial: 0,
  step: 500,
})

// Champs d'évolution en campagne — distincts des bonus de création.
campaignDelta: new fields.NumberField({
  required: true,
  integer: true,
  nullable: false,
  min: -50,
  max: 50,
  initial: 0,
})

campaignNote: new fields.StringField({
  required: false,
  nullable: true,
  initial: null,
  blank: false,
})

transformedTo: new fields.StringField({
  required: false,
  nullable: true,
  initial: null,
  blank: false,
})
```

Les tests verrouillent ce contrat en imposant explicitement que le schéma comporte exactement huit champs.

## Decision

### D1 — L'item `obligation` reste un item narratif minimal

`obligation` est défini comme un item principalement narratif, dont la valeur centrale est un contenu libre éditable par le MJ ou le joueur via `description`.

### D2 — Le DataModel actuel est conservé tel quel

Aucun nouveau champ n'est ajouté au `TypeDataModel` `SwerpgObligation`.

Le schéma canonique comporte exactement huit champs :

- `description`
- `value`
- `isExtra`
- `extraXp`
- `extraCredits`
- `campaignDelta`
- `campaignNote`
- `transformedTo`

Les trois derniers champs (`campaignDelta`, `campaignNote`, `transformedTo`) ont été introduits avant cette ADR pour soutenir l'évolution narrative en campagne. Leur présence ne remet pas en cause le principe de minimalisme : ils couvrent un besoin métier déjà prouvé (tracer les évolutions d'obligation en cours de campagne) sans ouvrir la voie à une modélisation structurée plus riche.

### D3 — Les champs non textuels existants sont conservés uniquement parce qu'ils servent déjà un besoin métier réel

Les champs `value`, `isExtra`, `extraXp` et `extraCredits` restent autorisés car ils supportent un comportement métier déjà implémenté autour des bonus de création de personnage liés aux obligations "extra".

Les champs `campaignDelta`, `campaignNote` et `transformedTo` sont conservés car ils tracent l'évolution narrative d'une obligation en campagne — un besoin opérationnel déjà présent dans le code, les feuilles de personnage et les tests.

Aucun de ces champs ne constitue un signal d'ouverture à une modélisation plus riche des obligations.

### D4 — Aucun enrichissement structurel sans besoin métier prouvé

Sont explicitement hors périmètre tant qu'un besoin validé n'existe pas :

- catégorie métier d'obligation ;
- statut de résolution ;
- niveau de gravité ;
- créancier ou faction structurée ;
- échéances ;
- déclencheurs ;
- progression ;
- conséquences mécaniques dédiées ;
- tags métier ;
- sous-objets ou collections spécifiques au domaine Obligation.

Tant qu'aucune règle canonique n'en dépend, ces informations doivent rester dans le texte libre de `description`.

### D5 — La simplicité du contenu éditable prime sur la sophistication du schéma

L'objectif recherché est un item simple, souple et maintenable :

- facile à créer ;
- facile à éditer ;
- lisible en sheet ;
- peu coûteux en maintenance ;
- sans migration de schéma inutile ;
- sans rigidifier prématurément un contenu d'abord narratif.

### D6 — L'intégration Audit Log consomme les champs existants sans en ajouter de nouveaux

L'intégration du sous-système Audit Log pour les obligations (voir `module/lib/audit/obligation-events.mjs` et `module/utils/audit-log.mjs`) trace les créations, modifications et suppressions d'obligations en lisant les 8 champs existants du modèle.

Elle n'ajoute aucun champ au `TypeDataModel` `SwerpgObligation` et ne stocke pas d'historique dans `system.*`. Les entrées de journal sont stockées dans les `flags` de l'acteur conformément à `ADR-0011`.

Cette décision confirme que le principe de minimalisme est préservé même après l'ajout de la traçabilité : l'Audit Log est un consommateur du contrat, pas un moteur d'évolution de celui-ci.

## Options écartées

### O1 — Ajouter de nouveaux champs métier au DataModel `obligation`

Exemples : `category`, `status`, `severity`, `faction`, `creditor`, `trigger`, `resolution`, `milestones`.

- **Avantages** : structure plus riche, filtrage facilité, usages futurs possibles.
- **Inconvénients** :
  - complexifie un item principalement narratif ;
  - impose des choix de modélisation non stabilisés ;
  - augmente le coût UI, validation, maintenance et migration ;
  - risque de figer trop tôt un domaine qui doit rester souple.
- **Décision** : rejetée.

### O2 — Déporter ces métadonnées dans `flags.swerpg`

- **Avantages** : évite de toucher au schéma principal.
- **Inconvénients** :
  - crée un second contrat implicite et non canonique ;
  - encourage une complexité cachée ;
  - brouille la frontière entre vraie donnée métier et expérimentation.
- **Décision** : rejetée.

### O3 — Créer une modélisation avancée spécifique aux obligations narratives

Exemples : relations, workflow de résolution, impact automatique, historique dédié.

- **Avantages** : ouvre la voie à une gestion très fine.
- **Inconvénients** :
  - sans besoin produit explicite, c'est de la sur-ingénierie ;
  - détourne l'item de sa vocation première ;
  - augmente fortement le couplage entre narration, UI et mécanique.
- **Décision** : rejetée.

## Rationale

1. **Primauté du narratif** : une obligation est d'abord un contenu d'histoire, pas un mini-système structuré autonome.
2. **YAGNI** : aucun besoin actuel ne justifie l'ajout de nouveaux champs.
3. **Souplesse d'usage** : le texte libre couvre mieux la variété des cas narratifs qu'un schéma trop spécialisé.
4. **Coût de maintenance réduit** : moins de champs signifie moins de validation, moins d'UI, moins de migrations, moins de dette.
5. **Cohérence avec l'existant** : le code, les sheets, l'import et les tests sont déjà construits autour de ce contrat minimal.
6. **Réversibilité** : si un vrai besoin métier apparaît plus tard, une ADR future pourra promouvoir un ou plusieurs champs de manière ciblée et justifiée.

## Impact

### `module/models/obligation.mjs`

Aucun changement de schéma attendu. Le modèle actuel devient le contrat stable à préserver.

### `templates/sheets/partials/item-description.hbs`

La description reste le support principal du contenu narratif libre.

### `templates/sheets/partials/obligation-config.hbs`

La configuration reste limitée aux champs du modèle :

- `value`
- `isExtra`
- `extraXp`
- `extraCredits`
- `campaignDelta`
- `campaignNote`
- `transformedTo`

Aucun nouveau bloc métier ne doit être ajouté sans nouvelle ADR.

### `module/applications/sheets/obligation.mjs`

Aucune extension fonctionnelle spécifique n'est recherchée à ce stade en dehors de l'édition simple de l'item.

### Import OggDude

Aucun enrichissement supplémentaire du modèle `system` n'est attendu pour les obligations importées. Le mapping actuel reste suffisant.

### Tests

Les tests existants qui verrouillent le schéma minimal deviennent le garde-fou principal contre toute dérive de complexité accidentelle.

## Contrat testable

```js
const schema = SwerpgObligation.defineSchema()

// Champs de création de personnage
expect(schema).toHaveProperty('description')
expect(schema).toHaveProperty('value')
expect(schema).toHaveProperty('isExtra')
expect(schema).toHaveProperty('extraXp')
expect(schema).toHaveProperty('extraCredits')

// Champs d'évolution en campagne (déjà présents avant l'intégration Audit Log)
expect(schema).toHaveProperty('campaignDelta')
expect(schema).toHaveProperty('campaignNote')
expect(schema).toHaveProperty('transformedTo')

// Exactement huit champs — aucun enrichissement accidentel
expect(Object.keys(schema)).toHaveLength(8)

// Champs explicitement exclus (enrichissement structurel non demandé)
expect(schema.category).toBeUndefined()
expect(schema.status).toBeUndefined()
expect(schema.severity).toBeUndefined()
expect(schema.faction).toBeUndefined()
expect(schema.trigger).toBeUndefined()
```

## Review

**Validation :** ADR acceptée le 2026-06-08.

Cette ADR doit être réévaluée uniquement si un besoin métier explicite et validé apparaît, par exemple :

- règles mécaniques canoniques nouvelles directement portées par une obligation ;
- besoin de filtrage/recherche métier impossible à couvrir correctement par `name` et `description` ;
- workflow fonctionnel validé autour de la résolution d'une obligation ;
- intégration explicite d'un sous-système narratif structuré dédié.

En l'absence d'un tel besoin, la règle reste : **ne pas enrichir le modèle**.

## Links

- Modèle : `module/models/obligation.mjs`
- Sheet : `module/applications/sheets/obligation.mjs`
- Configuration UI : `templates/sheets/partials/obligation-config.hbs`
- Description item : `templates/sheets/partials/item-description.hbs`
- Enregistrement du DataModel : `swerpg.mjs`
- Tests modèle : `tests/models/obligation.test.mjs`
- Tests import : `tests/importer/obligation-import.integration.spec.mjs`
- Intégration Audit Log (consommateur) : `module/lib/audit/obligation-events.mjs`, `module/utils/audit-log.mjs`
- ADR stockage journal : `ADR-0011`

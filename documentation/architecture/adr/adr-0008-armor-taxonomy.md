---
title: 'ADR-0008: Taxonomie canonique des armures (system.category, system.qualities, mapping OggDude)'
status: 'Accepted'
date: '2026-05-07'
authors: 'Hervé Darritchon'
tags: [ 'architecture', 'armor', 'taxonomy', 'data-model', 'import-oggdude' ]
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Cette décision a été implémentée et est en production dans le système swerpg. Le présent ADR formalise
les choix déjà actés.

## Context

Le système SWERPG expose pour les Items de type `armor` un champ `system.category` hérité de `SwerpgPhysicalItem` (
`module/models/physical.mjs:10`) et un tableau `system.qualities` dans le schéma `SwerpgArmor` (
`module/models/armor.mjs:33`).

Le système d'armure a été implémenté avec les décisions suivantes, qui n'avaient pas encore été formalisées dans un ADR :

- une enum fermée de catégories d'armure avec des bornes de défense et de soak,
- un système de propriétés (qualités) stocké dans `system.qualities` au format Option C,
- un mapper OggDude qui distingue catégories et propriétés dans des `<Category>` XML partagées,
- une intégration dans la logique métier (équipement, déplacement).

Issues connexes : #14 (qualités), #26 (format des propriétés d'armure — question résolue par l'usage de
`system.qualities`).

## Decision

### D1 — Enum des catégories d'armure (`system.category`)

Cinq catégories sont définies dans `module/config/armor.mjs` (`CATEGORIES`) et constituent une enum fermée :

| Clé         | Label       | defense min/max | soak min/max | soak start | Description                               |
|-------------|-------------|-----------------|--------------|------------|-------------------------------------------|
| `unarmored` | Sans armure | 0 / 0           | 10 / 10      | 0          | Aucune protection                         |
| `light`     | Légère      | 2 / 7           | 7 / 9        | 2          | Protection légère, grande mobilité        |
| `medium`    | Moyenne     | 8 / 13          | 4 / 6        | 4          | Protection équilibrée                     |
| `heavy`     | Lourde      | 14 / 20         | 0 / 3        | 8          | Protection maximale, mobilité réduite     |
| `natural`   | Naturelle   | 0 / 20          | 10 / 10      | 0          | Protection naturelle (écailles, carapace) |

**Règles :**

- `system.category` est défini dans `SwerpgPhysicalItem` via un `StringField` avec `choices` lié à
  `this.ITEM_CATEGORIES` (`module/models/physical.mjs:10-14`).
- `SwerpgArmor` surcharge `ITEM_CATEGORIES = SYSTEM.ARMOR.CATEGORIES` et `DEFAULT_CATEGORY = 'medium'` (
  `module/models/armor.mjs:10-13`).
- En préparation de données (`armor.mjs:61-80`) : `defense.base` et `soak.base` sont clampés aux bornes de la catégorie.
- `soak.start` est défini par la catégorie et utilisé dans l'UI pour calculer le bonus d'agilité (`armor.mjs:122`).

### D2 — Propriétés d'armure via `system.qualities` (Option C)

Les propriétés spéciales d'une armure (encombrante, organique, scellée, etc.) sont stockées dans `system.qualities` au
format **Option C** défini dans `docs/specifications/qualities-format-spec.md` :

```javascript
system.qualities = [
  { key: "bulky", rank: null, hasRank: false, active: true, source: "oggdude" },
  { key: "sealed", rank: null, hasRank: false, active: true, source: "base" },
]
```

Propriétés canoniques définies dans `module/config/armor.mjs` (`PROPERTIES`) :

| Clé          | Label       | Description                                             |
|--------------|-------------|---------------------------------------------------------|
| `bulky`      | Encombrante | Armure lourde qui réduit la mobilité                    |
| `organic`    | Organique   | Matériau naturel (cuir, écailles)                       |
| `sealed`     | Scellée     | Protection intégrale contre les environnements hostiles |
| `full-body`  | Intégrale   | Couvre tout le corps                                    |
| `restricted` | Restreinte  | Nécessite une autorisation                              |

**Règles :**

- Le format Option C est partagé avec les armes et les autres Items (décision #14).
- Les propriétés sont sans rang (`hasRank: false`) par défaut.
- L'import OggDude convertit les propriétés OggDude vers ces clés normalisées (`processArmorProperties` dans
  `armor-ogg-dude.mjs:133`).
- Les propriétés sont limitées à 12 maximum par armure (troncature avec warning).

### D3 — Distinction catégorie / propriété dans les données OggDude

Dans les XML OggDude, `<Categories>` contient une liste `<Category>` qui mélange catégories et propriétés. La résolution
se fait en deux passes :

1. **Identification de la catégorie** : parcours des `<Category>` et recherche de la première valeur reconnue comme
   catégorie (Light, Medium, Heavy, Natural, Unarmored ou leurs codes numériques 0-4). Les valeurs connues comme
   propriétés sont ignorées.
2. **Extraction des propriétés** : les `<Category>` restantes (non reconnues comme catégorie) sont mappées vers les
   propriétés canoniques.

**Table de mapping des catégories OggDude vers SWERPG :**

Les valeurs OggDude ne sont jamais interprétées par un mapping global. Elles sont toujours résolues dans le contexte du type d’Item : weapon, armor, gear, etc.

| Valeur `<Category>` OggDude | `system.category` |
|-----------------------------|-------------------|
| `Light`, `light`, `1`       | `light`           |
| `Medium`, `medium`, `2`     | `medium`          |
| `Heavy`, `heavy`, `3`       | `heavy`           |
| `Natural`, `4`              | `natural`         |
| `Unarmored`, `0`            | `unarmored`       |

**Table de mapping des propriétés OggDude vers SWERPG :**

| Valeur `<Category>` OggDude | `system.qualities` key | Notes                        |
|-----------------------------|------------------------|------------------------------|
| `Bulky`, `bulky`, `1`       | `bulky`                | Encombrant                   |
| `Organic`, `organic`, `2`   | `organic`              | Organique                    |
| `Heavy`                     | `bulky`                | Variante mappée vers bulky   |
| `Unwieldy`                  | `bulky`                | Variante mappée vers bulky   |
| `Natural`                   | `organic`              | Variante mappée vers organic |
| `Leather`                   | `organic`              | Variante mappée vers organic |
| `Hide`                      | `organic`              | Variante mappée vers organic |

**Propriétés OggDude non supportées (ignorées) :**

`full body` n’est pas mappé automatiquement vers `full-body`, car les données OggDude l’emploient comme description d’habillage sans effet système fiable. La qualité canonique `full-body` reste disponible pour usage manuel ou futur mapping explicite.

| Valeur OggDude   | Raison                                      |
|------------------|---------------------------------------------|
| `full body`      | Propriété descriptive sans impact mécanique |
| `hard full body` | Propriété descriptive                       |
| `hard`           | Propriété descriptive                       |
| `resistant`      | Propriété descriptive                       |
| `sealable`       | Propriété descriptive (distincte de sealed) |
| `powered`        | Propriété descriptive                       |
| `light`          | Ambigu avec la catégorie Light              |
| `half body`      | Propriété descriptive                       |

**Règles de priorité et fallback :**

1. Si une catégorie reconnue est trouvée → utilisée comme `system.category`.
2. Sinon si mode strict (`FLAG_STRICT_ARMOR_VALIDATION = true`) → armure rejetée.
3. Sinon → fallback à `medium` avec warning.
4. Les propriétés inconnues sont ignorées avec un compteur `unknownProperties`.

### D4 — `system.properties` non retenu

Le champ `system.properties` (envisagé dans #26) **n'a pas été créé**. Les propriétés d'armure sont gérées via
`system.qualities` (Option C), ce qui :

- évite la duplication de mécanismes de tags,
- s'aligne sur la décision #14 de format global pour les qualités,
- permet de bénéficier des travaux futurs d'automatisation des qualités (active, source, effets).

Toutes les données OggDude brutes utilisées ou ignorées par un mapper doivent être conservées dans flags.swerpg.oggdude, au moins sous une forme minimale, sauf décision explicite documentée.

### D5 — Intégration métier

La catégorie d'armure est utilisée dans la logique de jeu :

- `canFreeMove(actor, armor)` dans `module/documents/actor-mixins/equipment.mjs:40` : les armures `heavy` empêchent le
  déplacement gratuit sans talent `armoredefficiency`.
- `equipment.unarmored` : flag calculé pour les armures `unarmored` (`equipment.mjs:70`).

## Options

### O1 — Catégories en texte libre

- **Description** : `system.category` comme chaîne libre sans enum.
- **Avantages** : Flexibilité pour l'import.
- **Inconvénients** : Impossible de clamer defense/soak, pas de validation.
- **Décision** : Rejetée — les bornes de défense/soak sont dépendantes de la catégorie.

### O2 — Propriétés dans `system.properties` (liste de chaînes)

- **Description** : Créer un champ `system.properties` en liste de chaînes brutes.
- **Avantages** : Distinction claire catégorie/propriété.
- **Inconvénients** : Duplication avec `system.qualities`, fragmentation des mécanismes de tags.
- **Décision** : Rejetée — `system.qualities` (Option C) offre une structure plus riche et unifiée.

### O3 — Catégories numériques uniquement

- **Description** : Stocker la catégorie comme un entier (0-4).
- **Avantages** : Léger.
- **Inconvénients** : Perte de lisibilité, pas de i18n directe pour l'affichage.
- **Décision** : Rejetée — les clés nommées sont plus explicites et localisables.

### O4 — OggDude brut uniquement

- **Description** : Stocker les catégories OggDude brutes sans mapping.
- **Avantages** : Aucun effort de normalisation.
- **Inconvénients** : Impossible de piloter la mécanique (clamp defense/soak).
- **Décision** : Rejetée — la catégorie détermine les bornes de défense/soak.

## Rationale

1. **Enum fermée avec bornes** : Les 5 catégories d'armure correspondent aux règles de Star Wars Edge (
   light/medium/heavy) plus les cas spéciaux (unarmored/natural). Les bornes defense/soak sont une traduction directe
   des règles. Aucune extension prévue.

2. **Propriétés dans system.qualities** : Plutôt qu'un champ `system.properties` dédié, les propriétés d'armure
   utilisent le format Option C des qualités (#14). Cela unifie le traitement des tags à travers tous les types d'Items
   et évite de recréer un mécanisme parallèle.

3. **Distinction catégorie/propriété à l'import** : Les données OggDude mélangent catégories et propriétés dans les
   mêmes balises `<Category>`. La séparation se fait par reconnaissance des valeurs connues, avec une priorité claire (
   catégorie d'abord, propriétés ensuite).

4. **Fallback 'medium'** : Catégorie la plus neutre, correspond au comportement par défaut attendu.

5. **Cohérence avec la spec qualities** : Les propriétés d'armure bénéficient de la même structure extensible que les
   qualités d'armes.

## Impact

### Schéma armor (`module/models/armor.mjs`)

- `system.category` validé contre `SYSTEM.ARMOR.CATEGORIES` via `ITEM_CATEGORIES`.
- `system.qualities` au format Option C (ArrayField de `buildQualitySchema()`).
- `defense.base` et `soak.base` clampés aux bornes de la catégorie sélectionnée en `prepareBaseData()`.

### Config armor (`module/config/armor.mjs`)

- `CATEGORIES` : enum fermée de 5 valeurs avec métadonnées (defense, soak).
- `PROPERTIES` : 5 propriétés canoniques sans rang.
- `UNARMORED_DATA` : données par défaut pour l'item "Sans armure".

### Import OggDude (`module/importer/items/armor-ogg-dude.mjs`)

- `resolveArmorCategoryWithFallback()` : résolution de la catégorie avec séparation des propriétés.
- `processArmorProperties()` : conversion des propriétés OggDude → qualités Option C.
- Mode strict/normal : rejet ou fallback selon `FLAG_STRICT_ARMOR_VALIDATION`.
- Conservation des valeurs brutes OggDude dans `flags.swerpg.oggdude.categories`.
- Conservation optionnelle des valeurs ignorées ou inconnues dans `flags.swerpg.oggdude.ignoredCategories` et/ou `flags.swerpg.oggdude.unknownProperties`.

### Cartographie OggDude (`module/importer/mappings/`)

- `oggdude-armor-category-map.mjs` : table de mapping des catégories (9 entrées : Light, Medium, Heavy, Natural,
  Unarmored + variantes casse + codes 0-4).
- `oggdude-armor-property-map.mjs` : table de mapping des propriétés (10 entrées : Bulky, Organic, Heavy, Unwieldy,
  Natural, Leather, Hide + codes 1-2).

### Logique métier (`module/documents/actor-mixins/equipment.mjs`)

- `canFreeMove()` utilise `system.category === 'heavy'` pour bloquer le déplacement gratuit.
- `equipment.unarmored` flag calculé sur `system.category === 'unarmored'`.

### Qualités (global)

Aucun impact — l'armure utilise `system.qualities` au même format que les armes, conformément à la spec
`qualities-format-spec.md`.

## Performance Considerations

- Les tables de catégories et propriétés sont pré-chargées (complexité O(1) par lookup).
- Le clamp defense/soak est une opération mathématique simple, sans surcoût mesurable.
- Les propriétés d'armure sont limitées à 12 maximum (borne anti-surplus).

## Review

Cette ADR est un enregistrement *a posteriori* de décisions déjà implémentées et en production. Aucune réévaluation
périodique nécessaire. Les évolutions futures (nouvelles propriétés, catégories supplémentaires) feront l'objet d'
amendements à cet ADR ou d'ADRs séparées.

## Links

- Issue source (qualités) : #14
- Issue connexe (propriétés armure) : #26
- Spec qualités : `docs/specifications/qualities-format-spec.md`
- ADR taxonomie des armes : `documentation/architecture/adr/adr-0007-weapon-taxonomy.md`
- Config armor : `module/config/armor.mjs`
- Modèle armor : `module/models/armor.mjs`
- Import OggDude armor : `module/importer/items/armor-ogg-dude.mjs`
- Cartographie catégories : `module/importer/mappings/oggdude-armor-category-map.mjs`
- Cartographie propriétés : `module/importer/mappings/oggdude-armor-property-map.mjs`
- Logique équipement : `module/documents/actor-mixins/equipment.mjs`
- Documentation import : `documentation/importer/import-armor.md`

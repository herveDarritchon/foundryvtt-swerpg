---
title: 'ADR-0007: Taxonomie canonique des armes (system.category, system.weaponType)'
status: 'Accepted'
date: '2026-05-07'
authors: 'Hervé Darritchon'
tags: [ 'architecture', 'weapon', 'taxonomy', 'data-model', 'import-oggdude' ]
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Validée le 2026-05-07. L'ADR formalise les décisions d'architecture issues de #15 et sert de référence pour #97, #98, #100 et #101.

## Context

Le système SWERPG expose pour les Items de type `weapon` un champ `system.category` hérité de `SwerpgPhysicalItem` (
`module/models/physical.mjs:10`). Ce champ est actuellement :

- **non spécialisé** pour les armes (pas de `ITEM_CATEGORIES` ni `DEFAULT_CATEGORY` définis dans `SwerpgWeapon`),
- **non rempli** par l'import OggDude (`module/importer/items/weapon-ogg-dude.mjs` stocke `<Type>` et `<Categories>`
  dans un mécanisme générique `flags.swerpg.oggdudeTags`),
- **sans role fonctionnel clair** (ni utilisé par la logique métier, ni par les filtres, ni par l'UI).

En parallèle, les données OggDude fournissent deux informations distinctes :

1. `<Type>` — une valeur narrative et parfois composite (ex. `Explosives/Other`, `Blaster`, `Slugthrower`,
   `Flame-Projector`) décrivant la lignée ou la famille de l'arme.
2. `<Categories>` — une ou plusieurs valeurs de grande famille de gameplay (ex. `Ranged`, `Melee`, `Vehicle`).

Ces deux informations sont aujourd'hui mélangées dans `flags.swerpg.oggdudeTags` sans structure ni normalisation, ce qui
empêche leur exploitation pour :

- les filtres UI (compendia, inventaires, sélecteurs),
- les badges / icônes différenciés par type d'arme,
- les règles métier dépendant de la famille de l'arme (ex. Ranged vs Melee),
- les imports futurs (autres formats que OggDude).

Le besoin d'une taxonomie stable et documentée a été identifié dans l'issue #15. La présente ADR formalise la décision
d'architecture.

## Decision

### D1 — Séparation des rôles

On distingue deux champs distincts dans le schéma `weapon` :

1. **`system.category`** : représente la **famille mécanique** de l'arme.
    - Enum interne fermée, utilisée par le code, les filtres et l'UI.
    - Détermine/complète le comportement mécanique (Ranged vs Melee, skill associé, etc.).
    - Alimentée principalement par `<Categories>` OggDude (via mapping normalisé).
    - Calquée sur le pattern existant de `system.ARMOR.CATEGORIES` (`module/config/armor.mjs:13`).

2. **`system.weaponType`** : représente le **sous-type narratif / lignée d'arme**.
    - Champ normalisé (valeurs connues via mapping OggDude mais pas nécessairement une enum fermée).
    - Issu de `<Type>` OggDude.
    - Usage informatif, affichage, filtres secondaires et préparation pour futurs comportements.

### D2 — Enum canonique proposée pour `system.category`

Les valeurs proposées à titre initial (seront finalisées dans #97) :

| Clé         | Label         | Skill principal          | RangeCategory | Notes                                   |
|-------------|---------------|--------------------------|---------------|-----------------------------------------|
| `melee`     | Mêlée         | melee, lightsaber, brawl | melee         | Armes de corps-à-corps                  |
| `ranged`    | Distance      | rangedLight, rangedHeavy | distant       | Armes à distance (hors heavy)           |
| `gunnery`   | Armes lourdes | gunnery                  | distant       | Mitrailleuses, lance-missiles portatifs |
| `explosive` | Explosifs     | variable                 | variable      | Grenades, mines, démolitions            |
| `thrown`    | Jet           | rangedLight              | distant       | Couteaux de lancer, shurikens           |
| `vehicle`   | Véhicule      | gunnery                  | distant       | Armement monté sur véhicule             |
| `natural`   | Naturelles    | brawl                    | melee         | Attaques sans arme                      |

**Règles :**

- Toute arme non catégorisée reçoit `melee` ou `ranged` selon son `SkillKey` (fallback sûr).
- Les valeurs sont définies dans `module/config/weapon.mjs` sous une export `CATEGORIES` suivant le pattern d'
  `armor.mjs`.

### D3 — `system.weaponType` : valeurs et mapping OggDude

Le champ `system.weaponType` reçoit une valeur normalisée à partir de `<Type>` OggDude via une table de mapping :

| `<Type>` OggDude   | `system.weaponType` normalisé |
|--------------------|-------------------------------|
| `Blasters`         | `blaster`                     |
| `Blasters/Heavy`   | `blaster-heavy`               |
| `Slugthrowers`     | `slugthrower`                 |
| `Flame-Projectors` | `flame-projector`             |
| `Explosives/Other` | `explosive-other`             |
| `Ion`              | `ion`                         |
| `Missiles`         | `missile`                     |
| `Melee`            | `melee`                       |
| `Lightsabers`      | `lightsaber`                  |
| `Brawl`            | `brawl`                       |

**Règles :**

- Les valeurs sont normalisées en kebab-case.
- Les valeurs inconnues sont conservées telles quelles (slugifiées) avec un warning.
- La valeur brute d'origine est toujours conservée dans `flags.swerpg.oggdude.type`.

### D4 — Mapping de `<Categories>` OggDude

Les `<Categories>` OggDude sont utilisées pour **déduire ou confirmer** `system.category` :

| `<Category>` OggDude | `system.category` mappé |
|----------------------|-------------------------|
| `Ranged`             | `ranged`                |
| `Melee`              | `melee`                 |
| `Thrown`             | `thrown`                |
| `Vehicle`            | `vehicle`               |
| `Starship`           | `vehicle`               |
| `Explosive`          | `explosive`             |
| `Heavy`              | `gunnery`               |

**Règles de priorité :**

1. Si `<Categories>` fournit une valeur reconnue → celle-ci détermine `system.category`.
2. Si `<Categories>` est absent ou ne contient que des valeurs inconnues → `SkillKey` détermine la catégorie :
    - `melee`, `lightsaber`, `brawl` → `melee`
    - `rangedLight`, `rangedHeavy` → `ranged`
    - `gunnery` → `gunnery`
3. Fallback ultime : `melee` ou `ranged` selon la `Range` (engaged → melee).

### D5 — Conservation des valeurs brutes en flags

Les valeurs OggDude originales sont conservées dans `flags.swerpg.oggdude` pour traçabilité et fallback :

```javascript
flags.swerpg.oggdude = {
  type: "Explosives/Other",        // valeur brute de <Type>
  categories: ["Ranged", "Starship"], // valeur brute de <Categories>
  source: { name: "...", page: 123 },
  sizeHigh: 2.5,
}
```

Ces flags remplacent/absorberont le mécanisme actuel `flags.swerpg.oggdudeTags` qui est fusionné type/category/status.

### D6 — Gouvernance

C'est SWERPG qui fait autorité sur sa taxonomie :

- Les champs système (`system.category`, `system.weaponType`) sont normalisés et validés.
- OggDude est mappé vers ces champs via des tables de correspondance.
- Les valeurs brutes sont conservées en flags pour traçabilité.
- Les futures sources d'import suivront les mêmes règles de mapping (pas d'exception par source).
- Chaque mapper d’Item doit exposer une stratégie de validation :
   - strict = rejet si catégorie mécanique non résolue ;
   - normal = fallback documenté + warning ; 
   - lenient éventuel = conservation brute + catégorie par défaut.

### D7 — Implications UX

La taxonomie est dimensionnée pour supporter :

- **Filtres stables** dans les compendia, inventaires et sélecteurs (ex. "Afficher uniquement les armes de mêlée").
- **Badges / icônes différenciés** par famille mécanique (ex. icône spéciale pour explosifs).
- **Comportements différenciés** futurs (ex. les explosifs peuvent utiliser des règles de zone, les armes de véhicule
  des règles de pilotage).
- Cohérence avec le format "Option C" des qualités (`docs/specifications/qualities-format-spec.md`).
- `system.weaponType` ne doit jamais absorber les qualités mécaniques d’arme. Les qualités restent exclusivement dans
  `system.qualities` au format "Option C".

## Options

### O1 — Fusion dans un seul champ `system.category`

- **Description** : Concentrer tout (famille mécanique + type narratif) dans `system.category`.
- **Avantages** : Simplicité, pas de nouveau champ.
- **Inconvénients** : Mélange des niveaux d'abstraction, difficile à filtrer/fiabiliser, fragile pour l'automatisation.
- **Décision** : Rejetée — la séparation est nécessaire pour la clarté et l'évolutivité.

### O2 — Texte libre sans normalisation

- **Description** : `system.category` reste une chaîne libre, sans enum.
- **Avantages** : Maximum de flexibilité.
- **Inconvénients** : Impossible d'automatiser, filtres approximatifs, pas de contrat pour l'import.
- **Décision** : Rejetée — contraire aux besoins UX et d'automatisation.

### O3 — Conservation brute uniquement (pas de mapping)

- **Description** : Stocker `<Type>` et `<Categories>` uniquement en flags, sans champ système normalisé.
- **Avantages** : Zéro effort de normalisation.
- **Inconvénients** : Aucune valeur ajoutée pour le code/l'UI, reporte le problème.
- **Décision** : Rejetée — la taxonomie doit être exploitable par le système.

### O4 — Trois champs (category + weaponType + tags list)

- **Description** : Ajouter un champ `system.tags` ou `system.properties` pour les catégories OggDude supplémentaires.
- **Avantages** : Conservation exhaustive de l'information.
- **Inconvénients** : Complexité ajoutée sans besoin immédiat, risque de duplication.
- **Décision** : Reportée — les valeurs brutes dans `flags.swerpg.oggdude.categories` suffisent pour l'instant. Un champ
  tags générique pourra être envisagé dans une ADR ultérieure.

## Rationale

1. **Séparation des rôles** : `system.category` (mécanique) et `system.weaponType` (narratif) répondent à des besoins
   différents. Le premier pilote la logique de jeu, le second sert l'affichage et l'identification. Les fusionner
   créerait de la confusion et des ambiguïtés de mapping (ex. un `Blaster` peut être `Ranged` ou `Vehicle`).

2. **Enum fermée pour category** : Seule une enum stable permet des filtres fiables, des icônes prédictibles et du code
   métier conditionnel (ex. `if (category.ranged) ...`). Le pattern est déjà validé par `system.ARMOR.CATEGORIES`.

3. **Flags bruts conservés** : Garantit la traçabilité et permet de corriger les mappings imparfaits sans perte
   d'information. Évite le verrouillage sur une taxonomie qui pourrait évoluer.

4. **Mapping depuis OggDude best-effort** : `<Categories>` est la source la plus fiable pour la famille mécanique. Le
   `SkillKey` sert de fallback fiable. Les cas non mappés sont signalés par warning.

5. **Cohérence avec la spec qualities** : Même approche structurée, normalisation en anglais, préparation à
   l'automatisation.

## Impact

### Schéma weapon (`module/models/weapon.mjs`)

- Ajout de `ITEM_CATEGORIES = SYSTEM.WEAPON.CATEGORIES` et `DEFAULT_CATEGORY = 'ranged'`. DEFAULT_CATEGORY = 'ranged'
  n’est qu’une valeur initiale de création manuelle ou de sécurité schéma.
  Pour l’import OggDude, la catégorie doit toujours être résolue par la chaîne : <Categories> reconnue → SkillKey →
  Range → DEFAULT_CATEGORY.
- `system.category` reste hérité de `SwerpgPhysicalItem` mais est désormais validé contre l'enum weapon.
- Ajout de `system.weaponType` : `StringField({ required: false, choices: null, initial: '' })` — texte libre normalisé
  sans enum fermée (les valeurs sont contrôlées côté import, pas au niveau du schéma).

### Config weapon (`module/config/weapon.mjs`)

- Ajout d'une export `CATEGORIES` suivant le pattern d'`armor.mjs`.
- Définition des métadonnées associées à chaque catégorie (skill, rangeCategory, label).

### Import OggDude weapon (`module/importer/items/weapon-ogg-dude.mjs`)

Les valeurs OggDude ne sont jamais interprétées par un mapping global. Elles sont toujours résolues dans le contexte du
type d’Item : weapon, armor, gear, etc.

- Ajout du mapping `<Type>` → `system.weaponType` + `flags.swerpg.oggdude.type`.
- Ajout du mapping `<Categories>` → `system.category` + `flags.swerpg.oggdude.categories`.
- Évolution / absorption du mécanisme `flags.swerpg.oggdudeTags`.

### UI / Filtres (`module/applications/sheets/character-sheet.mjs`, templates)

- Les filtres et affichages peuvent désormais utiliser `system.category` et `system.weaponType` comme clés stables.
- Cohérence maintenue avec `getTags()` (`module/models/weapon.mjs:279`).

### Qualités

Aucun impact direct sur `system.qualities` dont le format reste celui défini dans
`docs/specifications/qualities-format-spec.md`. La taxonomie des armes et celle des qualités sont orthogonales.

## Security Considerations

- Les valeurs de `system.weaponType` en provenance d'OggDude sont normalisées (slugifiées) pour prévenir l'injection de
  contenu arbitraire.
- Les flags bruts (`flags.swerpg.oggdude.type`, `flags.swerpg.oggdude.categories`) sont stockés en tant que données et
  ne sont pas interprétés dynamiquement.

## Performance Considerations

- L'ajout de `system.weaponType` (StringField) a un coût négligeable en mémoire et en sérialisation.
- Les tables de mapping OggDude sont pré-chargées (complexité O(1) par lookup).
- Le mécanisme `flags.swerpg.oggdude.categories` remplace `flags.swerpg.oggdudeTags` sans surcoût.

## Review

**Validation :** ADR validée le 2026-05-07.

Cette ADR doit être réévaluée après :

- L'implémentation de #97 (finalisation des valeurs d'enum).
- L'implémentation de #98 (alignement du schéma).
- Un retour d'expérience sur l'import OggDude (#101) et l'UI (#100).

Ces implémentations pourront amender l'ADR si des écarts sont constatés par rapport aux décisions initiales.

Prochaine réévaluation : 2026-08-01.

## Links

- Issue source : #15
- Implémentation découlant de cette ADR : #97, #98, #100, #101
- Issues connexes : #16 (Restricted), #17 (Migration armes importées), #18 (SizeHigh)
- Spec qualités : `docs/specifications/qualities-format-spec.md`
- Plan d'implémentation : `documentation/plan/features/feature-weapon-taxonomy-adr-1.md`
- Pattern existant armure : `module/config/armor.mjs`
- Schéma physique actuel : `module/models/physical.mjs`
- Import OggDude actuel : `module/importer/items/weapon-ogg-dude.mjs`

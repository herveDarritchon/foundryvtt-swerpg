# Plan d'implémentation — US1 : Définir le type `specialization-tree`

**Issue
** : [#185 — US1: Définir le type specialization-tree](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/185)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`,
`documentation/architecture/adr/adr-0005-localization-strategy.md`,
`documentation/architecture/adr/adr-0010-architecture-des-effets-mécaniques-des-talents.md`  
**Module(s) impacté(s)** : `module/models/specialization-tree.mjs` (création),
`module/applications/sheets/specialization-tree.mjs` (création), `module/models/_module.mjs` (modification),
`module/applications/_module.mjs` (modification), `swerpg.mjs` (modification), `system.json` (modification),
`templates/sheets/partials/specialization-tree-config.hbs` (création), `lang/fr.json` (modification), `lang/en.json` (
modification)

---

## 1. Objectif

Créer le type d'Item `specialization-tree` : le référentiel monde/compendium décrivant la progression d'une
spécialisation. C'est le socle du Lot 1 de l'épic Talents V1. Sans ce type, aucun arbre ne peut être stocké, importé ou
consulté.

US1 pose l'infrastructure du type : son modèle de données, son enregistrement Foundry, sa sheet minimale, et les clés
d'i18n. Les nœuds et connexions sont présents dans le schéma dès cette US, mais avec un contrat volontairement minimal
et extensible ; US2 détaillera la structure des nœuds.

---

## 2. Périmètre

### Inclus dans US1

- Création du fichier `module/models/specialization-tree.mjs` avec `TypeDataModel` comportant :
    - `description` : `HTMLField` — conforme au pattern des autres Items (career, specialization, etc.)
    - `specializationId` : `StringField` — référence vers la spécialisation liée
    - `careerId` : `StringField` — référence vers la carrière liée (nullable, facultative)
    - `nodes` : `ArrayField` de `SchemaField` minimal — tableau de nœuds, chaque nœud porte au minimum `nodeId` (
      `StringField` requis) et `talentId` (`StringField` requis). Le schéma est conçu pour être étendu par US2 sans
      breaking change
    - `connections` : `ArrayField` de `SchemaField` minimal — tableau de connexions entre nœuds, chaque connexion porte
      `from` et `to` (`StringField` requis)
    - `source` : `SchemaField` avec `system` (`StringField`), `book` (`StringField`, nullable), `page` (`StringField`,
      nullable) — conforme au pattern `motivation`/`duty` existant
- Export dans `module/models/_module.mjs` sous le nom `SwerpgSpecializationTree`
- Enregistrement du type d'Item dans `system.json` :
  ```json
  "specialization-tree": { "htmlFields": ["description"] }
  ```
- Enregistrement du data model dans `swerpg.mjs` :
  ```js
  CONFIG.Item.dataModels['specialization-tree'] = models.SwerpgSpecializationTree
  ```
- Enregistrement d'une sheet minimale dans `swerpg.mjs` :
    - Classe `SpecializationTreeSheet` dans `module/applications/sheets/specialization-tree.mjs`
    - Utilise `api.HandlebarsApplicationMixin(sheets.ItemSheetV2)` via `SwerpgBaseItemSheet`
    - Template partiel `templates/sheets/partials/specialization-tree-config.hbs` pour l'onglet `config`
    - L'onglet `config` affiche en lecture/édition les champs `specializationId`, `careerId`, `source`
    - L'onglet `description` utilise le template item-description standard
    - Export dans `module/applications/_module.mjs`
    - Enregistrement V2 (utilise `foundry.applications.apps.DocumentSheetConfig.registerSheet`)
- Clés d'i18n minimales dans `lang/en.json` et `lang/fr.json` :
    - `TYPES.Item.specialization-tree` : nom lisible du type
    - `SWERPG.SHEETS.SpecializationTree` : label de la sheet
    - `SPECIALIZATION_TREE.FIELDS.specializationId` : label + hint
    - `SPECIALIZATION_TREE.FIELDS.careerId` : label + hint
    - `SPECIALIZATION_TREE.FIELDS.source` : label + hint pour les sous-champs
    - `SPECIALIZATION_TREE.FIELDS.nodes` : label (affichage info)
    - `SPECIALIZATION_TREE.FIELDS.connections` : label (affichage info)
- Tests Vitest :
    - Test unitaire du `TypeDataModel.defineSchema()` — vérifie la présence et le type de tous les champs
    - Test de création d'un item `specialization-tree` avec des données valides
    - Test de validation : champs requis manquants, valeurs invalides
    - Test d'ouverture de la sheet — vérifie que la classe sheet existe et s'initialise sans erreur

### Exclu de US1

- Définition détaillée de la structure des nœuds (position, coût, prérequis, connexions typées) → US2
- Définition des achats de nœuds sur l'acteur → US3
- Résolution spécialisation possédée → arbre → US4
- Import OggDude des arbres → US10
- État des nœuds (purchased/available/locked/invalid) → US5
- Vue graphique PIXI → US15
- Toute logique métier d'achat, de consolidation ou de synchronisation
- Migration de données (aucune donnée `specialization-tree` n'existe)
- Modification du modèle `specialization` existant

---

## 3. Constat sur l'existant

### Aucun type `specialization-tree` n'existe

Le type n'est pas déclaré dans :

- `system.json` → `documentTypes.Item` (liste exhaustive des types actuels)
- `CONFIG.Item.dataModels` dans `swerpg.mjs`
- `module/models/_module.mjs`

### Déclaration des types d'Item actuels

Dans `system.json`, les types d'Item sont :
`armor`, `career`, `duty`, `gear`, `obligation`, `specialization`, `species`, `talent`, `weapon`, `motivation-category`,
`motivation`

Dans `swerpg.mjs`, `CONFIG.Item.dataModels` est initialisé avec les mêmes types (sauf motivation).

### Pattern d'enregistrement d'un Item simple

Les Items les plus proches fonctionnellement (`career`, `specialization`, `duty`, `motivation`) suivent tous le même
pattern :

1. Fichier modèle dans `module/models/` avec `foundry.abstract.TypeDataModel`
2. Export dans `module/models/_module.mjs`
3. Déclaration dans `system.json` sous `documentTypes.Item`
4. Enregistrement `CONFIG.Item.dataModels` dans `swerpg.mjs`
5. Sheet héritant de `SwerpgBaseItemSheet` dans `module/applications/sheets/`
6. Export dans `module/applications/_module.mjs`
7. Enregistrement sheet V1 ou V2 dans `swerpg.mjs`
8. Template partiel `templates/sheets/partials/<type>-config.hbs`

Le système désenregistre la sheet core Item (
`foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet)`). Si un type n'a pas de
sheet enregistrée, l'Item ne peut pas être ouvert dans l'UI. D'où la nécessité d'une sheet minimale dès US1.

### Legacy Crucible encore présent

Le fichier `module/config/talent-tree.mjs` contient la classe `SwerpgTalentNode` qui construit un arbre statique avec
des nœuds PIXI (angles, distances, textures, etc.). Ce code gère un arbre global sans notion de spécialisation Edge.

Le fichier `module/canvas/talent-tree.mjs` contient le rendu PIXI de cet arbre.

Ces fichiers ne sont pas impactés par US1, mais l'épic prévoit leur neutralisation ou isolement dans le Lot 6 (US21).

### Données de référence cadrage

Le document `01-modele-domaine-talents.md` décrit précisément le modèle cible (section 4). Le document
`03-import-oggdude-talents.md` décrit les données minimales d'import (section 3.2). Le document
`07-plan-issues-github.md` positionne US1 comme première US du Lot 1.

---

## 4. Décisions d'architecture

### 4.1. Stockage du tree dans `item.system`

**Décision** : Les données du référentiel `specialization-tree` sont stockées dans `item.system` via
`TypeDataModel.defineSchema()`.

Justification :

- L'arbre de spécialisation est une source de vérité métier (référentiel monde/compendium), pas une donnée secondaire.
- Conforme à ADR-0001 qui impose `TypeDataModel` pour tous les modèles de données.
- Conforme au pattern des autres Items référentiels (`career`, `specialization`, `species`).
- Les données brutes d'import OggDude pourront être stockées dans `flags.swerpg.import` comme prévu par le cadrage (
  section 7 de l'epic).

### 4.2. Références `specializationId` et `careerId` en IDs métier simples pour US1

**Décision** : Utiliser des `StringField` simples comme `specializationId` et `careerId` pour US1.

Justification :

- Le cadrage US1 demande explicitement ces champs comme données minimales (01-modele-domaine-talents.md §4.3).
- Les UUIDs ne sont pas nécessaires à ce stade : US4 définira la stratégie de résolution spécialisation → arbre (
  treeUuid, treeId, importKey, etc.).
- Un passage aux UUIDs plus tard est un ajout de champ optionnel sans breaking change.

### 4.3. `nodes` et `connections` présents dès US1 avec contrat minimal extensible

**Décision** : Le `SchemaField` de chaque nœud contient `nodeId` (`StringField` requis) et `talentId` (`StringField`
requis). Le `SchemaField` de chaque connexion contient `from` et `to` (`StringField` requis).

Justification :

- Le conteneur doit exister pour qu'US2 puisse détailler la structure des nœuds sans refactor du type.
- Le schéma minimal est conçu pour être enrichi par US2 (ajout de `row`, `column`, `cost`, `prerequisites`, etc.) sans
  breaking change.
- Ce choix est conforme au principe DRY : on ne duplique pas la structure détaillée dans le plan US1.

### 4.4. Sheet ApplicationV2 dédiée dès US1

**Décision** : Créer une sheet minimale héritant de `SwerpgBaseItemSheet` dès US1.

Justification :

- Le système désenregistre la sheet core Item. Sans sheet, le type ne peut pas être ouvert dans l'UI.
- Le pattern `SwerpgBaseItemSheet` fournit déjà les onglets `description` et `config` ainsi que les fonctionnalités de
  base (header, form, submit).
- La sheet US1 affiche `description` et `config` (avec `specializationId`, `careerId`, `source`). Elle ne nécessite pas
  d'actions ni hooks.
- Conforme à ADR-0001 (ApplicationV2).
- La sheet minimale n'empêche pas une refonte UI ultérieure dans US15/US16.

### 4.5. Source de vérité

**Décision** : `item.system` est la source de vérité du référentiel. L'acteur ne stocke pas l'arbre complet.

Justification :

- Exigence explicite de l'issue #185 et de l'epic #184.
- L'acteur stocke uniquement les achats de nœuds (US3), pas la définition référentielle.

---

## 5. Plan de travail détaillé

### Étape 1 — Créer le TypeDataModel

**Quoi** : Créer `module/models/specialization-tree.mjs` avec `foundry.abstract.TypeDataModel`.

**Fichiers** :

- `module/models/specialization-tree.mjs` (création)
- `module/models/_module.mjs` (modification — ajout de l'export)

**Risques** :

- Si `LOCALIZATION_PREFIXES` est mal configuré, les labels des champs ne seront pas résolus. Suivre le pattern de
  `SwerpgCareer` / `SwerpgSpecialization`.

### Étape 2 — Déclarer le type dans le système

**Quoi** : Ajouter `specialization-tree` dans `system.json` et dans `CONFIG.Item.dataModels`.

**Fichiers** :

- `system.json` (modification)
- `swerpg.mjs` (modification)

**Risques** :

- Si le type n'est pas dans `system.json`, Foundry refusera de créer des Items de ce type.
- Si `CONFIG.Item.dataModels` est modifié avant l'import du modèle, le data model sera undefined au moment de l'init.
  L'ordre des imports dans `swerpg.mjs` doit placer l'import de `_module.mjs` avant l'enregistrement.

### Étape 3 — Créer la sheet minimale

**Quoi** : Créer la classe `SpecializationTreeSheet` et le template partiel de configuration.

**Fichiers** :

- `module/applications/sheets/specialization-tree.mjs` (création)
- `module/applications/_module.mjs` (modification — ajout de l'export)
- `templates/sheets/partials/specialization-tree-config.hbs` (création)
- `swerpg.mjs` (modification — enregistrement de la sheet)

**Risques** :

- Le template partiel est chargé via `_initializeItemSheetClass()` dans `SwerpgBaseItemSheet`. Le chemin doit
  correspondre à `systems/swerpg/templates/sheets/partials/specialization-tree-config.hbs`.
- Si `includesActions` ou `includesHooks` ne sont pas explicitement `false`, la sheet ajoutera des onglets non désirés.

### Étape 4 — Ajouter les clés d'i18n

**Quoi** : Ajouter les clés de traduction pour le type, la sheet et les champs.

**Fichiers** :

- `lang/en.json` (modification)
- `lang/fr.json` (modification)

**Risques** :

- Clé `TYPES.Item.specialization-tree` manquante → le type s'affiche comme `specialization-tree` dans l'UI Foundry.
- Clés `SPECIALIZATION_TREE.FIELDS.*` manquantes → les labels des champs ne sont pas localisés.

### Étape 5 — Écrire les tests Vitest

**Quoi** : Tests unitaires du data model et tests d'intégration de la création d'Item.

**Fichiers** :

- `tests/models/specialization-tree.test.mjs` (création)
- `tests/documents/item-specialization-tree.test.mjs` (création, optionnel — peut être fusionné avec le précédent)

**Risques** :

- Le mock Foundry doit supporter le `StringField`, `HTMLField`, `ArrayField`, `SchemaField` utilisés. Vérifier que
  `tests/helpers/mock-foundry.mjs` couvre tous ces types (c'est le cas actuellement).
- Le test de sheet nécessite de mocker `foundry.applications.apps.DocumentSheetConfig.registerSheet`.

---

## 6. Fichiers modifiés

| Fichier                                                    | Action       | Description du changement                                                                                                                                                |
|------------------------------------------------------------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `module/models/specialization-tree.mjs`                    | Création     | Data model `SwerpgSpecializationTree` avec `description`, `specializationId`, `careerId`, `nodes`, `connections`, `source`                                               |
| `module/models/_module.mjs`                                | Modification | Ajout de l'export `SwerpgSpecializationTree`                                                                                                                             |
| `system.json`                                              | Modification | Ajout de `"specialization-tree": {"htmlFields": ["description"]}` sous `documentTypes.Item`                                                                              |
| `swerpg.mjs`                                               | Modification | 3 ajouts : (1) enregistrement `CONFIG.Item.dataModels['specialization-tree']`, (2) import + enregistrement sheet V2, (3) import du modèle via `_module.mjs` déjà présent |
| `module/applications/sheets/specialization-tree.mjs`       | Création     | Sheet V2 minimale héritant de `SwerpgBaseItemSheet`                                                                                                                      |
| `module/applications/_module.mjs`                          | Modification | Ajout de l'export `SpecializationTreeSheet`                                                                                                                              |
| `templates/sheets/partials/specialization-tree-config.hbs` | Création     | Template partiel affichant `specializationId`, `careerId`, `source` en édition                                                                                           |
| `lang/en.json`                                             | Modification | Clés `TYPES.Item.specialization-tree`, `SWERPG.SHEETS.SpecializationTree`, `SPECIALIZATION_TREE.FIELDS.*`                                                                |
| `lang/fr.json`                                             | Modification | Idem en français                                                                                                                                                         |
| `tests/models/specialization-tree.test.mjs`                | Création     | Tests Vitest : `defineSchema`, création valide, validation, sheet. Créer le répertoire `tests/models/` si nécessaire                                                     |

---

## 7. Risques

| Risque                                                                                     | Impact                                                  | Mitigation                                                                                                                |
|--------------------------------------------------------------------------------------------|---------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Ordre d'init dans `swerpg.mjs` : data model enregistré avant que le module ne soit importé | Erreur Foundry au démarrage, Items non créables         | Vérifier que `_module.mjs` est importé avant le bloc init ; suivre le pattern des autres data models existants            |
| Template partiel `specialization-tree-config.hbs` absent ou mal nommé                      | La sheet ne trouve pas le partiel, erreur au rendu      | Suivre la convention de nommage exacte : `templates/sheets/partials/specialization-tree-config.hbs`                       |
| `system.json` non rechargé par Foundry après modification                                  | La création d'Item du type `specialization-tree` échoue | Foundry recharge `system.json` au démarrage ; pas de mitigation particulière                                              |
| `LOCALIZATION_PREFIXES` mal défini                                                         | Les labels/hints des champs ne sont pas résolus         | Définir `static LOCALIZATION_PREFIXES = ['SPECIALIZATION_TREE']` et structurer les clés en `SPECIALIZATION_TREE.FIELDS.*` |
| Le mock Foundry pour les tests ne supporte pas `HTMLField`                                 | Les tests du data model échouent                        | Ajouter `HTMLField` dans le mock si absent ; vérifier la liste dans `tests/helpers/mock-foundry.mjs`                      |

---

## 8. Proposition d'ordre de commit

1. **`feat(model): create SwerpgSpecializationTree TypeDataModel`**
    - `module/models/specialization-tree.mjs` (création)
    - `module/models/_module.mjs` (modification)

2. **`feat(system): declare specialization-tree Item type`**
    - `system.json` (modification)
    - `swerpg.mjs` (modification — enregistrement data model)

3. **`feat(ui): add minimal SpecializationTreeSheet`**
    - `module/applications/sheets/specialization-tree.mjs` (création)
    - `module/applications/_module.mjs` (modification)
    - `templates/sheets/partials/specialization-tree-config.hbs` (création)
    - `swerpg.mjs` (modification — enregistrement sheet)

4. **`feat(i18n): add specialization-tree localization keys`**
    - `lang/en.json` (modification)
    - `lang/fr.json` (modification)

5. **`test(model): add specialization-tree unit tests`**
    - `tests/models/specialization-tree.test.mjs` (création)

---

## 9. Dépendances avec les autres US

- **Dépend de** : Rien. US1 est le socle du Lot 1 et n'a pas de prérequis.
- **Est dépendante de** :
    - US2 (structure des nœuds) — enrichira `nodes` et `connections` dans le même data model
    - US3 (achats acteur) — utilisera `specialization-tree` comme référentiel
    - US4 (résolution spécialisation → arbre) — lira `specialization-tree` depuis le monde/compendium
    - US10 (import OggDude des arbres) — produira des Items `specialization-tree`
- **Ordre conseillé** : US1 → US2 → US3 → US4, puis Lot 2 et Lot 3 en parallèle.

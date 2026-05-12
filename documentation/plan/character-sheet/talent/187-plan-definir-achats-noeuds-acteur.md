# Plan d'implémentation — US3 : Définir les achats de nœuds sur l'acteur

**Issue
** : [#187 — US3: Définir les achats de nœuds sur l'acteur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/187)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`,
`documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`,
`documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`  
**Module(s) impacté(s)** : `module/models/character.mjs` (modification),
`tests/models/character-talent-purchases.test.mjs` (création), `tests/utils/actors/actor.mjs` (modification, si
réutilisé)

---

## 1. Objectif

Définir sur l'acteur une structure persistée représentant les achats de nœuds de talents, sans stocker l'historique
détaillé ni la vue consolidée.

Cette US pose la source de vérité minimale de progression talents pour les US suivantes. Elle ne met pas encore en place
la logique d'achat, de résolution d'arbre, de consolidation ni l'UI.

---

## 2. Périmètre

### Inclus dans cette US

- Ajout d'une structure `system.progression.talentPurchases` sur le data model `character`
- Définition d'un tableau d'achats avec, pour chaque entrée :
    - `treeId`
    - `nodeId`
    - `talentId`
    - `specializationId`
- Validation structurelle minimale via `TypeDataModel`
- Valeur initiale sûre pour éviter les régressions sur les personnages existants
- Tests Vitest couvrant :
    - présence du champ dans le schéma
    - structure d'une entrée
    - valeur par défaut
    - création d'une instance avec données minimales
    - compatibilité avec un acteur existant sans achats de talents

### Exclu de cette US

- Logique d'achat de nœud → US6
- Résolution spécialisation possédée → arbre → US4
- Calcul des états `purchased` / `available` / `locked` / `invalid` → US5
- Vue consolidée des talents possédés → US7/US8/US12+
- Migration ou neutralisation des anciennes logiques d'achat talent héritées de Crucible
- Stockage d'un historique détaillé d'achat dans l'acteur
- Ajout de `UUID`, `importKey`, `cost`, `timestamp`, `source` dans chaque achat
- Intégration UI, audit/log, ou synchronisation runtime

---

## 3. Constat sur l'existant

### Le modèle acteur ne porte aujourd'hui aucune structure d'achat de nœud

Dans `module/models/character.mjs`, `schema.progression` contient uniquement :

- `freeSkillRanks`
- `experience`

Aucune collection ne permet de persister un achat de nœud de talent.

### Les arbres et nœuds existent déjà côté référentiel

Les US précédentes (US1 #185, US2 #186) sont fermées et livrées :

- `module/models/specialization-tree.mjs` existe
- les nœuds portent déjà `nodeId`, `talentId`, `row`, `column`, `cost`
- `tests/models/specialization-tree.test.mjs` couvre ce modèle

US3 peut donc s'appuyer sur des identifiants de nœud et d'arbre déjà structurés.

### L'existant talent reste centré sur les Items embarqués

Le code actuel est encore piloté par des logiques héritées non migrées :

- `module/documents/actor-mixins/talents.mjs`
- `module/lib/talents/trained-talent.mjs`
- `module/lib/talents/ranked-trained-talent.mjs`
- `module/lib/talents/talent-cost-calculator.mjs`

Problèmes constatés :

- coût hardcodé `5` dans `addTalentWithXpCheck()`
- coût `rank * 5` dans `talent-cost-calculator.mjs`
- logique d'achat basée sur la possession d'Items `talent`
- aucune référence à `treeId`, `nodeId` ou `specializationId`

US3 ne doit pas corriger ces logiques ; elle doit seulement préparer le modèle qui permettra leur remplacement.

### L'audit/log est distinct de la source de vérité

`ADR-0011` impose les données secondaires en `flags.swerpg.*`.
Le document `06-audit-log-et-synchronisation.md` précise que la source de vérité métier des talents doit être la
structure d'achats acteur, tandis que l'historique détaillé relève de l'audit/log.

Cela exclut de stocker l'historique d'achat dans les flags comme source de vérité.

---

## 4. Décisions d'architecture

### 4.1. Emplacement de stockage

**Décision** : stocker la structure dans `actor.system.progression.talentPurchases`.

Options envisagées :

- `actor.system.talentPurchases`
- `actor.system.progression.talentPurchases`

Justification :

- choix explicitement validé pendant le cadrage de ce plan
- cohérent avec le regroupement des données de progression déjà présentes dans `schema.progression`
- limite la dispersion de données métier au niveau racine du `system`

Point d'attention :

- ce choix dévie de certains exemples documentaires qui mentionnent `actor.system.talentPurchases`
- le plan d'implémentation doit rendre cette convention explicite pour éviter une divergence silencieuse dans les US
  suivantes

### 4.2. Structure persistée minimale

**Décision** : chaque achat persiste uniquement les identifiants métier minimaux :

- `treeId`
- `nodeId`
- `talentId`
- `specializationId`

Justification :

- conforme à l'issue #187
- suffisant pour US5 et US6
- évite de figer trop tôt des références plus robustes qui relèvent plutôt de US4
- respecte le principe de persistance minimale décrit dans le cadrage talents

### 4.3. Pas d'historique détaillé dans l'acteur

**Décision** : ne pas stocker `timestamp`, `userId`, anciennes valeurs, coût payé, ni snapshots XP dans
`talentPurchases`.

Justification :

- conforme à l'issue
- conforme à `06-audit-log-et-synchronisation.md`
- conforme à `ADR-0011` : l'historique détaillé est une donnée secondaire d'audit, pas une donnée cœur du modèle acteur

### 4.4. Utiliser un `ArrayField(SchemaField(...))` dans le data model `character`

**Décision** : déclarer `talentPurchases` comme un tableau de structures typées dans `SwerpgCharacter.defineSchema()`.

Justification :

- cohérent avec l'adoption de `TypeDataModel` de `ADR-0001`
- permet une validation structurelle simple
- prépare les futures règles domaine sans dépendre encore du runtime Foundry ou de l'UI

### 4.5. Aucune migration applicative ni branchement métier en US3

**Décision** : US3 ne modifie pas les flux existants `addTalent`, `addTalentWithXpCheck`, `TrainedTalent`,
`RankedTrainedTalent`.

Justification :

- l'issue demande de définir la structure, pas d'implémenter l'achat
- toucher au métier maintenant mélangerait US3 avec US6
- réduit le risque de régression sur les talents actuels

### 4.6. Compatibilité descendante par champ optionnel avec valeur initiale vide

**Décision** : `talentPurchases` doit être absent ou initialisé à `[]` sans casser les personnages existants.

Justification :

- aucune migration de données existantes ne doit être requise
- l'acceptation mentionne explicitement l'absence de régression sur la structure acteur existante
- le codebase contient déjà de nombreux fixtures/tests d'acteur qui ne connaissent pas ce champ

---

## 5. Plan de travail détaillé

### Étape 1 — Étendre le schéma `character`

**Quoi** : ajouter `talentPurchases` dans `schema.progression` de `module/models/character.mjs` sous forme de tableau de
structures.

**Fichiers** :

- `module/models/character.mjs` (modification)

**Risques spécifiques** :

- casser des acteurs existants si le champ est rendu obligatoire sans valeur initiale adaptée
- créer une convention ambiguë si le chemin n'est pas clairement documenté dans le code

### Étape 2 — Définir le contrat minimal d'une entrée d'achat

**Quoi** : figer dans le schéma les quatre références minimales exigées par l'issue :

- `treeId`
- `nodeId`
- `talentId`
- `specializationId`

**Fichiers** :

- `module/models/character.mjs` (modification)

**Risques spécifiques** :

- introduire des champs supplémentaires non demandés qui élargiraient le scope
- choisir des noms divergents du cadrage et créer une dette immédiate pour US4/US6

### Étape 3 — Couvrir le schéma par des tests modèle

**Quoi** : créer un fichier de tests dédié à la structure `talentPurchases` pour vérifier :

- la présence du champ
- son type
- la structure d'une entrée
- la valeur initiale
- la création d'instance avec achats valides et avec acteur sans achats

**Fichiers** :

- `tests/models/character-talent-purchases.test.mjs` (création)

**Risques spécifiques** :

- absence actuelle de tests modèle sur `SwerpgCharacter`, ce qui nécessite un bootstrap plus verbeux
- tentation de tester du métier d'achat au lieu du simple contrat de données

### Étape 4 — Mettre à jour les fixtures de test si nécessaire

**Quoi** : si les utilitaires de test acteur supposent une structure fermée de `system.progression`, ajouter
`talentPurchases: []` dans les fixtures communes.

**Fichiers** :

- `tests/utils/actors/actor.mjs` (modification, si nécessaire)

**Risques spécifiques** :

- oublier un fixture partagé et provoquer des faux négatifs dans des tests non liés
- propager trop tôt cette structure dans des tests métier qui ne doivent pas encore dépendre d'US3

### Étape 5 — Vérifier le non-recouvrement avec audit/log et ancien flux talents

**Quoi** : s'assurer que le périmètre US3 n'introduit aucune écriture dans `flags.swerpg.logs` ni aucune modification
des anciennes classes d'achat de talents.

**Fichiers** :

- revue ciblée de `module/documents/actor-mixins/talents.mjs`
- revue ciblée de `module/lib/talents/*.mjs`
- revue ciblée de `tests/utils/audit-log.test.mjs`

**Risques spécifiques** :

- confusion de responsabilité entre stockage métier et traçabilité
- dérive de scope vers US6

---

## 6. Fichiers modifiés

| Fichier                                            | Action       | Description du changement                                                                                   |
|----------------------------------------------------|--------------|-------------------------------------------------------------------------------------------------------------|
| `module/models/character.mjs`                      | Modification | Ajout du champ `system.progression.talentPurchases` au data model `character` avec structure typée minimale |
| `tests/models/character-talent-purchases.test.mjs` | Création     | Tests Vitest dédiés au schéma et à la compatibilité de la structure d'achats                                |
| `tests/utils/actors/actor.mjs`                     | Modification | Ajout éventuel de `talentPurchases: []` dans les fixtures partagées si requis par les tests                 |

---

## 7. Risques

| Risque                                                                                                                          | Impact                               | Mitigation                                                                                                       |
|---------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|------------------------------------------------------------------------------------------------------------------|
| Divergence entre le cadrage historique (`system.talentPurchases`) et la décision retenue (`system.progression.talentPurchases`) | Confusion dans US4, US5, US6         | Documenter explicitement le chemin retenu dans le plan et réutiliser ce même chemin dans toutes les US suivantes |
| Champ rendu trop strict                                                                                                         | Régression sur les acteurs existants | Utiliser un tableau initial vide et une structure compatible avec l'absence d'achats                             |
| Scope creep vers la logique d'achat                                                                                             | Retard et risque de régression       | Limiter US3 au schéma et aux tests structurels                                                                   |
| Persistance de données non minimales                                                                                            | Dette de modèle avant US4            | Refuser en US3 les champs `UUID`, `importKey`, `cost`, `timestamp`, historique                                   |
| Fixtures de test incomplètes                                                                                                    | Faux échecs dans la suite Vitest     | Centraliser l'ajustement éventuel dans `tests/utils/actors/actor.mjs`                                            |

---

## 8. Proposition d'ordre de commit

1. **`feat(model): add talentPurchase schema to character progression`**
    - `module/models/character.mjs` (modification)

2. **`test(model): add character talent purchase schema coverage`**
    - `tests/models/character-talent-purchases.test.mjs` (création)

3. **`test(fixtures): align actor fixtures with talent purchase defaults`**
    - `tests/utils/actors/actor.mjs` (modification, si nécessaire)

---

## 9. Dépendances avec les autres US

- **Dépend de** :
    - US1 (#185) — type `specialization-tree` déjà posé
    - US2 (#186) — structure des nœuds déjà posée

- **Prépare directement** :
    - US4 — résolution spécialisation possédée → arbre
    - US5 — calcul d'état des nœuds
    - US6 — achat d'un nœud
    - US7/US8 — consolidation des talents possédés
    - intégration audit/log talents décrite dans `06-audit-log-et-synchronisation.md`

- **Ordre recommandé** :
    1. US3 ← ici
    2. US4 (peut être parallèle si pas de conflit)
    3. US5
    4. US6

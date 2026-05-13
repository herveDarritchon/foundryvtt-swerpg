# Plan d'implémentation — US5 : Calculer l'état des nœuds

**Issue** : [#189 — US5: Calculer l'état des nœuds](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/189)    
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`,
`documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/libs/talent-node-state.mjs` (création), `tests/lib/talent-node/talent-node-state.test.mjs` (
création)

---

## 1. Objectif

Implémenter une couche domaine pure capable de calculer, pour un acteur donné et un nœud donné, l'un des quatre états V1
suivants :

| État        | Signification                                              |
|-------------|------------------------------------------------------------|
| `purchased` | Le nœud est déjà acheté par l'acteur.                      |
| `available` | Le nœud peut être acheté maintenant.                       |
| `locked`    | Le nœud est valide mais ses prérequis ne sont pas remplis. |
| `invalid`   | Le nœud ou ses références sont incomplets ou incohérents.  |

Cette US produit un résultat exploitable par les couches achat (US6) et UI (US15-US18), sans dépendre du canvas, d'une
Application Foundry, ni d'un embedded Item `talent` comme source de vérité.

---

## 2. Périmètre

### Inclus dans cette US

- Création d'un module domaine pur `module/libs/talent-node-state.mjs`
- Calcul de l'état `purchased` depuis `actor.system.progression.talentPurchases`
- Calcul de l'état `available` quand toutes les conditions métier sont remplies
- Calcul de l'état `locked` quand le nœud est valide mais pas encore accessible
- Calcul de l'état `invalid` quand l'arbre, le nœud ou ses références sont incohérents ou incomplets
- Retour d'une raison machine-readable exploitable par l'UI (`reasonCode` + `details`)
- Convention racine : `row === 1` (première rangée de l'arbre)
- Calcul d'accessibilité par connexions entrantes depuis l'arbre
- Tests Vitest couvrant les quatre états, les raisons de blocage et les cas dégradés
- Vérification de non-régression par isolation stricte vis-à-vis des anciennes logiques Crucible

### Exclu de cette US

- Persistance d'un achat de nœud sur l'acteur → US6
- Dépense d'XP et mise à jour de `experience.spent` → US6
- Consolidation des talents possédés (vue consolidée) → US7/US8
- Refonte UI de la fiche ou vue graphique d'arbre → US12+/US15+
- Internationalisation des messages de blocage (l'UI traduira les `reasonCode`)
- Migration ou suppression des anciennes logiques héritées de Crucible → US21
- Ajout d'un champ `root` dans le schéma des nœuds
- Ajout de nouveaux champs de data model sur l'acteur ou sur `specialization-tree`

---

## 3. Constat sur l'existant

### Les prérequis domaine de US5 sont désormais présents

Les US précédentes ont posé les briques nécessaires :

| US         | Livraison                                                         | Utile pour US5                            |
|------------|-------------------------------------------------------------------|-------------------------------------------|
| US1 (#185) | Type `specialization-tree` avec `nodes[]`, `connections[]`        | Structure de l'arbre référentiel          |
| US2 (#186) | Champs `row`, `column`, `cost` sur les nœuds                      | Convention racine `row === 1`, coût XP    |
| US3 (#187) | `actor.system.progression.talentPurchases[]`                      | Source de vérité `purchased`              |
| US4 (#188) | Résolution spécialisation → arbre via `resolveSpecializationTree` | Arbres résolus pour chaque spécialisation |

### Aucun calcul d'état V1 n'existe encore

Aucun module ne calcule aujourd'hui les quatre états V1 à partir de la nouvelle source de vérité. Les tests existants
couvrent le schéma, la structure des achats et la résolution d'arbre, mais pas l'évaluation métier d'un nœud.

### Les anciennes logiques talents restent incompatibles

Le code legacy (`module/config/talent-tree.mjs`, `module/documents/actor-mixins/talents.mjs`), issue du système
Crucible, repose encore sur :

- la possession d'embedded Items `talent` ;
- des coûts hardcodés ou dérivés d'anciennes règles ;
- un arbre global Crucible ;
- une logique d'accessibilité non alignée sur `talentPurchases`.

Ce code peut inspirer ponctuellement le calcul d'adjacence par connexions, l'interaction avec le Canvas, mais ne doit *
*absolument** pas être reconduit comme base
fonctionnelle.

### La règle racine n'est pas portée par le schéma

Le modèle de nœud ne contient pas de booléen `root`. La convention retenue est : un nœud est racine si `row === 1`. On
commence à numéroter les row d'un tree à partir de 1.

---

## 4. Décisions d'architecture

### 4.1. Module domaine pur dédié

**Décision** : Créer `module/libs/talent-node-state.mjs` comme nouveau module domaine.

Options envisagées :

- `module/lib/talents/` — réservé aux logiques legacy
- extension de `module/lib/talent-node/talent-tree-resolver.mjs` — mélangerait résolution et état

**Décision retenue** : module dédié dans `module/libs/`.

Justification :

- Cohérent avec `module/lib/talent-node/talent-tree-resolver.mjs`, déjà structuré comme logique réutilisable
- Évite de gonfler le resolver avec une responsabilité métier distincte
- Garde une API pure, testable sans Foundry
- Permet à US6 et aux vues graphiques de consommer la même API

### 4.2. Source de vérité `purchased` : `actor.system.progression.talentPurchases`

**Décision** : Déduire `purchased` exclusivement depuis la structure persistée sur l'acteur.

Justification :

- Conforme au cadrage (`01-modele-domaine-talents.md`, `02-regles-achat-progression.md`)
- Cohérent avec US3
- Évite de prolonger les hypothèses legacy basées sur les embedded Items `talent`
- Prépare proprement la réconciliation des vues consolidée et graphique

### 4.3. Convention racine : `row === 1`

**Décision** : Considérer qu'un nœud est racine si `node.row === 1`.

Justification :

- Choix validé pendant la préparation de ce plan
- Simple à comprendre et à tester
- Compatible avec la structure actuelle des nœuds, sans ajout de champ `root`
- Applique la règle `02-regles-achat-progression.md` §5.1 : "La convention retenue doit être stable et documentée"

Point d'attention : un nœud sans `row` valide est classé `invalid`.

### 4.4. Priorité de `invalid` sur les autres états

**Décision** : Dès qu'une incohérence référentielle est détectée, l'état retourné est `invalid`, jamais `locked` ni
`available`.

Cas minimaux `invalid` :

- spécialisation non possédée
- arbre introuvable ou `unresolved`
- arbre `incomplete` pour un calcul d'achat fiable
- nœud introuvable dans l'arbre
- `nodeId`, `talentId`, `row` ou `cost` absents ou incohérents
- connexion entrante pointant vers un `from` introuvable

Justification :

- Conforme à l'issue : un nœud invalide n'est jamais achetable
- Évite de masquer une donnée cassée derrière un simple état `locked`
- Fournit un meilleur diagnostic aux futures UI et à l'import OggDude

### 4.5. Raisons de blocage structurées (machine-readable)

**Décision** : Retourner une structure `{ state, reasonCode, details }`.

Codes indicatifs (non définitifs) :

- `already-purchased`
- `specialization-not-owned`
- `tree-not-found`
- `tree-incomplete`
- `node-not-found`
- `node-invalid`
- `node-locked`
- `not-enough-xp`

Justification :

- L'issue demande des raisons exploitables par l'UI
- Une couche domaine pure ne doit pas appeler `game.i18n`
- Les couches UI futures mapperont ces codes vers des messages traduits
- Respecte l'objectif "testable sans Foundry" et ADR-0012 (assertions lisibles)

### 4.6. Calcul d'accessibilité basé uniquement sur les connexions de l'arbre

**Décision** : Le calcul `available`/`locked` dépend uniquement de :

- `row === 1` (racine)
- OU présence d'au moins une connexion entrante (`from → to`) où le nœud source est `purchased`

Justification :

- Conforme à `02-regles-achat-progression.md` §5.2
- Aucune dépendance à la position visuelle, au canvas, ou aux classes legacy
- Garde la règle d'achat indépendante de l'UI

### 4.7. Aucun branchement dans le legacy

**Décision** : US5 ne modifie ni n'appelle `module/config/talent-tree.mjs`, `module/documents/actor-mixins/talents.mjs`,
ni les sheets existantes.

Justification :

- L'issue demande le calcul domaine, pas l'intégration dans l'ancien flux
- Réduit fortement le risque de régression
- Le branchement fonctionnel relèvera de US6 (achat) et US15-US18 (vue graphique)

---

## 5. Plan de travail détaillé

### Étape 1 — Définir le contrat d'entrée/sortie

**Quoi** : Formaliser l'API publique du module avec paramètres et type de retour.

Fonctions attendues (noms indicatifs) :

```
getNodeState(actor, specializationId, tree, nodeId) → { state, reasonCode, details }
getTreeNodesStates(actor, specializationId, tree) → Map<nodeId, { state, reasonCode, details }>
```

Entrées :

- `actor` : l'acteur character (lecture de `talentPurchases`, `progression.experience.available`)
- `specializationId` : identifiant métier de la spécialisation
- `tree` : l'item `specialization-tree` résolu (ou `null` si non résolu)
- `nodeId` : identifiant du nœud dans l'arbre

Sortie :

- `state` : `purchased` | `available` | `locked` | `invalid`
- `reasonCode` : chaîne machine-readable
- `details` : objet optionnel (identifiants, valeurs XP, etc.)

**Fichiers** : `module/libs/talent-node-state.mjs` (création)

**Risques** :

- API trop couplée à Foundry (passer l'acteur complet plutôt que les seules données utiles)
- Oublier un paramètre nécessaire pour US6

### Étape 2 — Implémenter les garde-fous de validité référentielle

**Quoi** : Centraliser toutes les validations qui mènent à `invalid`.

À couvrir :

- spécialisation absente de l'acteur
- arbre `null`, `unresolved` ou `incomplete`
- nœud introuvable dans `tree.system.nodes`
- nœud sans `nodeId`, `talentId`, `row` ou `cost`
- connexion entrante pointant vers un `from` inexistant

**Fichiers** : `module/libs/talent-node-state.mjs` (création)

**Risques** :

- Classer en `locked` au lieu de `invalid` si l'ordre des vérifications n'est pas contrôlé
- Répliquer partiellement la logique du resolver déjà dans `talent-tree-resolver.mjs`
- Être trop strict sur des données OggDude partiellement importées

### Étape 3 — Implémenter le calcul `purchased`

**Quoi** : Déterminer si le nœud est déjà acheté.

Algorithme :

```
rechercher dans actor.system.progression.talentPurchases
une entrée où treeId === tree.id
  ET nodeId === node.nodeId
  ET talentId === node.talentId
  ET specializationId === specializationId
```

Si un achat correspond, retourner `{ state: 'purchased', reasonCode: 'already-purchased' }`.

**Fichiers** : `module/libs/talent-node-state.mjs` (création)

**Risques** :

- Matcher uniquement sur `nodeId` et autoriser des collisions inter-arbres
- Dépendre accidentellement des embedded Items `talent` au lieu des achats persistés
- Ne pas gérer les acteurs sans `talentPurchases`

### Étape 4 — Implémenter le calcul `available` / `locked`

**Quoi** : Évaluer l'accessibilité métier pour un nœud valide non acheté.

Règles :

1. Si `node.row === 1` → accessible (racine)
2. Sinon, parcourir `tree.system.connections` : si une connexion a `to === node.nodeId` et que le nœud `from` est
   `purchased` → accessible
3. Si accessible, vérifier `actor.system.progression.experience.available >= node.cost` → `available`, sinon `locked`
4. Si non accessible → `locked` avec `reasonCode: 'node-locked'`

**Fichiers** : `module/libs/talent-node-state.mjs` (création)

**Risques** :

- Confusion entre absence de connexion valide et arbre corrompu (déjà traité étape 2)
- Mauvaise lecture du sens `from → to`
- Réutilisation implicite de `row` comme donnée visuelle au lieu de métier

### Étape 5 — Structurer les raisons exploitables par l'UI

**Quoi** : Associer à chaque état bloquant un `reasonCode` et des `details` minimaux.

Exemples de `details` :

- `{ requiredXp: 10, availableXp: 5 }` pour `not-enough-xp`
- `{ missingConnectionFrom: 'r1c1' }` pour `node-locked`
- `{ treeState: 'incomplete' }` pour `tree-incomplete`

**Fichiers** : `module/libs/talent-node-state.mjs` (création)

**Risques** :

- Retourner des messages déjà localisés → tests fragiles, couplage i18n
- Fournir trop peu de contexte pour les futures UI
- Référencer des identifiants métier que l'UI ne pourra pas résoudre en libellé

### Étape 6 — Écrire la suite de tests Vitest

**Quoi** : Créer `tests/lib/talent-node/talent-node-state.test.mjs` avec des assertions ciblées conformes à ADR-0012.

Cas minimaux à couvrir :

- `purchased` quand l'entrée `talentPurchases` correspond
- `available` pour un nœud racine (`row === 1`) avec XP suffisant
- `available` pour un nœud déverrouillé par connexion depuis un nœud acheté
- `locked` pour nœud non racine sans connexion achetée
- `locked` pour nœud accessible mais XP insuffisant (`reasonCode: 'not-enough-xp'`)
- `invalid` pour arbre introuvable
- `invalid` pour arbre incomplet
- `invalid` pour nœud absent
- `invalid` pour nœud sans `row` ou sans `cost`
- `invalid` pour spécialisation non possédée
- robustesse sur acteur sans `talentPurchases` (tableau vide ou absent)

**Fichiers** : `tests/lib/talent-node/talent-node-state.test.mjs` (création)

**Risques** :

- Tests trop couplés à des objets complets → diagnostics illisibles
- Fixtures trop légères qui masquent des cas incohérents
- Assertions profondes (`toEqual` sur tout l'objet) au lieu de vérifications ciblées (état, code raison)

### Étape 7 — Vérifier l'isolation vis-à-vis du legacy

**Quoi** : S'assurer que US5 n'introduit aucun import, appel ou dépendance vers :

- `module/config/talent-tree.mjs`
- `module/documents/actor-mixins/talents.mjs`
- `module/applications/sheets/character-sheet.mjs`
- les templates existants

Cette vérification répond au critère "aucune régression sur les anciennes logiques d'état de nœud".

**Fichiers** : Aucun fichier supplémentaire à modifier.

**Risques** :

- Import indirect via le resolver (vérifier que `talent-node-state.mjs` n'importe que le logger)
- Régression comportementale dans des écrans encore basés sur le legacy

---

## 6. Fichiers modifiés

| Fichier                                  | Action   | Description du changement                                                                              |
|------------------------------------------|----------|--------------------------------------------------------------------------------------------------------|
| `module/libs/talent-node-state.mjs`      | Création | Module domaine pur pour calculer l'état d'un nœud et retourner un résultat structuré                   |
| `tests/lib/talent-node/talent-node-state.test.mjs` | Création | Tests Vitest couvrant les quatre états, les raisons de blocage, les cas dégradés et l'isolation legacy |

---

## 7. Risques

| Risque                                        | Impact                                                              | Mitigation                                                                                       |
|-----------------------------------------------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Convention racine `row === 1` trop implicite  | Des nœuds mal renseignés deviennent faussement bloqués ou invalides | Documenter la convention dans le module ; classer les cas incomplets en `invalid` ; tests ciblés |
| Confusion entre `locked` et `invalid`         | UI future trompeuse, diagnostic métier peu fiable                   | Donner priorité stricte à `invalid` ; couvrir chaque frontière par des tests                     |
| Matching d'achat insuffisant                  | Faux `purchased` ou faux `available`                                | Baser le calcul sur les identifiants persistés, pas sur le nom ni les embedded Items             |
| Connexions cassées ou orientées à l'envers    | Déverrouillage erroné de nœuds                                      | Tester explicitement le sens `from → to` ; classer les références cassées en `invalid`           |
| Dépendance implicite à Foundry                | Tests plus lourds, logique moins réutilisable                       | Garder le module pur, pas d'appel à `game.i18n`, pas de dépendance UI                            |
| Réutilisation accidentelle du legacy Crucible | Régression ou dette technique accrue                                | N'ajouter aucun branchement dans les anciens modules pendant US5                                 |
| Oubli de l'état `incomplete` du resolver      | Des arbres partiellement importés seraient marqués `available`      | Vérifier l'état retourné par `getSpecializationTreeResolutionState` avant d'autoriser l'accès    |

---

## 8. Proposition d'ordre de commit

| Ordre | Message                                                               | Fichiers                                 |
|-------|-----------------------------------------------------------------------|------------------------------------------|
| 1     | `feat(domain): add pure talent node state evaluator`                  | `module/libs/talent-node-state.mjs`      |
| 2     | `test(domain): cover talent node states, reasons, and degraded cases` | `tests/lib/talent-node/talent-node-state.test.mjs` |

Si un découpage plus fin est souhaité :

| Ordre | Message                                                                         | Fichiers                                 |
|-------|---------------------------------------------------------------------------------|------------------------------------------|
| 1     | `feat(domain): add node validity guards and purchased state`                    | `module/libs/talent-node-state.mjs`      |
| 2     | `feat(domain): add available/locked computation with XP check`                  | `module/libs/talent-node-state.mjs`      |
| 3     | `test(domain): cover all node states and blocking reasons`                      | `tests/lib/talent-node/talent-node-state.test.mjs` |
| 4     | `test(domain): add degraded cases (incomplete trees, broken refs, empty actor)` | `tests/lib/talent-node/talent-node-state.test.mjs` |

---

## 9. Dépendances avec les autres US

### Dépend de

- **US3 (#187)** — `actor.system.progression.talentPurchases` doit exister comme source de vérité `purchased`
- **US4 (#188)** — `resolveSpecializationTree()` doit pouvoir retourner un arbre résolu

### Débloque directement

- **US6** — Autoriser ou refuser l'achat d'un nœud (`purchaseTalentNode`)
- **US15 / US16 / US18** — Afficher et exploiter les états dans la vue graphique d'arbre
- **US19** — Synchroniser les états entre achat, arbre et vue consolidée
- **US22** — Couvrir les règles critiques de progression par des tests

### Doit rester indépendante de

- **US12+** — Côté onglet Talents (vue consolidée des talents possédés)
- **US21** — Neutralisation complète des anciennes logiques Crucible

# Plan d'implémentation — US4 : Résoudre spécialisation possédée → arbre

**Issue** : [#188 — US4: Résoudre spécialisation possédée → arbre](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/188)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`,
`documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`  
**Module(s) impacté(s)** : `module/lib/talent-node/talent-tree-resolver.mjs` (création),
`module/models/character.mjs` (modification),
`module/applications/sheets/character-sheet.mjs` (modification),
`tests/lib/talent-node/talent-tree-resolver.test.mjs` (création),
`tests/models/character-specializations.test.mjs` (création)

---

## 1. Objectif

Permettre de relier chaque spécialisation possédée par l'acteur à son arbre de spécialisation référentiel (`specialization-tree`). Cette résolution est le pont entre les spécialisations persistées sur l'acteur et les arbres stockés dans le monde/compendium, nécessaire avant toute logique d'achat (US6), de calcul d'état (US5) ou de consolidation (US7/US12).

Sans cette US, `#prepareSpecializations()` et l'affichage de la fiche ne considèrent que la première spécialisation, et `talentPurchases.treeId` ne peut pas être renseigné.

---

## 2. Périmètre

### Inclus dans cette US

- Enrichissement du schéma `system.details.specializations` dans `character.mjs` avec les champs `specializationId` et `treeUuid`
- Création de `module/lib/talent-node/talent-tree-resolver.mjs` avec :
  - Résolution primaire par `treeUuid` (DocumentUUID)
  - Fallback contrôlé par `specializationId` vers les items `specialization-tree` du monde
  - États de résolution : `available` / `unresolved` / `incomplete`
  - API réutilisable par US5, US6, US7, US12, US15
- Correction de `#prepareSpecializations()` : itérer toutes les spécialisations possédées, cumuler les `freeSkillRank`
- Correction de l'affichage fiche dans `module/applications/sheets/character-sheet.mjs` : remplacer la logique mono-spé par une gestion multi-spé
- Définition du comportement en cas de donnée incomplète : spécialisation visible mais arbre marqué indisponible, achat interdit, warning technique
- Tests Vitest couvrant la résolution, le fallback, les cas dégradés, la multi-spé et la non-régression mono-spé

### Exclu de cette US

- Logique d'achat de nœud → US6
- Calcul des états `purchased` / `available` / `locked` / `invalid` → US5
- Vue consolidée des talents possédés → US7/US12
- Population persistante des `treeUuid` depuis l'import OggDude → US10
- Interface UI de gestion des correspondances spécialisation → arbre
- Vue graphique des arbres → US15/US16
- Migration de données existantes (les nouveaux champs sont optionnels au départ)

---

## 3. Constat sur l'existant

### Le modèle acteur n'a pas de clé stable pour les spécialisations

Dans `module/models/character.mjs`, chaque entrée de `system.details.specializations` ne porte que :
- `name` : nom affiché
- `img` : image
- `description`, `specializationSkills`, `freeSkillRank` (hérités de `SwerpgSpecialization`)

Aucun identifiant stable, aucune référence vers l'arbre.

### `#prepareSpecializations()` ne considère que la première spécialisation

```js
#prepareSpecializations() {
  const specialization = Array.from(this.details.specializations)[0]
  this.progression.freeSkillRanks.specialization.gained = specialization?.freeSkillRank || 0
}
```

Seule la première spécialisation est utilisée. Les `freeSkillRank` des spécialisations suivantes sont ignorés.

### L'affichage fiche ne montre que la première spécialisation

```js
specializationName: Array.from(a.system.details.specializations)[0]?.name || game.i18n.localize('SPECIALIZATION.SHEET.CHOOSE'),
```

Le template de la fiche ne reçoit qu'un seul nom de spécialisation.

### Aucune infrastructure de résolution n'existe

- Aucun code ne lie les spécialisations de l'acteur aux items `specialization-tree`
- Aucune occurrence de `treeUuid` dans le codebase
- Le champ `talentPurchases.treeId` est déclaré dans le schéma mais jamais écrit (US3)

### Les arbres `specialization-tree` peuvent exister dans le monde

Le type `specialization-tree` est enregistré. Si des arbres ont été importés ou créés manuellement, ils existent dans le monde ou un compendium, mais aucune logique ne les relie aux acteurs.

---

## 4. Décisions d'architecture

### 4.1. Le lien spécialisation → arbre est une donnée métier portée dans `system`

**Décision** : stocker les références stables de résolution directement dans `actor.system.details.specializations[]`, et non dans `actor.flags.swerpg.*`.

Chaque spécialisation possédée par l'acteur doit porter au minimum :
- `specializationId` : identifiant métier stable de la spécialisation
- `treeUuid` : UUID du `specialization-tree` référentiel, optionnel dans un premier temps pour compatibilité

Justification :
- Ce lien n'est pas une donnée secondaire ni un cache technique ; il structure directement le futur flux métier des talents.
- Il servira aux US suivantes pour résoudre l'arbre, acheter un nœud, consolider les talents et afficher correctement les sources.
- Il évite une structure parallèle hors du modèle principal.
- Il rend le domaine plus lisible : les données affichées (`name`, `img`) peuvent évoluer sans casser les liens métier.

### 4.2. `name` reste une donnée d'affichage, `specializationId` devient la clé stable

**Décision** : ne plus faire reposer la résolution sur `name`.

Rôle des champs :
- `name` : libellé affiché dans l'UI
- `specializationId` : identifiant stable de la spécialisation
- `treeUuid` : lien fort vers l'arbre référentiel

Justification :
- Le nom affiché peut changer (traduction, correction, harmonisation éditoriale).
- Un identifiant métier stable est mieux adapté comme clé de jointure.
- Cela réduit le risque de casser les liens lors d'une évolution UX ou contenu.

### 4.3. Résolution primaire par `treeUuid`, fallback temporaire contrôlé

**Décision** : la résolution principale s'appuie sur `treeUuid`. En l'absence de `treeUuid`, un fallback temporaire est autorisé via `specializationId` vers les items `specialization-tree` du monde.

**Ordre de résolution** :
1. Lire `treeUuid` sur la spécialisation possédée.
2. Tenter de résoudre l'UUID via `fromUuidSync`.
3. Si absent ou introuvable, fallback contrôlé : chercher un item `specialization-tree` dont `system.specializationId` correspond.
4. Si aucun arbre n'est trouvé, la spécialisation reste visible mais l'arbre est marqué `unresolved`.

Justification :
- `treeUuid` fournit une résolution non ambiguë.
- Le fallback permet la compatibilité avec les acteurs ou référentiels pas encore enrichis.
- Cela prépare une migration progressive vers une résolution 100 % stable.

### 4.4. Le schéma des spécialisations possédées doit être enrichi dans `character.mjs`

**Décision** : étendre la structure `system.details.specializations` du data model `character` pour inclure `specializationId` et `treeUuid`.

Justification :
- Les spécialisations possédées sont déjà portées dans le modèle acteur.
- C'est le bon endroit pour enrichir la donnée persistée utile au jeu.
- Cela évite d'introduire une convention cachée dans des flags.
- Cela aligne le modèle acteur avec le besoin métier réel de la V1 Talents.

### 4.5. Correction du bug mono-spécialisation dans la même US

**Décision** : inclure dans US4 la suppression des hypothèses "première spécialisation uniquement".

Points concernés :
- `#prepareSpecializations()` dans `module/models/character.mjs`
- Préparation de contexte dans `module/applications/sheets/character-sheet.mjs`

Justification :
- L'issue exige explicitement que toutes les spécialisations possédées soient prises en compte.
- Ces deux endroits sont déjà en défaut aujourd'hui.
- Les laisser en place rendrait la résolution multi-spé incohérente.

### 4.6. Pas de persistance de vue dérivée sur l'acteur

**Décision** : ne pas persister sur l'acteur une structure dérivée du type "arbres résolus" ou "état UI des arbres".

Justification :
- La source de vérité doit rester la spécialisation possédée enrichie (`specializationId`, `treeUuid`).
- Les états de résolution, d'indisponibilité ou de complétude sont des données calculées.
- Cela évite de multiplier les sources de vérité.

---

## 5. Plan de travail détaillé

### Étape 1 — Enrichir le schéma `character` des spécialisations possédées

**Quoi** : modifier `module/models/character.mjs` pour enrichir chaque entrée de `system.details.specializations` avec `specializationId` et `treeUuid`.

**Fichiers** :
- `module/models/character.mjs` (modification)

**Contraintes recommandées** :
- `specializationId` : `StringField`, stable, requis à terme mais optionnel dans un premier temps pour rétrocompatibilité
- `treeUuid` : `DocumentUUIDField` (ou `StringField` documenté UUID-compatible), optionnel pour compatibilité

**Risques spécifiques** :
- Casser des acteurs existants si les nouveaux champs sont rendus obligatoires immédiatement.
- Choisir un type trop strict pour `treeUuid` alors que tous les acteurs ne seront pas encore enrichis.

### Étape 2 — Créer le resolver métier dédié

**Quoi** : créer `module/lib/talent-node/talent-tree-resolver.mjs` pour centraliser la logique de résolution spécialisation → arbre.

Fonctions attendues :

```js
/**
 * Résout une spécialisation possédée vers son arbre.
 * @param {object} specializationData - Entrée de system.details.specializations
 * @returns {{ tree: SwerpgItem|null, state: 'available'|'unresolved'|'incomplete' }}
 */
export function resolveSpecializationTree(specializationData) { /* ... */ }

/**
 * Résout toutes les spécialisations possédées par un acteur.
 * @param {SwerpgActor} actor - L'acteur character
 * @returns {Map<string, {tree: SwerpgItem|null, state: string}>}
 */
export function resolveActorSpecializationTrees(actor) { /* ... */ }

/**
 * Détermine l'état de complétude d'un arbre.
 * @param {SwerpgItem} tree - L'item specialization-tree
 * @returns {'available'|'incomplete'}
 */
export function getSpecializationTreeResolutionState(tree) { /* ... */ }
```

Logique de résolution :
1. Lire `specializationData.treeUuid`
2. Si UUID présent : `fromUuidSync(uuid)` → si valide, retourner l'item avec état `available` ou `incomplete`
3. Si absent ou invalide : fallback → chercher dans `game.items` un `specialization-tree` dont `system.specializationId === specializationData.specializationId`
4. Si toujours rien trouvé : retourner `{ tree: null, state: 'unresolved' }`

Gestion d'erreur :
- `fromUuidSync` encapsulé dans un try/catch → logger.warn en cas d'UUID invalide
- Si `game.ready === false`, retourner `unresolved` sans lever d'erreur

**Fichiers** :
- `module/lib/talent-node/talent-tree-resolver.mjs` (création)

**Risques spécifiques** :
- Duplication de logique si la résolution est réimplémentée ailleurs.
- Confusion entre arbre introuvable et arbre incomplet si le contrat de retour n'est pas clair.

### Étape 3 — Corriger `#prepareSpecializations()` pour supporter la multi-spé

**Quoi** : remplacer la logique fondée sur la première spécialisation par une itération sur l'ensemble des spécialisations possédées.

```js
#prepareSpecializations() {
  let totalFreeRanks = 0
  for (const spec of (this.details.specializations || [])) {
    totalFreeRanks += spec.freeSkillRank || 0
  }
  this.progression.freeSkillRanks.specialization.gained = totalFreeRanks
}
```

**Fichiers** :
- `module/models/character.mjs` (modification)

**Risques spécifiques** :
- Changement de comportement visible pour les acteurs multi-spé existants — c'est le comportement correct attendu.
- `this.details.specializations` peut être `undefined` ou `null` → itération sécurisée.

### Étape 4 — Corriger la préparation de contexte de la fiche personnage

**Quoi** : mettre à jour `module/applications/sheets/character-sheet.mjs` pour ne plus supposer qu'une seule spécialisation existe.

```js
// Remplacer specializationName unique par :
specializationNames: Array.from(a.system.details.specializations || []).map(s => s.name),
specializationName: Array.from(a.system.details.specializations)[0]?.name
  || game.i18n.localize('SPECIALIZATION.SHEET.CHOOSE'), // conservé pour compatibilité templates
specializationCount: Array.from(a.system.details.specializations || []).length,
```

**Fichiers** :
- `module/applications/sheets/character-sheet.mjs` (modification)
- `templates/sheets/actor/character.hbs` (modification potentielle, selon consommation actuelle)

**Risques spécifiques** :
- Casser l'affichage existant si le template attend encore une chaîne unique.
- Introduire une UI floue si le cas "arbre non résolu" n'est pas explicitement représenté.

### Étape 5 — Définir le comportement de résolution en cas de donnée incomplète

**Quoi** : formaliser le contrat métier des cas dégradés.

Règles attendues :
- `treeUuid` absent ou invalide → fallback par `specializationId` ; si toujours rien → `unresolved`
- Arbre trouvé mais sans nœuds, ou sans connexions → `incomplete`
- Spécialisation sans `specializationId` et sans `treeUuid` → `unresolved` avec warning technique
- Aucun achat autorisé si l'état n'est pas `available`

**Fichiers** :
- `module/lib/talent-node/talent-tree-resolver.mjs` (création — intégré dans la logique)
- Tests associés

**Risques spécifiques** :
- Laisser un fallback silencieux dangereux.
- Bloquer l'UI alors que seule la résolution d'arbre est manquante.

### Étape 6 — Couvrir la résolution par des tests Vitest

**Quoi** : ajouter des tests ciblés.

Tests du resolver (`tests/lib/talent-node/talent-tree-resolver.test.mjs`) :

| Test | Description | Vérification |
|------|-------------|-------------|
| `resolveSpecializationTree with valid treeUuid` | UUID valide, item trouvé | Retourne `{ tree, state: 'available' }` |
| `resolveSpecializationTree with invalid treeUuid` | UUID invalide, fallback par specializationId | Retourne l'item ou `{ null, 'unresolved' }` |
| `resolveSpecializationTree with no identifiers` | Ni treeUuid, ni specializationId | `{ null, 'unresolved' }` |
| `resolveSpecializationTree with incomplete tree` | Arbre sans nœuds | `{ tree, state: 'incomplete' }` |
| `resolveActorSpecializationTrees with 3 specs` | 3 specs, 2 matchent, 1 sans arbre | Map avec états mélangés |
| `getSpecializationTreeResolutionState with full tree` | Nodes et connections valides | `'available'` |
| `getSpecializationTreeResolutionState with empty tree` | Pas de nodes | `'incomplete'` |

Tests de `#prepareSpecializations()` (`tests/models/character-specializations.test.mjs`) :

| Test | Description | Vérification |
|------|-------------|-------------|
| Single specialization | 1 spec avec freeSkillRank=4 | gained = 4 |
| Multiple specializations | 2 specs avec freeSkillRank=4 et 5 | gained = 9 |
| No specializations | specs vide | gained = 0 |
| Null/undefined specializations | `this.details.specializations` absent | gained = 0, pas d'erreur |

**Fichiers** :
- `tests/lib/talent-node/talent-tree-resolver.test.mjs` (création)
- `tests/models/character-specializations.test.mjs` (création)
- `tests/utils/actors/actor.mjs` (modification éventuelle si fixtures à enrichir)

**Risques spécifiques** :
- Mocks incomplets autour des UUID Foundry (`fromUuidSync`).
- Tests trop couplés au rendu UI au lieu du contrat métier de résolution.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---------|--------|---------------------------|
| `module/models/character.mjs` | Modification | Enrichir la structure `system.details.specializations` avec `specializationId` (`StringField`) et `treeUuid` (`DocumentUUIDField` ou `StringField`). Corriger `#prepareSpecializations()` pour itérer toutes les spécialisations et cumuler les `freeSkillRank`. |
| `module/lib/talent-node/talent-tree-resolver.mjs` | Création | Module de résolution spécialisation → arbre : `resolveSpecializationTree()`, `resolveActorSpecializationTrees()`, `getSpecializationTreeResolutionState()`. Résolution primaire par `treeUuid`, fallback par `specializationId`. Gestion des cas dégradés (`unresolved`, `incomplete`). |
| `module/applications/sheets/character-sheet.mjs` | Modification | Supprimer l'hypothèse mono-spécialisation. Exposer `specializationNames` (Array), `specializationCount`, et conserver `specializationName` pour compatibilité template. |
| `templates/sheets/actor/character.hbs` | Modification potentielle | Adapter l'affichage pour supporter plusieurs spécialisations (liste, badge "+N", état arbre indisponible). |
| `tests/lib/talent-node/talent-tree-resolver.test.mjs` | Création | Tests unitaires du resolver : résolution par UUID, fallback, cas dégradés, arbre incomplet. |
| `tests/models/character-specializations.test.mjs` | Création | Tests du schéma enrichi et de `#prepareSpecializations()` : mono-spé, multi-spé, cas vide, null. |
| `tests/utils/actors/actor.mjs` | Modification éventuelle | Enrichir les fixtures acteur avec `specializationId` et `treeUuid` si nécessaire pour la compatibilité des tests. |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Rétrocompatibilité du schéma** : les acteurs existants n'ont ni `specializationId` ni `treeUuid` | Erreurs de validation ou spécialisations partiellement inutilisables | Introduire les nouveaux champs comme optionnels (`required: false`). Utiliser un fallback contrôlé tant que toutes les données ne sont pas enrichies. |
| **UUID absent ou cassé** | Impossible de résoudre l'arbre malgré une spécialisation possédée | Résolution primaire par `treeUuid`, fallback par `specializationId`, journalisation via `logger.warn`, et état explicite `unresolved` côté resolver. |
| **Fallback trop permissif** | Résolution vers le mauvais arbre si `specializationId` n'est pas réellement stable ou unique | Limiter le fallback à une phase transitoire clairement documentée. `treeUuid` doit rester la seule source fiable à terme. |
| **Changement métier sur la multi-spé** | Les acteurs avec plusieurs spécialisations voient leurs rangs gratuits augmenter | Assumer explicitement qu'il s'agit d'une correction de bug. Documenter dans le plan et couvrir par des tests ciblés. |
| **Couplage fort entre affichage et ancienne structure** | La fiche personnage peut casser si elle attend encore une seule spécialisation textuelle | Conserver temporairement un champ de compatibilité `specializationName` tout en exposant la nouvelle structure multi-spé. |
| **Confusion entre donnée métier et donnée dérivée** | Risque d'ajouter ensuite des états de résolution persistés dans l'acteur | Garder comme source de vérité uniquement `specializationId` et `treeUuid`. Calculer dynamiquement les états `available`, `unresolved`, `incomplete`. |
| **Fixtures de test incomplètes** | Faux négatifs dans les tests existants autour des personnages | Centraliser l'enrichissement minimal dans les helpers de fixtures. Éviter de propager prématurément de la logique métier dans les tests non concernés. |
| **Choix du type technique pour `treeUuid`** | Schéma trop strict ou trop faible selon l'API Foundry utilisée | Trancher entre `DocumentUUIDField` et `StringField` documenté UUID-compatible lors de l'implémentation. Couvrir ce choix par des tests unitaires. |
| **`fromUuidSync` peut throw** | Blocage de la résolution, possible crash | Wrapper try/catch dans le resolver. `logger.warn` en cas d'échec, état `unresolved` retourné. |
| **`game.items` non disponible** | Retour `unresolved` pour tout le monde | Vérifier `game.ready` avant d'accéder à `game.items`. Si pas prêt, retourner `unresolved` et logger un debug. |

---

## 8. Proposition d'ordre de commit

1. **`feat(model): add specializationId and treeUuid to character specialization schema`**
   - `module/models/character.mjs` (modification)

2. **`feat(talent): create talent-tree-resolver utility`**
   - `module/lib/talent-node/talent-tree-resolver.mjs` (création)

3. **`fix(talent): iterate all specializations in prepareSpecializations`**
   - `module/models/character.mjs` (modification — correction de `#prepareSpecializations()`)

4. **`feat(ui): support multi-specialization display in character sheet`**
   - `module/applications/sheets/character-sheet.mjs` (modification)
   - `templates/sheets/actor/character.hbs` (modification, optionnelle)

5. **`test(talent): add resolver and prepareSpecializations tests`**
   - `tests/lib/talent-node/talent-tree-resolver.test.mjs` (création)
   - `tests/models/character-specializations.test.mjs` (création)
   - `tests/utils/actors/actor.mjs` (modification, si nécessaire)

---

## 9. Dépendances avec les autres US

- **Dépend de** : US1 (#185 — type `specialization-tree` existe), US2 (#186 — structure nœuds avec `row`, `column`, `cost`), US3 (#187 — `talentPurchases` déclaré dans la progression)
- **Est dépendante de** :
  - US5 (calcul d'état des nœuds) — aura besoin des arbres résolus
  - US6 (achat d'un nœud) — aura besoin de `resolveSpecializationTree()` pour déterminer le `treeId` de l'achat
  - US7/US8 (consolidation) — aura besoin de `resolveActorSpecializationTrees()`
  - US10 (import OggDude des arbres) — pourra enrichir les `treeUuid` des spécialisations
  - US12 (onglet Talents) — utilisera les arbres résolus pour l'affichage multi-spé
  - US15 (vue graphique) — utilisera les arbres résolus pour le rendu
- **Ordre conseillé** : US1 → US2 → US3 → **US4** → US5 → US6 → (Lot 3 et Lot 4 en parallèle)

# Plan d'implémentation — Afficher l'arbre par défaut avec nœuds positionnés et connexions (US16)

**Issue** : [#233 — Afficher l'arbre par défaut avec nœuds positionnés et connexions (US16)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/233)
**Parent** : [#200 — US16: Afficher arbres, nœuds et connexions dans la vue graphique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/200)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs` (modification), `templates/applications/specialization-tree-app.hbs` (modification si besoin), `tests/applications/specialization-tree-app.test.mjs` (modification)

---

## 1. Objectif

Faire en sorte que l'application graphique `SpecializationTreeApp` (livrée par US15) affiche effectivement un arbre de spécialisation : choix déterministe d'un arbre résolu, construction d'un view-model de rendu, placement des nœuds via `row`/`column`, dessin des connexions et des nœuds dans le viewport PIXI.

À l'issue de cette tranche, l'utilisateur voit un arbre complet avec ses nœuds (nom + coût XP) et ses connexions, en lecture seule. Pas encore de couleurs d'état, de raisons de blocage ni de sélection interactive.

---

## 2. Périmètre

### Inclus

- Sélection du dernier arbre résolu `available` comme arbre affiché par défaut
- Construction d'un view-model de rendu (nœuds normalisés + connexions prêtes au dessin)
- Définition des constantes de layout (taille de nœud, espacements, marges) à partir de `row` / `column`
- Dessin des connexions (lignes entre `from` et `to`) dans le viewport PIXI autonome
- Dessin des nœuds (rectangle + nom du talent + coût XP) dans le viewport PIXI
- Fallback : si aucun arbre `available`, la vue reste vide (inchangée depuis US15)
- Tests Vitest couvrant le choix de l'arbre, la construction du view-model, la présence des nœuds et connexions

### Exclu

- Couleurs / variantes visuelles des états `purchased`, `available`, `locked`, `invalid` → #234
- Mapping `reasonCode` → clés i18n et raisons compréhensibles → #235
- Tooltip ou panneau de détail de nœud → #235
- Sélection interactive de spécialisation courante → US17
- Pan / zoom / drag dans le viewport
- Achat de nœud → US18
- Persistance d'état UI dans `actor.system` ou `actor.flags`
- Nouvelles clés i18n pour états détaillés ou raisons (hors ce qui existe déjà)

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` existe et fournit :
  - La coque `ApplicationV2` avec Handlebars
  - `buildSpecializationTreeContext(actor)` qui expose les spécialisations, leur état de résolution et des booléens (`hasActor`, `hasSpecializations`, `hasResolvedTrees`, `showViewport`)
  - Un viewport PIXI autonome (création de `PIXI.Application`, attachement du canvas au DOM, redimensionnement)
  - **Mais** : le viewport ne dessine encore aucun arbre métier. La méthode `#syncViewport` monte PIXI mais n'ajoute aucun élément graphique.
- `module/lib/talent-node/talent-tree-resolver.mjs` : `resolveActorSpecializationTrees(actor)` retourne un `Map<key, { tree, state }>`. `getSpecializationTreeResolutionState(tree)` distingue `available` / `incomplete`.
- `module/lib/talent-node/talent-node-state.mjs` : `getTreeNodesStates(actor, specializationId, tree)` calcule les états de nœud. Non utilisé dans cette tranche (besoin UI état visuel → #234), mais déjà disponible.
- `module/models/specialization-tree.mjs` : schéma des nœuds (`nodeId`, `talentId`, `row`, `column`, `cost`) et connexions (`from`, `to`, `type`).
- `tests/applications/specialization-tree-app.test.mjs` : tests US15 existants (ouverture, cycle de vie PIXI, contexte vide), mais aucun test de rendu métier, de view-model, de choix d'arbre ou de dessin.
- Aucun mécanisme actuel ne distingue quel arbre est "courant" parmi plusieurs `available`. Le contexte expose `hasResolvedTrees` mais pas `currentTree`.

---

## 4. Décisions d'architecture

### 4.1. Arbre affiché par défaut

**Problème** : quel arbre afficher quand l'acteur possède plusieurs spécialisations résolues disponibles ?

**Options envisagées** :
- Implémenter un sélecteur interactif complet (relève de US17)
- Afficher le premier arbre `available`
- Afficher le dernier arbre `available`

**Décision retenue** : afficher le **dernier** arbre résolu `available` dans l'ordre des spécialisations possédées.

**Justification** :
- Respecte le découpage US16/US17 : pas de sélection interactive
- Le dernier arbre correspond à la spécialisation la plus récemment ajoutée, donc la plus probablement active
- Comportement déterministe et testable
- Pas de persistance d'état UI

### 4.2. Construction d'un view-model de rendu

**Problème** : le dessin PIXI ne doit pas contenir de logique métier (résolution, état). Il faut un modèle intermédiaire.

**Décision retenue** : enrichir le contexte de `SpecializationTreeApp` avec une propriété view-model dérivée (`currentTree`, `renderNodes`, `renderConnections`) calculée dans `_prepareContext`.

**Justification** :
- Garde le code PIXI consomateur uniquement
- Le view-model est testable unitairement sans canvas PIXI
- Cohérent avec ADR-0001 (ApplicationV2, préparation de contexte)
- Les nœuds restent normalisés : `{ nodeId, label, xpCost, row, column, talentName }`
- Les connexions : `{ from: { row, column }, to: { row, column }, type }`

### 4.3. Placement des nœuds via row/column

**Problème** : comment convertir les coordonnées logiques en positions graphiques ?

**Décision retenue** : utiliser des constantes de layout (NODE_WIDTH, NODE_HEIGHT, H_GAP, V_GAP, PADDING) et calculer `x = column * (NODE_WIDTH + H_GAP) + PADDING`, `y = row * (NODE_HEIGHT + V_GAP) + PADDING`.

**Justification** :
- Conforme au schéma `specialization-tree` (ADR existant)
- Placement déterministe, sans heuristique et sans couplage au canvas legacy
- La grille row/column évite les chevauchements et rend l'arbre lisible

### 4.4. Absence de couleurs d'état dans cette tranche

**Problème** : les états `purchased`/`available`/`locked`/`invalid` sont disponibles via `getTreeNodesStates()` mais le ticket `#233` ne couvre pas les variantes visuelles.

**Décision retenue** : les nœuds sont dessinés avec un style neutre unique (fond semi-transparent uniforme, texte blanc). Aucun appel à `getTreeNodesStates()` ni mapping état → couleur.

**Justification** :
- Respect strict du périmètre de `#233`
- La coloration sera ajoutée par `#234` sans refonte du dessin
- Le rendu neutre est immédiatement vérifiable (un arbre visible vs vide)

### 4.5. Tests sur le contrat, pas sur le rendu pixel-perfect

**Décision retenue** : tester le view-model (choix de l'arbre, nœuds présents, connexions présentes, coordonnées calculées) sans tester le dessin PIXI exact.

**Justification** :
- Conforme à ADR-0004 et ADR-0012
- Les tests restent stables même si la mise en forme PIXI change
- Le vrai contrat métier de cette tranche est la sélection et la structure de rendu

---

## 5. Plan de travail détaillé

### Étape 1 — Ajouter la sélection de l'arbre courant

**Quoi faire** : dans `buildSpecializationTreeContext`, après avoir construit les entrées de spécialisation, identifier le dernier arbre `available` et exposer `currentTreeId`, `currentTreeName`, `currentTreeData` dans le contexte.

**Règle** : parcourir les `specializations` dans l'ordre, retenir la dernière entrée avec `isAvailable === true`. Si aucune, `currentTreeId = null`.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risque** : le resolver `resolveActorSpecializationTrees` utilise une `Map` dont l'ordre n'est pas garanti. S'assurer que l'ordre des spécialisations dans `actor.system.details.specializations` est préservé (c'est un Array).

### Étape 2 — Construire le view-model de rendu

**Quoi faire** : enrichir le contexte avec `renderNodes` et `renderConnections` dérivés de l'arbre courant. Chaque nœud du view-model porte : `nodeId`, `talentName`, `xpCost`, `row`, `column`, `x`, `y` (coordonnées calculées par layout). Chaque connexion porte : `fromX`, `fromY`, `toX`, `toY`.

Si `currentTreeId` est null, `renderNodes` et `renderConnections` sont des tableaux vides. Si un talent référencé par `talentId` est introuvable, le `talentName` est mis à "Talent inconnu" via la clé i18n existante `SWERPG.TALENT.UNKNOWN`.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

### Étape 3 — Définir les constantes de layout graphique

**Quoi faire** : ajouter des constantes de layout (NODE_WIDTH, NODE_HEIGHT, H_GAP, V_GAP, PADDING) en haut du module. Implémenter `#layoutNodePosition(row, column)` qui retourne `{ x, y }`.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

### Étape 4 — Dessiner les connexions dans le viewport PIXI

**Quoi faire** : dans `#syncViewport` (ou une nouvelle méthode `#drawTree` appelée depuis `#syncViewport`), après avoir monté PIXI, itérer sur `renderConnections` et dessiner des lignes via `PIXI.Graphics`. Les connexions sont dessinées avant les nœuds pour un rendu propre.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

### Étape 5 — Dessiner les nœuds dans le viewport PIXI

**Quoi faire** : après les connexions, itérer sur `renderNodes` et dessiner chaque nœud : fond rectangulaire (couleur neutre), texte du nom du talent, texte du coût XP. Utiliser `PIXI.Graphics` pour le fond et `PIXI.Text` pour les libellés.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

### Étape 6 — Ajouter les tests de contrat

**Quoi faire** : enrichir `tests/applications/specialization-tree-app.test.mjs` pour couvrir :

- Choix du dernier arbre `available` comme arbre courant (vs premier, vs aucun)
- Contexte vide : `currentTreeId` est null quand aucune spécialisation ou aucune résolue
- `renderNodes` contient tous les nœuds de l'arbre courant avec leurs métadonnées
- `renderConnections` contient toutes les connexions avec les bonnes positions
- Fallback "Talent inconnu" quand un `talentId` ne résout pas un item
- Absence de dépendance au canvas de scène (vérifié indirectement via les tests PIXI existants)

**Fichiers** :
- `tests/applications/specialization-tree-app.test.mjs`

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajout des constantes de layout, de la sélection d'arbre courant, du view-model de rendu et du dessin PIXI des nœuds/connexions |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Ajout des cas de test couvrant le choix de l'arbre, le view-model, les nœuds et connexions |

Le template `.hbs` et les styles `.less` ne sont pas modifiés dans cette tranche : le viewport existe déjà, et le dessin PIXI ne nécessite pas de DOM supplémentaire. Les fichiers `lang/*.json` ne sont pas modifiés non plus (les seules clés utilisées existent déjà).

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Ordre des spécialisations non préservé dans la Map du resolver | Mauvais arbre affiché | Utiliser l'Array `specializations` directement pour la sélection, pas la Map |
| TalentId non résolu : nœud sans nom | Nœud illisible | Fallback i18n explicite "Talent inconnu" |
| Layout trop serré ou trop large : nœuds illisibles ou viewport scroll | Mauvaise expérience visuelle | Tester avec des arbres réels (Bodyguard, etc.) et ajuster les constantes |
| `buildSpecializationTreeContext` devient trop gros | Fonction difficile à maintenir | Extraire les sous-fonctions `#selectCurrentTree`, `#buildRenderNodes`, `#buildRenderConnections` |
| Les tests échouent car trop liés au view-model | Tests fragiles | Tester les identifiants, les longueurs et les valeurs métier, pas les coordonnées pixel exactes (conforme ADR-0012) |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): select last available resolved tree as current tree`
2. `feat(talent-tree): build render view-model with nodes and connections`
3. `feat(talent-tree): compute node layout from row/column constants`
4. `feat(talent-tree): draw connections as PIXI graphics`
5. `feat(talent-tree): draw specialization tree nodes with talent name and XP cost`
6. `test(talent-tree): cover current tree selection, render view-model and node metadata`

---

## 9. Dépendances avec les autres US

- Dépend de US15 (#199) : le viewport PIXI autonome et la coque ApplicationV2 sont la base technique du rendu
- Dépend de US4 (#188) / US5 (#189) : les données d'arbres et leur résolution sont nécessaires
- Prépare #234 (#234) en livrant les nœuds rendus avec leur structure, prêts à recevoir les couleurs d'état
- Prépare #235 (#235) en livrant les nœuds positionnés et leurs métadonnées, nécessaires à l'affichage du détail

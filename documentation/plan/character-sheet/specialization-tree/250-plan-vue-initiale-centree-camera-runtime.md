# Plan d'implémentation — #250 : Arbre de spécialisation, vue initiale centrée et caméra runtime du canvas

**Issue** : [#250 — Arbre de spécialisation — Vue initiale centrée et caméra runtime du canvas](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/250)  
**ADR principales** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`, potentiellement `tests/helpers/mock-foundry.mjs`

---

## 1. Objectif

Introduire dans `SpecializationTreeApp` une vraie caméra runtime de viewport, découplée des coordonnées métier des nœuds.

Le résultat attendu est :
- un état local `#viewport` qui porte `scale`, `x`, `y` ;
- une méthode dédiée `#applyViewportTransform()` qui applique cette transformation au conteneur PIXI ;
- une méthode `#centerTree()` qui calcule la vue initiale centrée à partir de la bounding box ;
- un premier rendu qui centre la vue quand `resetView` n'est pas explicitement désactivé.

Cette tranche prépare les futures interactions de zoom, pan et recentrage sans changer le modèle métier des arbres.

---

## 2. Périmètre

### Inclus

- Ajout d'un état privé runtime `#viewport = { scale: 1, x: 0, y: 0 }`.
- Ajout des bornes `#minZoom = 0.5`, `#maxZoom = 2`, `#zoomStep = 1.15`.
- Extraction d'une méthode `#applyViewportTransform()` qui applique la caméra au `#treeContainer`.
- Extraction d'une méthode `#centerTree()` fondée sur `computeTreeBoundingBox()`.
- Utilisation de `options.resetView` dans `_onRender()` / synchronisation viewport.
- Centrage automatique au premier rendu.
- Tests garantissant que la transformation visuelle ne modifie pas `renderNodes`.

### Exclu

- Zoom molette, drag-pan, boutons de recentrage.
- Persistance du viewport dans `actor.flags` ou `actor.system`.
- Refonte du layout des nœuds (`computeNodePosition`, dimensions, gaps).
- Changement des coordonnées métier des nœuds.
- Ajout de dépendance externe.

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` calcule déjà `renderNodes` avec des coordonnées de layout stables.
- `#drawTree()` recrée un `PIXI.Container`, dessine nœuds et connexions, puis centre visuellement l'arbre en écrivant directement `this.#treeContainer.x` et `this.#treeContainer.y`.
- Il n'existe actuellement aucun état de caméra persistant entre deux rendus.
- `open(actor, { resetView })` transmet bien l'option à `render()`, mais `_onRender()` n'en fait rien aujourd'hui.
- Les utilitaires `computeTreeBoundingBox()` et `computeCenteredOffset()` existent déjà et peuvent servir de base à `#centerTree()`.
- Les tests couvrent déjà bounding box, offset centré, ouverture avec `resetView: false`, montage PIXI et rendu métier.
- Les mocks PIXI de test sont aujourd'hui suffisants pour `x` / `y`, mais devront probablement être enrichis pour supporter `position.set()` et `scale.set()` si l'on suit l'acceptance criterion à la lettre.

---

## 4. Décisions d'architecture

### 4.1. Séparer coordonnées métier et caméra runtime

**Décision** : conserver `renderNodes[].x/.y` comme coordonnées métier de layout, et appliquer le déplacement/zoom uniquement sur le conteneur PIXI parent.

**Justification** :
- conforme à l'issue ;
- évite de mélanger layout métier et navigation UI ;
- prépare naturellement zoom/pan sans recalcul de nœuds.

### 4.2. Introduire un état viewport privé dans l'application

**Décision** : porter la caméra dans des champs privés de `SpecializationTreeApp`, pas dans le contexte ni dans les données de l'acteur.

**Justification** :
- état purement runtime ;
- pas de persistance ni migration ;
- cohérent avec une ApplicationV2 qui pilote son rendu local.

### 4.3. Centraliser l'application de transformation

**Décision** : toute écriture sur la position/scale du conteneur passe par `#applyViewportTransform()`.

**Justification** :
- un seul point de vérité ;
- évite les écritures dispersées dans `#drawTree()`, `#centerTree()`, futurs handlers de zoom/pan ;
- rend les tests plus simples.

### 4.4. Réutiliser `resetView` comme contrat de centrage initial

**Décision** : le premier `_onRender()` centre la vue quand `resetView !== false`, et préserve la caméra existante quand `resetView === false`.

**Justification** :
- cohérent avec le contrat déjà exposé par `open()`;
- aligné avec l'ancien pattern de `module/canvas/talent-tree.mjs` ;
- indispensable pour les futures interactions sans casser l'API existante.

### 4.5. Tester le contrat de transformation, pas le rendu pixel-perfect

**Décision** : les tests vérifient :
- l'état viewport calculé ;
- l'appel à `position.set()` / `scale.set()` ;
- la non-mutation de `renderNodes`.

**Justification** :
- conforme ADR-0004 et ADR-0012 ;
- évite des assertions fragiles sur le dessin PIXI.

---

## 5. Plan de travail détaillé

### Étape 1 — Introduire l'état caméra runtime

**À faire**
- Ajouter les champs privés `#viewport`, `#minZoom`, `#maxZoom`, `#zoomStep`.
- Initialiser le viewport à `{ scale: 1, x: 0, y: 0 }`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- multiplier les sources d'état si l'ancien centrage direct `treeContainer.x/y` reste en place.

---

### Étape 2 — Extraire `#applyViewportTransform()`

**À faire**
- Créer une méthode qui applique `this.#viewport.x`, `this.#viewport.y`, `this.#viewport.scale` au `#treeContainer`.
- Utiliser `position.set(x, y)` et `scale.set(scale)` si disponibles.
- Prévoir un fallback de test minimal seulement si les mocks l'exigent.

**Fichiers**
- `module/applications/specialization-tree-app.mjs`
- potentiellement `tests/helpers/mock-foundry.mjs`

**Risque**
- mocks PIXI trop faibles pour refléter le vrai contrat runtime.

---

### Étape 3 — Extraire `#centerTree(renderNodes)`

**À faire**
- Réutiliser `computeTreeBoundingBox()` puis calculer la caméra centrée pour le viewport courant.
- Mettre à jour `#viewport` au lieu d'écrire directement sur `#treeContainer`.
- Garder `scale` à `1` dans cette tranche.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- double centrage si `#drawTree()` continue à appliquer un offset direct.

---

### Étape 4 — Brancher le centrage dans le cycle de rendu

**À faire**
- Faire en sorte que `_onRender(context, options)` ou `#syncViewport(context, options)` exploite `options.resetView`.
- Au premier rendu ou quand `resetView !== false`, appeler `#centerTree()`.
- Quand `resetView === false`, conserver `#viewport` tel quel.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- un resize ou rerender pourrait recentrer la vue alors qu'une future interaction utilisateur voudra la conserver.

---

### Étape 5 — Nettoyer `#drawTree()` pour consommer la caméra

**À faire**
- Supprimer l'écriture directe sur `this.#treeContainer.x/y`.
- Dessiner les nœuds et connexions dans leurs coordonnées métier inchangées.
- Appeler `#applyViewportTransform()` après création du conteneur.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- inversion accidentelle entre coordonnées du conteneur et coordonnées des nœuds.

---

### Étape 6 — Étendre les tests

**À faire**
- Ajouter un test d'initialisation du viewport.
- Ajouter un test prouvant que `#drawTree()` applique bien `position.set()` et `scale.set()`.
- Ajouter un test prouvant que le premier rendu centre la vue.
- Ajouter un test prouvant que `open(actor, { resetView: false })` ne force pas le recentrage.
- Ajouter un test de non-régression : `renderNodes` avant/après centrage sont identiques.
- Enrichir les mocks PIXI si nécessaire avec `position.set` et `scale.set`.

**Fichiers**
- `tests/applications/specialization-tree-app.test.mjs`
- potentiellement `tests/helpers/mock-foundry.mjs`

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Introduire la caméra runtime, extraire `#applyViewportTransform()` et `#centerTree()`, brancher `resetView` |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Couvrir viewport initial, centrage initial, transformation appliquée et non-mutation des nœuds |
| `tests/helpers/mock-foundry.mjs` | potentielle modification | Renforcer les mocks PIXI si `position.set()` / `scale.set()` manquent |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Ancien centrage direct laissé dans `#drawTree()` | Décalage cumulé ou comportement incohérent | Centraliser toute transformation dans `#applyViewportTransform()` |
| `resetView` mal interprété | Vue recentrée alors qu'elle ne devrait pas | Tester explicitement `resetView: false` |
| Mocks PIXI insuffisants | Faux négatifs en tests | Aligner les mocks sur le vrai contrat `position.set` / `scale.set` |
| Mutation involontaire de `renderNodes` | Régression métier et futures interactions cassées | Ajouter un test ciblé sur l'immuabilité des coordonnées de nœud |
| Recentrage forcé sur chaque rerender | Futur pan/zoom inutilisable | Distinguer centrage initial et simple redraw |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): add runtime viewport state for specialization tree app`
2. `refactor(talent-tree): extract viewport transform and initial centering`
3. `test(talent-tree): cover centered initial view and non-mutating viewport transform`

---

## 9. Dépendances avec les autres US

- Aucun blocage identifié, conforme à l'issue.
- Cette tranche prépare directement :
  - zoom runtime ;
  - pan runtime ;
  - action de recentrage explicite ;
  - conservation de vue entre rerenders.

## 10. Validation prévue

- `pnpm vitest tests/applications/specialization-tree-app.test.mjs`

---
goal: Rendre le rendu Pixi de l'arbre de spécialisation inspectable via des containers nommés par node
version: 1.0
date_created: 2026-05-22
last_updated: 2026-05-22
status: 'Ready'
tags: refactor, specialization-tree, pixi, debug, devtools
---

# Introduction

![Status: Ready](https://img.shields.io/badge/status-Ready-blue)

Refactoring technique pur : remplacer les `PIXI.Graphics` mutualisés (un pour toutes les connexions, un pour tous les fonds de nodes) par une hiérarchie nommée de containers. Zéro changement visuel. Zéro changement fonctionnel. Gain : chaque node est inspectable en console via `window.swerpgDebug.specializationTree.nodeViews`.

## 1. Requirements & Constraints

- **REQ-001**: Chaque connexion est un `PIXI.Graphics` individuel avec un `label`/`name` lisible (`connection:nodeA->nodeB`)
- **REQ-002**: Chaque node est un `PIXI.Container` individuel avec un `label`/`name` lisible (`node:<id>:<talentName>`)
- **REQ-003**: Chaque enfant d'un node Container (background, title, cost-text, hit-area…) porte un label Pixi
- **REQ-004**: `window.swerpgDebug.specializationTree.nodeViews` expose un `Map<nodeId, { data, container, background, nameText, costText, badge, typeText, pictogramText, rankedText, hitArea }>`
- **REQ-005**: Tous les enfants du Container node utilisent des coordonnées locales (pas de `node.x + offset`)
- **REQ-006**: `#drawStatePictogramSprite` reçoit `parent` et `nodeLabel` en paramètres pour ajouter le sprite en coords locales
- **REQ-007**: `buildConnectionAnchors` expose `fromNodeId` / `toNodeId` dans les objets retournés
- **CON-001**: Zéro changement visuel — rendu pixel-identique avant/après
- **CON-002**: Zéro changement fonctionnel — hover, tooltip, achat, oubli, refresh inchangés
- **CON-003**: Tous les tests existants passent sans modification de leur logique
- **CON-004**: Module `node-ui-state.mjs` reste pur — aucune dépendance Pixi
- **PAT-001**: Helper `setPixiDebugLabel(displayObject, label)` défini une seule fois en tête de fichier

## 2. Implementation Steps

### Implementation Phase 1 — Helper et hiérarchie de layers

- GOAL-001: Poser le helper de nommage et restructurer `#drawTree` pour créer `connections-layer` et `nodes-layer`.

| Task     | Description                                                                                                                                                                | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Ajouter `setPixiDebugLabel(displayObject, label)` avant la classe dans `specialization-tree-app.mjs` — pose `displayObject.label = label` et `displayObject.name = label`  |           |      |
| TASK-002 | Nommer `#treeContainer` avec label `specialization-tree` à sa création dans `#drawTree`                                                                                    |           |      |
| TASK-003 | Créer `connectionsLayer = new PIXI.Container()` (label: `connections-layer`) et `nodesLayer = new PIXI.Container()` (label: `nodes-layer`), les ajouter à `#treeContainer` |           |      |
| TASK-004 | Ajouter `#debugNodeViews = new Map()` comme champ privé dans la classe                                                                                                     |           |      |
| TASK-005 | Ajouter `nodeViews: this.#debugNodeViews` dans l'objet exposé par `#exposePixiDevtools()`                                                                                  |           |      |

### Implementation Phase 2 — Une connexion = un Graphics nommé

- GOAL-002: Remplacer le Graphics unique de toutes les connexions par un Graphics individuel par connexion.

| Task     | Description                                                                                                                                                                        | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Dans `layout.mjs`, ajouter `fromNodeId` et `toNodeId` dans les objets retournés par `buildConnectionAnchors` (en plus des coords déjà présentes)                                   |           |      |
| TASK-007 | Dans `#drawTree`, remplacer la boucle de dessin des connexions par : `new PIXI.Graphics()` par connexion, label `connection:<fromNodeId>-><toNodeId>`, ajouté à `connectionsLayer` |           |      |
| TASK-008 | Vérifier que les styles de ligne (couleur, épaisseur, alpha) sont identiques à ceux appliqués avant le refactoring                                                                 |           |      |

### Implementation Phase 3 — Un node = un Container nommé

- GOAL-003: Remplacer la boucle de dessin des nodes pour créer un Container par node avec tous ses enfants en coords locales.

| Task     | Description                                                                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-009 | Dans `#drawTree`, créer `nodeContainer = new PIXI.Container()` (label: `node:<nodeId>:<talentName>`), positionné en `node.x / node.y`, ajouté à `nodesLayer`                               |           |      |
| TASK-010 | Déplacer le dessin de `background` dans `nodeContainer` en coords locales (`0, 0` au lieu de `node.x, node.y`), ajouter label `node:<id>:background`                                       |           |      |
| TASK-011 | Déplacer `typeText` (icon actif/passif) dans `nodeContainer` en coords locales, label `node:<id>:type-icon`                                                                                |           |      |
| TASK-012 | Déplacer `nameText` dans `nodeContainer` en coords locales, label `node:<id>:title`                                                                                                        |           |      |
| TASK-013 | Déplacer `badge` (cost-badge) dans `nodeContainer` en coords locales, label `node:<id>:cost-badge`                                                                                         |           |      |
| TASK-014 | Déplacer `costText` dans `nodeContainer` en coords locales, label `node:<id>:cost-text`                                                                                                    |           |      |
| TASK-015 | Déplacer `rankedText` dans `nodeContainer` en coords locales, label `node:<id>:ranked-indicator`                                                                                           |           |      |
| TASK-016 | Déplacer `hitArea` dans `nodeContainer` en coords locales, label `node:<id>:hit-area` — vérifier que les event listeners (`pointerdown`, `pointerover`, `pointerout`) restent fonctionnels |           |      |
| TASK-017 | Peupler `#debugNodeViews.set(node.nodeId, { data, container, background, nameText, costText, badge, typeText, pictogramText, rankedText, hitArea })` pour chaque node                      |           |      |

### Implementation Phase 4 — Pictogramme en coords locales

- GOAL-004: Adapter `#drawStatePictogramSprite` pour recevoir `parent` et `nodeLabel`, utiliser des coords locales.

| Task     | Description                                                                                                                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-018 | Modifier la signature : `async #drawStatePictogramSprite(node, parent = this.#treeContainer, nodeLabel = 'node:unknown')`                                                                      |           |      |
| TASK-019 | Dans le corps de la méthode : `sprite.x = NODE_WIDTH - 20` (pas `node.x + NODE_WIDTH - 20`), `sprite.y = 4` (pas `node.y + 4`), `parent.addChild(sprite)` (pas `this.#treeContainer.addChild`) |           |      |
| TASK-020 | Poser le label sur le sprite : `setPixiDebugLabel(sprite, \`${nodeLabel}:state-pictogram\`)`                                                                                                   |           |      |
| TASK-021 | À l'appel dans la boucle node, passer `nodeContainer` et `nodeLabel` : `await this.#drawStatePictogramSprite(node, nodeContainer, nodeLabel)`                                                  |           |      |
| TASK-022 | Si fallback pictogramme Unicode, poser label `node:<id>:state-pictogram-text` sur le `PIXI.Text`                                                                                               |           |      |

### Implementation Phase 5 — Appel final et tests

- GOAL-005: Appeler `#exposePixiDevtools()` en fin de `#drawTree` et mettre à jour les tests qui traversent la hiérarchie Pixi.

| Task     | Description                                                                                                                                                                                         | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-023 | Appeler `this.#exposePixiDevtools()` à la fin de `#drawTree(context)` pour garantir que `nodeViews` est peuplé après chaque render                                                                  |           |      |
| TASK-024 | Dans `specialization-tree-app.test.mjs`, mettre à jour les helpers `findNodeHitArea` / `flattenChildren` si la hiérarchie change (les tests GUX3 utilisent déjà une recherche récursive — vérifier) |           |      |
| TASK-025 | Vérifier que `layout.test.mjs` couvre `fromNodeId` / `toNodeId` dans les objets retournés par `buildConnectionAnchors`                                                                              |           |      |
| TASK-026 | Lancer `pnpm vitest run` — tous les tests doivent passer sans modification logique                                                                                                                  |           |      |
| TASK-027 | Lancer `pnpm run build` — build propre sans erreur                                                                                                                                                  |           |      |

## 3. Files Impacted

| File                                                     | Change type |
| -------------------------------------------------------- | ----------- |
| `module/applications/specialization-tree-app.mjs`        | Refactor    |
| `module/applications/specialization-tree/layout.mjs`     | Extend      |
| `tests/applications/specialization-tree-app.test.mjs`    | Update      |
| `tests/applications/specialization-tree/layout.test.mjs` | Update      |

## 4. Acceptance Criteria

- [ ] `window.swerpgDebug.specializationTree.nodeViews` retourne un `Map` peuplé après render
- [ ] `Array.from(views.keys())` liste tous les nodeIds de l'arbre
- [ ] `views.get('<nodeId>').container` est un `PIXI.Container` avec `label` lisible dans Pixi DevTools
- [ ] Rendu visuel identique avant/après (screenshot ou observation manuelle)
- [ ] Aucune régression : hover, tooltip, achat, oubli, refresh
- [ ] `pnpm vitest run` : tous les tests passent
- [ ] `pnpm run build` : build propre

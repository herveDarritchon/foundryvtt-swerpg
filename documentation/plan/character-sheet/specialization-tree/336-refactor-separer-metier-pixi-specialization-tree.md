## Refactor: Séparer la logique métier et le renderer PIXI pour SpecializationTreeApp

Contexte
- Le fichier `module/applications/specialization-tree-app.mjs` mélange :
  - construction du view-model métier/UI (résolution d'arbres, états, positions),
  - dessin et interactions PIXI (stage, Graphics, Sprite, pan/zoom, ResizeObserver),
  - orchestration applicative (open/refresh/close, confirmations, notifications, tooltips).
- Les tests actuels (`tests/applications/specialization-tree-app.test.mjs`) sont volumineux et couvrent à la fois la logique pure et des détails PIXI, rendant les tests unitaires lents et fragiles.

Objectif
- Extraire une couche métier pure qui produit un view-model immuable/serialisable pour le rendu.
- Extraire un renderer PIXI qui consomme ce view-model et n'appelle aucune logique métier (seulement des callbacks).
- Réduire le test monolithique : tests unitaires sur la couche métier, tests d'intégration/E2E pour le renderer.

Contraintes
- Ne pas modifier le comportement fonctionnel (achat, oubli, débloquage).
- Préserver et réutiliser les modules purs existants : `render-view-model.mjs`, `node-ui-state.mjs`, `actionable-node-view-model.mjs`, `layout.mjs`, `types.mjs`.
- Minimiser la portée des changements (petites étapes, commits atomiques).

Phases et tâches

Phase 1 — Contracts & Extraction métier
- Créer `module/applications/specialization-tree/tree-context-builder.mjs` (module pur) qui expose :
  - `buildSpecializationTreeContext(actor, selectedKey = null)`
  - éventuellement helpers purs : `buildRenderNodesAndConnections()`, `buildCurrentTreeSummary()`.
- Extraire `connection-ui-state.mjs` (règles visuelles des connexions) si nécessaire.
- Extraire `node-tooltip-view-model.mjs` (view-model du tooltip) pour séparer la génération de contenu et son rendu DOM.
- Modifier `specialization-tree-app.mjs` pour importer et utiliser le builder pur (sans toucher au renderer).

Phase 2 — Renderer PIXI
- Créer `module/applications/specialization-tree/pixi-tree-renderer.mjs` (composant technique) :
  - encapsule `PIXI.Application`, mounting, resize, viewport transform, pan/zoom;
  - expose méthodes : `mount(hostElement)`, `update(viewModel)`, `destroy()`;
  - émet callbacks pour interactions : `onNodePointerDown(nodeId)`, `onBackgroundPointerDown()`, `onNodeHover(nodeId)`.
- Déplacer dans ce module : `loadStatePictogram`, dessin des connexions/nœuds, gestion des sprites/graphics et gestion des caches de textures.
- Le renderer ne doit pas exécuter d'opérations métier (purchase/forget) ; il ne fait que notifier l'app via callbacks.

Phase 3 — Refactor App Orchestrator
- Adapter `SpecializationTreeApp` pour :
  - utiliser le builder pur pour produire le view-model ;
  - instancier et piloter le `pixi-tree-renderer` ;
  - écouter les callbacks du renderer et déclencher les flows métiers (confirmation DialogV2, appels `purchaseTalentNode` / `forgetTalentNode`, notifications) ;
  - gérer tooltips/dom et confirmations.

Phase 4 — Tests
- Créer tests unitaires pour la couche métier :
  - `tests/applications/specialization-tree/tree-context-builder.test.mjs` : couverture de `buildSpecializationTreeContext` (sélection d'arbre, calculs de nœuds/connexions, summary, variants, actionable nodes) ;
  - `tests/applications/specialization-tree/connection-ui-state.test.mjs` : mapping états->apparence des connexions ;
  - `tests/applications/specialization-tree/node-tooltip-view-model.test.mjs` : génération des contenus de tooltip.
- Simplifier `tests/applications/specialization-tree-app.test.mjs` pour ne tester que l'orchestration :
  - mocker le renderer (spy sur mount/update/destroy) ;
  - vérifier que `open/refresh/close` appellent le builder et le renderer comme attendu ;
  - tester le flow d'achat/oubli en mockant les opérations métier (sans PIXI).
- Marquer ou déplacer les tests PIXI lourds vers un dossier d'intégration / E2E.

Phase 5 — Validation & CI
- Exécuter les suites ciblées après chaque phase :
  - `pnpm vitest run tests/applications/specialization-tree/tree-context-builder.test.mjs`
  - `pnpm vitest run tests/applications/specialization-tree/connection-ui-state.test.mjs`
  - `pnpm vitest run tests/applications/specialization-tree/node-tooltip-view-model.test.mjs`
  - `pnpm vitest run tests/applications/specialization-tree-app.test.mjs`
- Rester vigilant sur les tests transverses qui pourraient importer directement `specialization-tree-app.mjs`.

Fichiers proposés
- Nouveau : `module/applications/specialization-tree/tree-context-builder.mjs` (pur)
- Nouveau : `module/applications/specialization-tree/pixi-tree-renderer.mjs` (technique)
- Nouveau : `module/applications/specialization-tree/connection-ui-state.mjs` (pur, optionnel)
- Nouveau tests : `tests/applications/specialization-tree/*.test.mjs` (3 fichiers ciblés)
- Modifier : `module/applications/specialization-tree-app.mjs` (orchestration only)
- Réduire : `tests/applications/specialization-tree-app.test.mjs`

Vérifications manuelles recommandées
- Smoke run: ouvrir l'UI Foundry et vérifier que l'arbre se monte et que les interactions de base fonctionnent.
- Vérifier que l'UX d'achat/oubli affiche toujours les DialogV2 et notifications.

Risques & Mitigations
- Risque : frontière renderer <-> métier mal définie conduisant à doubles responsabilités.
  - Mitigation : renderer n’émet que des callbacks et reçoit un view-model immuable ; aucune opération métier dans le renderer.
- Risque : tests cassés car certains tests attendaient l'implémentation PIXI.
  - Mitigation : migrer d'abord les assertions métier vers les nouveaux tests, garder un commit intermédiaire où `SpecializationTreeApp` utilise toujours l'ancien dessin mais le view-model provient du builder.

Livrables
- Plan (ce fichier) + nouvelles unités de code (builder, renderer) + tests unitaires pour la logique métier et tests d'orchestration réduits.

Prochaine étape (build)
- Si vous confirmez, j'implémente Phase 1 : création du builder pur et migration des tests métier vers `tree-context-builder.test.mjs`.

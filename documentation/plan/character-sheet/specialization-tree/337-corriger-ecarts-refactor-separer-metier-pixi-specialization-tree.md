# Corriger les écarts du refactor séparation métier / PIXI de SpecializationTreeApp

Contexte

- Le plan initial `336-refactor-separer-metier-pixi-specialization-tree.md` visait à séparer la logique métier pure, le renderer PIXI et l'orchestration applicative.
- Une première implémentation a bien extrait une partie métier (`tree-context-builder.mjs`) et un view-model de tooltip (`node-tooltip-view-model.mjs`), puis a réduit le test monolithique.
- La code review montre cependant que l'objectif global du plan 336 n'est pas atteint : la séparation renderer/app n'est pas faite, la pureté de la couche builder est incomplète, et la couverture de tests reste inférieure au niveau annoncé.

Référence

- Plan source : `documentation/plan/character-sheet/specialization-tree/336-refactor-separer-metier-pixi-specialization-tree.md`

## Constats issus de la code review

### 1. Le renderer PIXI n'a pas été extrait

- `module/applications/specialization-tree/pixi-tree-renderer.mjs` est absent.
- `module/applications/specialization-tree-app.mjs` conserve encore :
  - la création de `PIXI.Application` ;
  - le montage canvas ;
  - le resize ;
  - le pan / zoom ;
  - le dessin des connexions et des nœuds ;
  - le chargement des pictogrammes SVG ;
  - les hit areas et les interactions de pointeur.

### 2. `SpecializationTreeApp` n'est pas encore un orchestrateur fin

- L'app porte encore à la fois :
  - le renderer technique ;
  - les callbacks d'interaction ;
  - les actions métier achat / oubli ;
  - les tooltips DOM.
- Le découplage attendu entre renderer technique et orchestration applicative n'est pas terminé.

### 3. Le builder pur n'est pas totalement pur / sérialisable

- `tree-context-builder.mjs` documente un retour sans références Foundry.
- Pourtant, le builder retourne encore `actor`, `document: actor` et `system: actor.system`.
- La frontière entre view-model pur et contexte applicatif reste donc ambiguë.

### 4. Les tests ont été restructurés, mais pas jusqu'au contrat prévu

- `tests/applications/specialization-tree-app.test.mjs` a bien été réduit.
- Les tests PIXI lourds ont bien été déplacés dans `tests/integration/specialization-tree-pixi-render.test.mjs`.
- Mais les tests d'orchestration n'utilisent pas un renderer mocké, car aucun renderer dédié n'existe encore.
- Le flow achat / oubli / confirmation / notification n'est pas couvert dans le test d'orchestration minimal.

### 5. La couverture pure reste insuffisante par rapport au plan 336

- `tests/applications/specialization-tree/tree-context-builder.test.mjs` couvre seulement quelques happy paths.
- `tests/applications/specialization-tree/node-tooltip-view-model.test.mjs` couvre un seul cas.
- `tests/applications/specialization-tree/connection-ui-state.test.mjs` n'existe pas.
- `module/applications/specialization-tree/connection-ui-state.mjs` n'existe pas non plus.

## Objectif de ce plan correctif

- Terminer réellement la séparation entre métier pur, renderer PIXI et orchestration.
- Réduire `SpecializationTreeApp` à un rôle d'orchestrateur.
- Clarifier le contrat de la couche builder pour qu'elle soit réellement pure.
- Compléter les tests selon le niveau de couverture annoncé dans le plan 336.
- Préserver strictement le comportement fonctionnel existant : affichage, achat, oubli, refresh, pan, zoom, tooltip, confirmations et notifications.

## Contraintes

- Ne pas modifier le comportement métier (achat, oubli, blocages, XP, sélection d'arbre).
- Ne pas modifier les schémas persistés ni les modèles de données publics.
- Réutiliser les modules purs déjà extraits :
  - `render-view-model.mjs`
  - `node-ui-state.mjs`
  - `actionable-node-view-model.mjs`
  - `layout.mjs`
  - `tree-context-builder.mjs`
  - `node-tooltip-view-model.mjs`
- Garder des changements incrémentaux et testables à chaque étape.

## Plan d'implémentation correctif

### Phase 1 — Rendre le builder réellement pur

Objectif

- Faire en sorte que `tree-context-builder.mjs` ne retourne qu'un view-model pur et sérialisable.

Travaux

- Modifier `module/applications/specialization-tree/tree-context-builder.mjs` pour retirer du retour pur :
  - `actor`
  - `document`
  - `system`
- Laisser le builder retourner uniquement les données nécessaires au rendu et à l'orchestration métier :
  - `title`
  - `subtitle`
  - `specializations`
  - `currentTreeId`
  - `currentTreeName`
  - `currentTreeSummary`
  - `currentTreeData` si encore nécessaire à l'orchestration, sinon le remplacer par un payload plus ciblé
  - `renderNodes`
  - `renderConnections`
  - états d'affichage vide / viewport.
- Adapter le wrapper `buildSpecializationTreeContext()` dans `module/applications/specialization-tree-app.mjs` pour réinjecter les champs applicatifs encore requis par le template ou Foundry :
  - `actor`
  - `document`
  - `system`
  - `config`
  - `isOwner`

Résultat attendu

- Le builder devient effectivement pur.
- L'app garde la responsabilité des références live Foundry.

### Phase 2 — Extraire `connection-ui-state.mjs`

Objectif

- Sortir les règles visuelles des connexions de la couche renderer.

Travaux

- Créer `module/applications/specialization-tree/connection-ui-state.mjs`.
- Définir un contrat pur pour chaque connexion rendu :
  - couleur,
  - alpha,
  - épaisseur,
  - éventuels variants futurs de highlight.
- Alimenter ce module depuis les états de nœuds ou depuis les connexions enrichies.
- Adapter le builder ou une étape d'enrichissement pour fournir au renderer des connexions déjà décorées visuellement.

Résultat attendu

- Le renderer PIXI n'encode plus les styles de lignes en dur.

### Phase 3 — Extraire `pixi-tree-renderer.mjs`

Objectif

- Déplacer toute la technique PIXI dans un composant dédié.

Travaux

- Créer `module/applications/specialization-tree/pixi-tree-renderer.mjs`.
- Déplacer dans ce module :
  - `loadStatePictogram()` ;
  - le cache `STATE_PICTOGRAM_TEXTURE_CACHE` ;
  - la création de `PIXI.Application` ;
  - le montage canvas ;
  - le resize ;
  - le `ResizeObserver` ;
  - le viewport transform ;
  - le pan / zoom ;
  - le rendu des layers, connexions, cartes, pictogrammes, hit areas ;
  - l'exposition debug PIXI si elle reste souhaitée.
- Exposer une API minimale de renderer, par exemple :
  - `mount(hostElement)`
  - `update(viewModel, options)`
  - `destroy()`
  - `resetView()`
  - `zoomIn()`
  - `zoomOut()`
- Exposer les interactions sous forme de callbacks injectés :
  - `onNodePointerDown(node)`
  - `onBackgroundPointerDown()`
  - éventuellement `onViewportChange(viewport)` si utile.

Résultat attendu

- `specialization-tree-app.mjs` ne manipule plus directement `PIXI.Container`, `PIXI.Graphics`, `PIXI.Text`, `PIXI.Sprite`, ni les listeners canvas/stage.

### Phase 4 — Réduire `SpecializationTreeApp` à l'orchestration

Objectif

- Faire de l'app une fine couche entre Foundry, la logique métier et le renderer.

Travaux

- Adapter `module/applications/specialization-tree-app.mjs` pour :
  - préparer le contexte via le builder pur ;
  - instancier et piloter `pixi-tree-renderer.mjs` ;
  - conserver dans l'app uniquement :
    - `open`, `refresh`, `close` ;
    - sélection d'arbre ;
    - flow achat / oubli ;
    - confirmation `DialogV2` ;
    - notifications ;
    - rendu DOM du tooltip à partir du view-model pur.
- Garder le renderer totalement ignorant de `purchaseTalentNode`, `forgetTalentNode`, `DialogV2` et `ui.notifications`.

Résultat attendu

- La frontière renderer / orchestration / métier devient nette et maintenable.

### Phase 5 — Compléter la stratégie de tests

Objectif

- Aligner les tests sur le contrat annoncé dans le plan 336.

Travaux sur les tests purs

- Étendre `tests/applications/specialization-tree/tree-context-builder.test.mjs` pour couvrir :
  - sélection d'arbre par défaut ;
  - sélection explicite par `selectedKey` ;
  - arbre introuvable / incomplet / non résolu ;
  - `renderNodes` enrichis ;
  - `renderConnections` ;
  - `currentTreeSummary` ;
  - nodes purchased / available / locked ;
  - `actionable.primaryAction` et flags associés.
- Créer `tests/applications/specialization-tree/connection-ui-state.test.mjs`.
- Étendre `tests/applications/specialization-tree/node-tooltip-view-model.test.mjs` pour couvrir :
  - talent ranked ;
  - talent non-ranked ;
  - présence / absence de `reasonLabel` ;
  - contenu locked / available / purchased.

Travaux sur les tests d'orchestration

- Adapter `tests/applications/specialization-tree-app.test.mjs` pour mocker le renderer dédié.
- Vérifier explicitement que l'app :
  - monte le renderer ;
  - appelle `update()` au render / refresh ;
  - appelle `destroy()` au close ;
  - réagit aux callbacks du renderer ;
  - exécute correctement le flow achat / oubli / confirmation / notifications.

Travaux sur les tests d'intégration

- Conserver `tests/integration/specialization-tree-pixi-render.test.mjs` pour la vérification du renderer réel.
- Le recentrer sur le contrat du renderer plutôt que sur les détails internes de l'app.

Résultat attendu

- Les tests unitaires valident la logique pure.
- Les tests d'orchestration valident l'app sans dépendre du détail PIXI.
- Les tests d'intégration valident le renderer réel.

## Fichiers à créer ou modifier

Créer

- `module/applications/specialization-tree/pixi-tree-renderer.mjs`
- `module/applications/specialization-tree/connection-ui-state.mjs`
- `tests/applications/specialization-tree/connection-ui-state.test.mjs`

Modifier

- `module/applications/specialization-tree/tree-context-builder.mjs`
- `module/applications/specialization-tree-app.mjs`
- `tests/applications/specialization-tree/tree-context-builder.test.mjs`
- `tests/applications/specialization-tree/node-tooltip-view-model.test.mjs`
- `tests/applications/specialization-tree-app.test.mjs`
- `tests/integration/specialization-tree-pixi-render.test.mjs`

## Validation attendue

Validation ciblée

- `pnpm vitest run tests/applications/specialization-tree/tree-context-builder.test.mjs`
- `pnpm vitest run tests/applications/specialization-tree/connection-ui-state.test.mjs`
- `pnpm vitest run tests/applications/specialization-tree/node-tooltip-view-model.test.mjs`
- `pnpm vitest run tests/applications/specialization-tree-app.test.mjs`
- `pnpm vitest run tests/integration/specialization-tree-pixi-render.test.mjs`

Validation élargie

- `pnpm vitest run tests/applications/`
- `pnpm vitest run tests/integration/`

Validation manuelle recommandée

- Ouvrir l'application dans Foundry.
- Vérifier :
  - affichage initial ;
  - changement d'arbre ;
  - pan ;
  - zoom ;
  - tooltip ;
  - achat ;
  - oubli ;
  - refresh après update acteur.

## Critères de sortie

- `SpecializationTreeApp` ne contient plus la logique bas niveau de rendu PIXI.
- Le renderer dédié existe et porte toute la mécanique PIXI.
- Le builder pur ne retourne plus de références live Foundry.
- Le style des connexions est géré dans un module pur dédié ou dans un enrichissement équivalent clairement séparé.
- Les tests sont répartis entre :
  - unitaires purs,
  - orchestration app,
  - intégration renderer.
- Le comportement utilisateur final reste inchangé.

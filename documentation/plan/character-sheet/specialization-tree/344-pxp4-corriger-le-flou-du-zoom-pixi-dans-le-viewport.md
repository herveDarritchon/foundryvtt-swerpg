# PXP4 — Plan d'implémentation : Corriger le flou du zoom PIXI dans le viewport

## Contexte

Issue : [#344 — PXP4 - Corriger le flou du zoom PIXI dans le viewport](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/344)

Références principales :

- `documentation/plan/character-sheet/specialization-tree/253-plan-zoom-molette-centre-pointeur.md`
- `documentation/plan/character-sheet/specialization-tree/254-plan-boutons-zoom-toolbar.md`
- `documentation/plan/character-sheet/specialization-tree/343-pxp3-renforcer-connexions-et-compacter-la-fenetre-de-detail.md`
- `module/applications/specialization-tree/pixi-tree-renderer.mjs`
- `tests/integration/specialization-tree-pixi-render.test.mjs`

`#344` est un enabler technique du chantier `Pixi Tree Polish` : stabiliser la netteté du viewport PIXI afin que le zoom reste exploitable sur les nœuds, icônes et connexions, sans réintroduire de glissement ni modifier les comportements de navigation déjà livrés.

## Objectif

Figer un contrat de netteté explicite pour le renderer PIXI du `SpecializationTreeApp` afin que la plage de zoom supportée conserve une lisibilité acceptable, tout en gardant inchangées les règles de pan, de zoom et d'interaction utilisateur.

## Périmètre

### Inclus

- explicitation du contrat `resolution` / `autoDensity` / sizing canvas du renderer PIXI ;
- stabilisation du cycle `mount` / `resize` pour éviter un canvas sous-dimensionné ou redensifié de manière incohérente ;
- traitement ciblé des textures SVG, sprites et primitives rendus dans le viewport zoomé ;
- couverture de tests d'intégration sur la netteté technique et la non-régression du zoom.

### Exclus

- modification des règles métier des talents, de l'achat, de l'oubli ou des blocages ;
- refonte visuelle large des nœuds, connexions ou panneaux déjà traités par `PXP1` à `PXP3` ;
- changement du comportement fonctionnel de `wheel`, `zoomIn`, `zoomOut`, `resetView` ou du pan hors correction technique minimale ;
- optimisation large des performances ou du pipeline PIXI au-delà du problème de netteté.

## Fichiers pressentis

| Fichier                                                      | Rôle                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `module/applications/specialization-tree/pixi-tree-renderer.mjs` | Centraliser le contrat de netteté du viewport, du canvas et des textures |
| `tests/integration/specialization-tree-pixi-render.test.mjs` | Verrouiller le contrat technique de rendu et la non-régression du zoom   |

## Plan d'implémentation

### Étape 1 — Figer le contrat de netteté du renderer PIXI

**Fichiers :** `module/applications/specialization-tree/pixi-tree-renderer.mjs`

1. Rendre explicites les paramètres qui pilotent la qualité réelle du canvas PIXI (`resolution`, `autoDensity`, dimensions CSS/canvas, et tout réglage de renderer utile à la netteté) avec une seule source de vérité dans le renderer.
2. Appliquer ce contrat aussi bien à l'initialisation qu'au `resize`, pour éviter qu'un zoom correct mathématiquement s'appuie sur un canvas rendu trop flou ou recalibré de façon incohérente.
3. Préserver inchangées la logique de `#zoomAt`, les bornes de zoom et le pan, sauf ajustement technique strictement nécessaire au branchement de ce contrat.

**Validation visée :** le viewport conserve une base de rendu nette et cohérente sans altérer le comportement actuel de navigation.

### Étape 2 — Stabiliser la netteté des éléments rendus dans le viewport zoomé

**Fichiers :** `module/applications/specialization-tree/pixi-tree-renderer.mjs`

1. Harmoniser le traitement des textures SVG/icônes, des sprites et des primitives afin qu'ils consomment le même contrat de netteté que le viewport.
2. Éviter les réglages dispersés objet par objet en centralisant la configuration utile à la lisibilité des nœuds, icônes, badges et connexions après zoom in et zoom out.
3. Vérifier que l'amélioration reste neutre à `scale = 1` et n'introduit pas d'effet de glissement, de décalage visuel ou de perte de contrôle du viewport.

**Validation visée :** les nœuds, icônes et connexions restent lisibles dans la plage de zoom supportée sans dégrader le rendu nominal.

### Étape 3 — Verrouiller le contrat technique et la non-régression du zoom

**Fichiers :** `tests/integration/specialization-tree-pixi-render.test.mjs`

1. Étendre les tests pour vérifier la création et le redimensionnement du renderer avec le contrat explicite de densité/résolution attendu.
2. Vérifier que `wheel`, `zoomIn`, `zoomOut` et `resetView` continuent de piloter le même viewport sans glissement ni perte de contrôle observable.
3. Ajouter des assertions ciblées sur les réglages observables du canvas et du renderer, sans basculer vers des tests pixel-perfect fragiles.

**Validation visée :** `PXP4` devient un enabler technique stable avant la passe de validation UX de `PXP5`.

## Définition de done

- [ ] Le renderer PIXI applique un contrat unique et explicite de netteté du viewport.
- [ ] Le cycle `mount` / `resize` conserve ce contrat sans incohérence de canvas.
- [ ] Les nœuds, icônes et connexions restent lisibles après zoom in et zoom out.
- [ ] La correction ne réintroduit ni glissement ni perte de contrôle du viewport.
- [ ] Les tests d'intégration verrouillent le contrat technique et la non-régression du zoom.

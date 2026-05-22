# PXP3 — Plan d'implémentation : Renforcer connexions et compacter la fenêtre de détail

## Contexte

Issue : [#343 — PXP3 - Renforcer connexions et compacter la fenetre de detail](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/343)

Références principales :

- `documentation/plan/character-sheet/specialization-tree/341-pxp1-clarifier-contraste-et-etats-des-noeuds-actifs-inactifs.md`
- `documentation/plan/character-sheet/specialization-tree/342-pxp2-ouvrir-le-detail-au-clic-et-ajouter-les-icones-d-action-des-noeuds.md`
- `documentation/plan/character-sheet/specialization-tree/328-gux3-rendre-les-connexions-et-le-hover-plus-explicites-pour-la-progression.md`
- `documentation/plan/character-sheet/specialization-tree/329-gux4-transformer-le-panneau-de-detail-en-panneau-daction-contextuelle.md`
- `module/applications/specialization-tree/connection-ui-state.mjs`
- `module/applications/specialization-tree/pixi-tree-renderer.mjs`
- `module/applications/specialization-tree-app.mjs`

`#343` prolonge `PXP1` et `PXP2` avec une passe de polish UX ciblée : les connexions doivent mieux guider l'œil dans le canvas, tandis que la fenêtre de détail doit occuper moins d'espace et rendre sa fermeture évidente, sans modifier les règles métier d'achat, d'oubli ou de blocage.

## Objectif

Renforcer la lisibilité immédiate de l'arbre de spécialisation en rendant les connexions plus épaisses et plus contrastées, puis compacter la fenêtre de détail autour des informations utiles avec une croix de fermeture explicite.

## Périmètre

### Inclus

- augmentation mesurée de l'épaisseur et du contraste des connexions ;
- maintien d'une hiérarchie visuelle où les nœuds restent l'élément principal ;
- compaction du header de la fenêtre de détail ;
- ajout d'un bouton de fermeture explicite dans la fenêtre de détail ;
- conservation du CTA contextuel, de l'état, de la raison et de la description ;
- couverture de tests ciblée sur le contrat visuel et le comportement observable.

### Exclus

- toute modification des règles métier de disponibilité, achat, oubli ou remboursement ;
- refonte large du layout global de `SpecializationTreeApp` hors fenêtre de détail ;
- nouvelles interactions secondaires hors fermeture explicite du détail ;
- travail de netteté/zoom PIXI relevant de `PXP4`.

## Fichiers pressentis

| Fichier                                                           | Rôle                                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `module/applications/specialization-tree/connection-ui-state.mjs` | Renforcer et formaliser le contrat visuel des connexions                   |
| `module/applications/specialization-tree/pixi-tree-renderer.mjs`  | Appliquer les nouveaux styles de lignes dans le rendu PIXI                 |
| `module/applications/specialization-tree-app.mjs`                 | Gérer la fermeture explicite et préserver le flux détail → CTA             |
| `templates/applications/specialization-tree-app.hbs`              | Recomposer le header du détail et ajouter la croix de fermeture            |
| `styles/applications.less`                                        | Porter la compaction du détail et le bouton de fermeture visible           |
| `lang/fr.json` / `lang/en.json`                                   | Ajouter le libellé/aria du contrôle de fermeture si nécessaire             |
| `tests/applications/specialization-tree/connection-ui-state.test.mjs` | Verrouiller le contrat pur des connexions                              |
| `tests/integration/specialization-tree-pixi-render.test.mjs`      | Vérifier l'application effective des styles de connexions                  |
| `tests/applications/specialization-tree-app.test.mjs`             | Vérifier l'ouverture, la fermeture explicite et la non-régression du CTA   |

## Plan d'implémentation

### Étape 1 — Renforcer le contrat visuel des connexions

**Fichiers :** `module/applications/specialization-tree/connection-ui-state.mjs`, `tests/applications/specialization-tree/connection-ui-state.test.mjs`

1. Remplacer le style de ligne trop neutre par un contrat plus lisible : épaisseur augmentée, contraste rehaussé et opacités cohérentes avec les états déjà exposés.
2. Définir un petit nombre de variantes stables consommables par le renderer, sans recalcul métier local ni logique UX dispersée dans PIXI.
3. Garder les connexions en soutien visuel des nœuds : le renforcement doit guider l'œil sans concurrencer la lecture des talents.

**Validation visée :** les connexions deviennent immédiatement perceptibles sur le canvas tout en restant secondaires par rapport aux nœuds.

### Étape 2 — Compacter la fenêtre de détail et rendre sa fermeture explicite

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `lang/fr.json`, `lang/en.json`

1. Réorganiser le header du détail pour densifier le nom, le coût et le type sans perdre l'information principale ni casser la lisibilité de l'état courant.
2. Réduire les espacements, la hauteur utile et les zones redondantes afin que la fenêtre masque moins le viewport.
3. Ajouter une croix de fermeture explicite, localisée et accessible, branchée sur le mécanisme existant de masquage du panneau.
4. Conserver inchangés le CTA contextuel, la raison de blocage et la description, avec un ordre visuel plus compact.

**Validation visée :** la fenêtre de détail occupe moins d'espace, reste lisible et peut être fermée sans ambiguïté par un contrôle dédié.

### Étape 3 — Brancher le rendu final et verrouiller le contrat observable

**Fichiers :** `module/applications/specialization-tree/pixi-tree-renderer.mjs`, `tests/integration/specialization-tree-pixi-render.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Faire consommer au renderer le contrat de connexions renforcé pour que l'épaisseur et le contraste observables correspondent à la nouvelle source de vérité.
2. Étendre les tests d'intégration PIXI pour vérifier que les lignes rendues utilisent bien les nouvelles valeurs attendues.
3. Étendre les tests applicatifs pour vérifier que le clic ouvre toujours le détail, que la croix le ferme explicitement, et que le CTA contextuel continue de piloter seul l'action métier.
4. Vérifier que la fermeture explicite coexiste avec le masquage déjà possible via le fond ou les changements de contexte, sans état résiduel.

**Validation visée :** les gains de lisibilité et de compaction deviennent observables, stables et sans régression sur le flux de détail/action.

## Définition de done

- [ ] Les connexions sont visiblement plus épaisses et plus lisibles dans le canvas.
- [ ] Le renforcement des connexions ne prend pas le pas sur les nœuds.
- [ ] Le header de la fenêtre de détail est plus compact.
- [ ] Une croix explicite permet de fermer la fenêtre de détail.
- [ ] Le CTA contextuel et les informations d'état restent disponibles sans régression fonctionnelle observable.
- [ ] Les tests verrouillent le contrat de connexions et le comportement d'ouverture/fermeture du détail.

# PXP2 — Plan d'implémentation : Ouvrir le détail au clic et ajouter les icônes d'action des nœuds

## Contexte

Issue : [#342 — PXP2 - Ouvrir le detail au clic et ajouter les icones d action des noeuds](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/342)

Références principales :

- `documentation/plan/character-sheet/specialization-tree/341-pxp1-clarifier-contraste-et-etats-des-noeuds-actifs-inactifs.md`
- `documentation/plan/character-sheet/specialization-tree/329-gux4-transformer-le-panneau-de-detail-en-panneau-daction-contextuelle.md`
- `module/applications/specialization-tree/node-ui-state.mjs`
- `module/applications/specialization-tree/pixi-tree-renderer.mjs`
- `module/applications/specialization-tree-app.mjs`

`#342` prolonge `PXP1` en rendant chaque nœud immédiatement lisible et consultable : le clic ne doit plus déclencher directement l'action métier, mais ouvrir le détail, tandis que les coins du nœud exposent des icônes stables pour le type actif/inactif, l'action disponible et le caractère ranked.

## Objectif

Faire du clic sur nœud le point d'entrée unique de consultation/action, puis rendre le langage visuel des nœuds plus explicite via trois emplacements d'icônes stables : état actif/inactif en haut à gauche, action en haut à droite, rang en bas à droite.

## Périmètre

### Inclus

- ouverture systématique du panneau de détail au clic sur n'importe quel nœud ;
- conservation de l'action métier via le CTA du panneau contextuel ;
- mapping explicite des icônes par coin du nœud ;
- affichage de `electricity.svg` / `plain-circle.svg` pour actif / inactif ;
- affichage de `buy-card.svg` / `sell-card.svg` selon `primaryAction` ;
- affichage de `rank.svg` pour les talents ranked.

### Exclus

- modification des règles métier d'achat, d'oubli, de blocage ou de remboursement ;
- refonte large du panneau de détail hors ajustements nécessaires au nouveau flux de clic ;
- nouvelles interactions secondaires (double-clic, menu contextuel, raccourcis clavier) ;
- reprise du contraste global des nœuds déjà traité par `PXP1`.

## Fichiers pressentis

| Fichier                                                          | Rôle                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `module/applications/specialization-tree/node-ui-state.mjs`      | Centraliser le contrat d'icônes par coin selon type, action et rang     |
| `module/applications/specialization-tree/pixi-tree-renderer.mjs` | Rendre les sprites/icônes aux bons emplacements sur chaque nœud         |
| `module/applications/specialization-tree-app.mjs`                | Faire du clic un ouvre-détail et réserver l'exécution au CTA du panneau |
| `tests/applications/specialization-tree/node-ui-state.test.mjs`  | Verrouiller le mapping des slots d'icônes                               |
| `tests/applications/specialization-tree-app.test.mjs`            | Vérifier le nouveau flux clic → détail → action                         |
| `tests/integration/specialization-tree-pixi-render.test.mjs`     | Vérifier la présence et la stabilité des icônes rendues                 |

## Plan d'implémentation

### Étape 1 — Formaliser le contrat d'icônes par coin

**Fichiers :** `module/applications/specialization-tree/node-ui-state.mjs`, `tests/applications/specialization-tree/node-ui-state.test.mjs`

1. Remplacer le pictogramme d'état unique par un contrat explicite de slots visuels (`topLeft`, `topRight`, `bottomRight`) consommable par le renderer.
2. Mapper le coin haut gauche sur le type du talent : `electricity.svg` pour actif, `plain-circle.svg` pour inactif.
3. Mapper le coin haut droit sur `primaryAction` quand elle existe : `buy-card.svg` pour `purchase`, `sell-card.svg` pour `forget`, et aucune icône sinon.
4. Mapper le coin bas droit sur `rank.svg` quand `isRanked === true`.

**Validation visée :** la source de vérité du langage d'icônes devient pure, stable et testable sans dépendre du rendu PIXI.

### Étape 2 — Recentrer l'interaction utilisateur sur le panneau de détail

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Faire en sorte que le clic sur nœud ouvre toujours le détail, y compris pour les nœuds actuellement actionnables.
2. Conserver l'exécution d'achat/oubli uniquement derrière le CTA du panneau contextuel déjà existant.
3. Vérifier que les cas bloqués, informatifs et actionnables restent cohérents avec le panneau et qu'aucune action métier ne part directement du clic initial.

**Validation visée :** le flux utilisateur devient systématiquement `clic sur nœud → lecture du détail → CTA éventuel`, sans perte des comportements d'achat/oubli existants.

### Étape 3 — Rendre les icônes PIXI et verrouiller le contrat observable

**Fichiers :** `module/applications/specialization-tree/pixi-tree-renderer.mjs`, `tests/integration/specialization-tree-pixi-render.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Rendre les icônes par coin avec des positions stables et lisibles à petite taille, sans collision avec le nom, le coût XP et le badge éventuel.
2. Remplacer l'indicateur textuel ranked actuel par `rank.svg` au coin bas droit.
3. Vérifier en tests d'intégration que les icônes attendues apparaissent pour les combinaisons clés (actif/inactif, achat/oubli, ranked/non-ranked).
4. Vérifier en tests applicatifs que le clic ouvre le détail avant toute action et que le CTA reste le seul déclencheur du flux métier.

**Validation visée :** les nœuds deviennent consultables au clic et immédiatement compréhensibles visuellement, avec des affordances stables par coin.

## Définition de done

- [ ] Le clic sur un nœud ouvre toujours le panneau de détail.
- [ ] Une action `purchase` ou `forget` n'est plus exécutée directement au clic sur le nœud.
- [ ] `electricity.svg` et `plain-circle.svg` distinguent clairement actif / inactif en haut à gauche.
- [ ] `buy-card.svg` et `sell-card.svg` exposent l'action disponible en haut à droite.
- [ ] `rank.svg` remplace l'indicateur textuel de rang en bas à droite.
- [ ] Les tests couvrent le mapping d'icônes, le rendu PIXI et le flux clic → détail → action.

# US16.4 — Plan d'implémentation : Définir le layout graphique minimal

## Contexte

Issue : [#297 — US16.4 - Définir le layout graphique minimal](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/297)

Références :

- `documentation/plan/character-sheet/specialization-tree/us16-2-current-tree-render-view-model.md`
- `documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`

L'existant fournit déjà l'entrée métier nécessaire :

- `buildRenderViewModel()` expose `row`, `column` et les connexions du tree courant ;
- `module/applications/specialization-tree-app.mjs` calcule déjà un layout minimal inline via `NODE_WIDTH`, `NODE_HEIGHT`, `H_GAP`, `V_GAP`, `PADDING` et `computeNodePosition()` ;
- les positions de connexions sont encore reconstruites dans l'application à partir des centres de nœuds.

Le besoin de l'issue est de verrouiller un contrat de layout simple, déterministe et centralisé, sans couplage supplémentaire à PIXI.

## Objectif

Transformer les coordonnées logiques `row` / `column` du view-model en positions graphiques stables, puis en points d'ancrage de connexions, via un module pur dédié au layout minimal.

## Périmètre

### Inclus

- constantes de layout minimales (taille de nœud, gaps, padding) ;
- conversion `row` / `column` → `x` / `y` ;
- calcul des points d'ancrage de connexion à partir des nœuds positionnés ;
- couverture de test du contrat de layout.

### Exclus

- zoom, pan, drag ou fit-to-view ;
- auto-layout complexe ;
- recalcul métier des connexions ;
- dessin PIXI et variantes visuelles des nœuds.

## Fichiers pressentis

| Fichier                                                    | Rôle                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `module/applications/specialization-tree/layout.mjs`       | Nouveau module pur de layout minimal                      |
| `module/applications/specialization-tree-app.mjs`          | Remplacer le calcul inline par l'appel au layout dédié    |
| `tests/applications/specialization-tree/layout.test.mjs`   | Tests unitaires purs du contrat de layout                 |
| `tests/applications/specialization-tree-app.test.mjs`      | Vérification d'intégration du contexte consommé par l'app |

## Plan d'implémentation

### Étape 1 — Extraire le layout minimal dans un module pur

**Fichiers :** `module/applications/specialization-tree/layout.mjs`

**Actions :**

1. Centraliser les constantes `NODE_WIDTH`, `NODE_HEIGHT`, `H_GAP`, `V_GAP` et `PADDING` dans un module dédié.
2. Définir une fonction pure qui transforme un nœud `{ row, column }` en position graphique `{ x, y }`.
3. Définir une fonction pure qui dérive les ancrages de connexions depuis les nœuds déjà positionnés, sans dépendre de PIXI.
4. Garder le contrat volontairement minimal : coordonnées stables, déterministes et sans effet de bord.

**Validation visée :** le layout peut être testé sans `game`, `ui`, `canvas` ni renderer PIXI.

### Étape 2 — Brancher `SpecializationTreeApp` sur ce contrat unique

**Fichiers :** `module/applications/specialization-tree-app.mjs`

**Actions :**

1. Remplacer le calcul inline des positions de nœuds par l'appel au module de layout.
2. Construire `renderConnections` à partir des positions calculées plutôt que via une logique locale dispersée.
3. Conserver `buildRenderViewModel()` comme source unique de `row`, `column` et des connexions métier.
4. Laisser hors scope tout comportement de caméra ou de centrage avancé.

**Validation visée :** le contexte de rendu expose des coordonnées et connexions cohérentes sans introduire de nouvelle logique métier dans l'application.

### Étape 3 — Verrouiller le contrat par des tests ciblés

**Fichiers :** `tests/applications/specialization-tree/layout.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

**Actions :**

1. Ajouter des tests unitaires sur le mapping `row` / `column` → `x` / `y` avec padding et gaps.
2. Couvrir le calcul des centres de connexion entre deux nœuds positionnés.
3. Vérifier les cas dégradés : liste vide, connexion vers nœud absent, coordonnées de base en `(0, 0)` logique.
4. Garder un test d'intégration qui vérifie que `buildSpecializationTreeContext()` expose toujours `renderNodes` et `renderConnections` alignés avec le layout centralisé.

**Validation visée :** le contrat observable de layout est figé et reste simple à faire évoluer sans casser le rendu.

## Définition de done

- [ ] Les constantes minimales de layout sont centralisées dans un module dédié.
- [ ] Les nœuds sont positionnés uniquement à partir de `row` / `column`.
- [ ] Les connexions relient les bons centres de nœuds positionnés.
- [ ] `SpecializationTreeApp` ne conserve plus de logique de layout inline dispersée.
- [ ] Les tests couvrent le contrat minimal de layout et son intégration applicative.

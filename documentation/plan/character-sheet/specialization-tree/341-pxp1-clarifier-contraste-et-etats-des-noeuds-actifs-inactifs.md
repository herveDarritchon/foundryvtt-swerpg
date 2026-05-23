# PXP1 — Plan d'implémentation : Clarifier contraste et états des nœuds actifs/inactifs

## Contexte

Issue : [#341 — PXP1 - Clarifier contraste et etats des noeuds actifs/inactifs](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/341)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/pixi-tree-polish/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/pixi-tree-polish/issues-checklist.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-refonte-graphique.md`
- `documentation/plan/character-sheet/specialization-tree/327-gux2-clarifier-les-etats-des-noeuds-avec-couleurs-contraste-et-pictogrammes.md`

`#341` ouvre la passe de base du chantier `Pixi Tree Polish` : rendre immédiatement lisibles le type métier du nœud (actif/inactif) et son état observable (acheté, disponible, verrouillé), sans retoucher les règles domaine.

## Objectif

Établir un contrat visuel court, stable et testable pour les nœuds de `SpecializationTreeApp`, avec une base rouge pour les talents actifs, une base bleue pour les talents inactifs, des variantes d'état distinguables, un badge XP réservé aux cas `available`, et un coût XP présenté de manière uniforme.

## Périmètre

### Inclus

- palette actif/inactif portée par la couleur de base du nœud ;
- différenciation visible entre `purchased`, `available` et `locked` à l'intérieur de chaque famille ;
- indice non chromatique minimal pour éviter une lecture dépendante de la seule couleur ;
- harmonisation du rendu du coût XP ;
- définition explicite des couleurs `fill`, `border`, `text`, `xpCost` et `xpBadge` pour les 6 cas ;
- couverture de test ciblée sur les 6 cas prioritaires.

### Exclus

- ouverture du détail au clic et icônes d'action dédiées (`PXP2`) ;
- renforcement des connexions et compaction de la fenêtre de détail (`PXP3`) ;
- correction de netteté du zoom PIXI (`PXP4`) ;
- toute modification des règles métier de calcul d'état, d'achat ou d'oubli.

## Matrice visuelle cible

| Type talent      | État        | Fill       | Border     | Texte               | Coût XP    | Badge XP                       |
| ---------------- | ----------- | ---------- | ---------- | ------------------- | ---------- | ------------------------------ |
| Actif            | `purchased` | `0x7A2323` | `0xFFA2A2` | `0xFFF7F7`          | `0xFFC7C7` | aucun                          |
| Actif            | `available` | `0x4D2525` | `0xB87676` | `0xFFF5F5`          | `0xFFFFFF` | `0x7A3E3E` / border `0xD9A0A0` |
| Actif            | `locked`    | `0x302020` | `0x7A7A7A` | `0xE2D7D7` a `0.68` | `0x999999` | aucun                          |
| Passif / inactif | `purchased` | `0x1F4F8C` | `0x95C9FF` | `0xFFFFFF`          | `0xB9D9FF` | aucun                          |
| Passif / inactif | `available` | `0x21344D` | `0x5F85AD` | `0xF5F9FF`          | `0xFFFFFF` | `0x355A84` / border `0x8CB8E8` |
| Passif / inactif | `locked`    | `0x1F2630` | `0x7A7A7A` | `0xD7DBE2` a `0.68` | `0x999999` | aucun                          |

Contraintes de lecture derivees :

- le rouge/bleu porte exclusivement le type de talent ;
- la distinction `purchased` / `available` / `locked` repose sur la combinaison fill + border + contraste texte + presence/absence du badge XP ;
- le badge XP n'apparait que pour les noeuds `available`.

## Fichiers pressentis

| Fichier                                                         | Rôle                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `module/applications/specialization-tree/node-ui-state.mjs`     | Centraliser la matrice visuelle état × type                   |
| `module/applications/specialization-tree-app.mjs`               | Appliquer le contrat visuel au rendu PIXI des nœuds           |
| `tests/applications/specialization-tree/node-ui-state.test.mjs` | Verrouiller le mapping pur des variantes                      |
| `tests/applications/specialization-tree-app.test.mjs`           | Vérifier l'exposition applicative du contrat de rendu         |
| `lang/fr.json` / `lang/en.json`                                 | Compléter les libellés uniquement si un nouvel indice l'exige |

## Plan d'implémentation

### Étape 1 — Figer la matrice visuelle des nœuds

**Fichiers :** `module/applications/specialization-tree/node-ui-state.mjs`

1. Définir un contrat unique combinant `isActive` et `nodeState` pour produire `fill`, `border`, `text`, `xpCost` et `xpBadge` selon la matrice ci-dessus.
2. Séparer clairement le signal de type (rouge actif / bleu inactif) du signal d'état (acheté, disponible, verrouillé) sans recalcul métier côté UI.
3. Encadrer explicitement les cas `available` comme seuls noeuds portant un badge XP dédié, avec ses couleurs de fond et de bordure.

**Validation visée :** les 6 combinaisons prioritaires sont distinguables sans ambiguïté majeure et sans recalcul métier côté UI.

### Étape 2 — Appliquer ce contrat au rendu PIXI et stabiliser le coût XP

**Fichiers :** `module/applications/specialization-tree-app.mjs`

1. Remplacer tout style inline disperse par la consommation du mapper UI centralisé.
2. Appliquer strictement les valeurs de `fill`, `border`, contraste texte et couleur du coût XP pour chacun des 6 cas définis.
3. Afficher le badge XP uniquement pour les noeuds `available`, avec la palette specifique active/inactive fournie.

**Validation visée :** le rendu final raconte clairement actif/inactif et acheté/disponible/verrouillé au premier regard.

### Étape 3 — Verrouiller les tests du contrat observable

**Fichiers :** `tests/applications/specialization-tree/node-ui-state.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Couvrir la matrice minimale : actif acheté, actif disponible, actif verrouillé, inactif acheté, inactif disponible, inactif verrouillé.
2. Vérifier que la lisibilite ne depend pas uniquement de la teinte : bordure, contraste texte et presence/absence du badge XP doivent rester coherents.
3. Verifier que le cout XP suit le contrat attendu pour chaque etat et que l'application consomme bien le mapper dedie.

**Validation visée :** le langage visuel de base de `PXP1` devient stable avant d'ouvrir `PXP2` et `PXP3`.

## Définition de done

- [ ] Les nœuds actifs utilisent une base rouge et les nœuds inactifs une base bleue.
- [ ] `purchased`, `available` et `locked` restent lisibles dans chaque famille actif/inactif.
- [ ] Le badge XP n'apparait que sur les noeuds `available`, avec la palette definie.
- [ ] La lecture d'etat ne depend pas uniquement de la couleur.
- [ ] Le cout XP est presente de facon uniforme et conforme a la matrice cible.
- [ ] Les tests couvrent les 6 cas prioritaires du ticket.

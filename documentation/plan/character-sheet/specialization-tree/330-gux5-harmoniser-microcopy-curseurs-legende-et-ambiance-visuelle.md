# GUX5 — Plan d'implémentation : Harmoniser microcopy, curseurs, légende et ambiance visuelle

## Contexte

Issue : [#330 — GUX5 - Harmoniser microcopy, curseurs, légende et ambiance visuelle](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/330)

Références principales :

- `documentation/ways-of-work/plan/specialization-tree-v1/graphical-ux-refresh/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/graphical-ux-refresh/issues-checklist.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-evolution-vue-arbres-specialisation.md` (§7.4, §10.3, §10.4)
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-refonte-graphique.md` (§7, §9, §10.1)
- `documentation/plan/character-sheet/specialization-tree/326-gux1-compacter-le-header-et-clarifier-la-sidebar-de-progression.md`
- `documentation/plan/character-sheet/specialization-tree/329-gux4-transformer-le-panneau-de-detail-en-panneau-daction-contextuelle.md`

Après GUX1 à GUX4, l'arbre de spécialisation dispose déjà d'un layout densifié, d'états visuels plus explicites, d'un hover contextuel et d'un panneau d'action. Le besoin de `#330` est de consolider la couche de surface : supprimer la microcopy générique, rendre les curseurs cohérents avec les affordances réelles, ajouter une légende compacte du code visuel et pousser une ambiance `Outer Rim Datapad` sobre, sans toucher aux règles métier ni surcharger l'écran.

## Objectif

Rendre la vue d'arbre immédiatement compréhensible et cohérente dans ses signaux d'interaction, avec des libellés explicites, une légende discrète, des curseurs fiables et une identité visuelle plus homogène.

## Périmètre

### Inclus

- harmonisation de la microcopy des actions, modales et états visibles dans le flux ciblé ;
- exposition de métadonnées UI permettant d'aligner action, curseur et état métier ;
- ajout d'une légende compacte et localisée des états principaux ;
- polish visuel léger inspiré de `Outer Rim Datapad` sur la vue ciblée ;
- extension des tests applicatifs sur le contrat UX observable.

### Exclus

- changement des règles métier d'achat, d'oubli, de verrouillage ou de disponibilité ;
- nouveaux gestes d'interaction ou nouveaux flux de validation ;
- refonte lourde du layout général déjà couverte par GUX1 à GUX4 ;
- validation UX globale et non-régression finale, portée par `#331` / GUX6.

## Fichiers pressentis

| Fichier                                               | Rôle                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `module/applications/specialization-tree-app.mjs`     | Centraliser la microcopy d'action, les métadonnées de légende et les affordances UI |
| `templates/applications/specialization-tree-app.hbs`  | Rendre la légende compacte et brancher les hooks d'affordance visibles              |
| `styles/applications.less`                            | Porter les curseurs, la légende et le polish visuel sobre                           |
| `lang/fr.json`                                        | Localiser les libellés FR des actions, états et légende                             |
| `lang/en.json`                                        | Localiser les libellés EN des actions, états et légende                             |
| `tests/applications/specialization-tree-app.test.mjs` | Verrouiller la cohérence microcopy / légende / affordances                          |

## Plan d'implémentation

### Étape 1 — Stabiliser la microcopy et les métadonnées d'affordance

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `lang/fr.json`, `lang/en.json`

1. Remplacer, dans le flux ciblé, les libellés génériques ou ambigus par des verbes d'action explicites et localisés, cohérents avec les conventions attendues (`Purchase`, `Refund`, `Cancel`, équivalents FR).
2. Exposer depuis le contexte UI les informations de surface nécessaires pour éviter toute logique dispersée dans le template : libellé d'action principal, état lisible, type d'affordance et clé de légende associée.
3. Veiller à ce que les états non actionnables (`locked`, `invalid`, nœud acheté non oubliable) gardent une microcopy informative sans faux CTA.

**Validation visée :** chaque état visible raconte clairement ce qu'il est possible de faire — ou pourquoi aucune action n'est possible — sans divergence avec le contrat métier existant.

### Étape 2 — Ajouter une légende compacte et aligner les curseurs sur l'état réel

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`

1. Introduire une légende discrète des états principaux (`purchased`, `available`, `locked`, `invalid`) en réutilisant le même langage visuel que les nœuds.
2. Associer à chaque état ou affordance le curseur attendu (`pointer`, `help`, `default`, `not-allowed` selon le contrat retenu) afin que le signal de survol soit cohérent avec l'action réelle ou l'absence d'action.
3. Positionner la légende de manière à ne pas concurrencer l'arbre ni masquer le viewport, tout en restant lisible après redimensionnement.

**Validation visée :** l'utilisateur peut décoder rapidement le code visuel et anticiper correctement si un nœud est actionnable, informatif ou bloqué.

### Étape 3 — Appliquer le polish visuel sobre et verrouiller le contrat UX observable

**Fichiers :** `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `tests/applications/specialization-tree-app.test.mjs`

1. Appliquer une passe visuelle légère `Outer Rim Datapad` : ambiance plus homogène, méta-labels courts, fond/grille très subtils et glow réservé aux éléments réellement actionnables.
2. Vérifier que cette passe n'introduit ni bruit décoratif, ni perte de contraste, ni ambiguïté supplémentaire entre type de nœud, état d'achat et action possible.
3. Étendre les tests applicatifs pour couvrir la présence de la légende, la cohérence de la microcopy d'action et l'exposition des affordances UI attendues par état.

**Validation visée :** la vue gagne en identité et en lisibilité sans modifier les comportements déjà livrés ni dégrader la sobriété de l'écran.

## Définition de done

- [ ] Les actions et modales du flux ciblé n'utilisent plus de microcopy générique de type `Yes / No`.
- [ ] Les curseurs et affordances visibles sont cohérents avec l'état métier réellement exposé.
- [ ] Une légende compacte, localisée et discrète aide à lire les états principaux sans masquer l'arbre.
- [ ] L'ambiance visuelle `Outer Rim Datapad` renforce l'identité sans bruit décoratif ni perte de lisibilité.
- [ ] Les tests verrouillent la cohérence observable entre microcopy, légende et signaux d'interaction.

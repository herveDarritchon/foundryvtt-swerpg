# PXP5 — Plan d'implémentation : Valider lisibilité, affordances et netteté du canvas

## Contexte

Issue : [#345 — PXP5 - Valider lisibilite, affordances et nettete du canvas](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/345)

Références principales :

- `documentation/ways-of-work/plan/specialization-tree-v1/pixi-tree-polish/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/pixi-tree-polish/issues-checklist.md`
- `documentation/plan/character-sheet/specialization-tree/341-pxp1-clarifier-contraste-et-etats-des-noeuds-actifs-inactifs.md`
- `documentation/plan/character-sheet/specialization-tree/342-pxp2-ouvrir-le-detail-au-clic-et-ajouter-les-icones-d-action-des-noeuds.md`
- `documentation/plan/character-sheet/specialization-tree/343-pxp3-renforcer-connexions-et-compacter-la-fenetre-de-detail.md`
- `documentation/plan/character-sheet/specialization-tree/344-pxp4-corriger-le-flou-du-zoom-pixi-dans-le-viewport.md`

`#345` est le verrou final du chantier `Pixi Tree Polish` : vérifier sur une matrice courte et observable que les états de nœuds, les affordances d'interaction, les connexions et la netteté du zoom restent cohérents ensemble, puis limiter toute correction éventuelle au seul écart effectivement prouvé.

## Objectif

Sécuriser la non-régression observable de `SpecializationTreeApp` après `PXP1` à `PXP4`, avec une validation ciblée couvrant la lisibilité des nœuds, les affordances du flux détail/action, la visibilité des connexions et la netteté du canvas.

## Périmètre

### Inclus

- validation des 6 cas de base : actif/inactif × disponible/indisponible/acheté ;
- validation du clic nœud → détail, puis fermeture explicite par croix ;
- validation de la visibilité des connexions et de la cohérence des icônes ;
- validation de la netteté observable du canvas pendant le zoom ;
- fix minimal uniquement si un scénario de validation prouve un écart réel.

### Exclus

- nouvelle passe de polish UX hors critères déjà couverts par `PXP1` à `PXP4` ;
- modification des règles métier d'achat, d'oubli, de blocage ou de calcul d'état ;
- refonte du renderer PIXI au-delà d'un ajustement strictement nécessaire à un écart prouvé ;
- campagne E2E large hors contrats ciblés du canvas et de l'application.

## Fichiers pressentis

| Fichier                                                      | Rôle                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `tests/applications/specialization-tree-app.test.mjs`        | Couvrir les parcours observables clic → détail → fermeture → action     |
| `tests/applications/specialization-tree/*.test.mjs`          | Compléter les contrats ciblés de nœuds, d'icônes et d'affordances       |
| `tests/integration/specialization-tree-pixi-render.test.mjs` | Verrouiller le rendu des connexions, icônes et réglages de netteté PIXI |
| `module/applications/specialization-tree-app.mjs`            | Support d'un fix minimal si le flux UI observable diverge               |
| `module/applications/specialization-tree/pixi-tree-renderer.mjs` | Support d'un fix minimal si la netteté ou le rendu canvas divergent |
| `templates/applications/specialization-tree-app.hbs`         | Support d'un fix minimal si une affordance visible manque               |
| `styles/applications.less`                                   | Support d'un fix minimal si la lisibilité observable n'est pas tenue    |
| `lang/fr.json` / `lang/en.json`                              | Ajustement ponctuel uniquement si un libellé prouvé est ambigu          |

## Plan d'implémentation

### Étape 1 — Formaliser la matrice finale de validation observable

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/specialization-tree/*.test.mjs`

1. Regrouper les scénarios attendus par `#345` autour des 6 variantes de nœuds, de l'ouverture du détail au clic, de la fermeture par croix et de la cohérence entre état visible, icônes et action réellement possible.
2. Vérifier chaque cas au niveau du contrat observable : type actif/inactif, état acheté/disponible/indisponible, présence/absence du CTA, détail utile, fermeture explicite et absence de faux signal d'interaction.
3. Réutiliser les fixtures et helpers déjà introduits par `PXP1` à `PXP4` pour garder une validation compacte et maintenable.

**Validation visée :** la suite de tests décrit clairement la promesse UX finale du chantier sans redoubler la logique métier.

### Étape 2 — Verrouiller le canvas PIXI sur connexions, icônes et netteté

**Fichiers :** `tests/integration/specialization-tree-pixi-render.test.mjs`, `module/applications/specialization-tree/pixi-tree-renderer.mjs`

1. Ajouter des assertions ciblées sur les éléments rendus qui portent la lisibilité du canvas : visibilité des connexions, stabilité des icônes attendues et conservation du contrat de netteté pendant zoom in, zoom out et reset.
2. Vérifier que les réglages techniques introduits par `PXP4` restent cohérents avec les affordances visuelles livrées par `PXP1` à `PXP3`, sans glissement ni perte de contrôle du viewport.
3. Si la validation révèle un écart, appliquer un correctif strictement localisé au renderer ou au contrat de rendu concerné, sans élargir le scope.

**Validation visée :** le canvas reste lisible et net dans la plage de zoom supportée, avec des signaux visuels cohérents.

### Étape 3 — Fermer la non-régression transverse PXP1 → PXP4

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/specialization-tree/*.test.mjs`, `tests/integration/specialization-tree-pixi-render.test.mjs`, `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `lang/fr.json`, `lang/en.json`

1. Ajouter une couverture courte de bout en bout qui prouve que lisibilité des nœuds, détail actionnable, fermeture explicite, connexions et zoom net coexistent sans régression observable.
2. Corriger au plus près tout écart démontré par cette matrice, qu'il soit applicatif, de template, de style, de microcopy ou de rendu PIXI.
3. Éviter toute évolution hors `#345` afin que ce ticket reste un verrou de validation final et non une nouvelle tranche fonctionnelle.

**Validation visée :** `PXP5` clôt le chantier `Pixi Tree Polish` avec une couverture ciblée, lisible et bornée aux signaux utilisateur réellement observables.

## Définition de done

- [ ] Les 6 cas actif/inactif × disponible/indisponible/acheté sont couverts par une validation automatisée ciblée.
- [ ] Le clic sur nœud ouvre le détail et la croix le ferme explicitement sans ambiguïté.
- [ ] Les icônes et affordances visibles restent cohérentes avec l'action réellement permise.
- [ ] Les connexions restent lisibles sans dominer les nœuds.
- [ ] Le zoom ne réintroduit pas de flou gênant dans la plage supportée.
- [ ] Tout écart révélé par cette validation est corrigé par un fix minimal strictement borné au scénario prouvé.

# GUX6 — Plan d'implémentation : Valider lisibilité, affordances et non-régression du flux

## Contexte

Issue : [#331 — GUX6 - Valider lisibilité, affordances et non-régression du flux](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/331)

Références principales :

- `documentation/ways-of-work/plan/specialization-tree-v1/graphical-ux-refresh/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/graphical-ux-refresh/issues-checklist.md`
- `documentation/plan/character-sheet/specialization-tree/326-gux1-compacter-le-header-et-clarifier-la-sidebar-de-progression.md`
- `documentation/plan/character-sheet/specialization-tree/327-gux2-clarifier-les-etats-des-noeuds-avec-couleurs-contraste-et-pictogrammes.md`
- `documentation/plan/character-sheet/specialization-tree/328-gux3-rendre-les-connexions-et-le-hover-plus-explicites-pour-la-progression.md`
- `documentation/plan/character-sheet/specialization-tree/329-gux4-transformer-le-panneau-de-detail-en-panneau-daction-contextuelle.md`
- `documentation/plan/character-sheet/specialization-tree/330-gux5-harmoniser-microcopy-curseurs-legende-et-ambiance-visuelle.md`

GUX1 à GUX5 ont déjà défini le layout, le langage visuel, le hover contextuel, le panneau d'action et la couche de polish de surface. Le besoin de `#331` est de verrouiller, sur une matrice courte mais complète, que ces briques racontent un flux cohérent de bout en bout : les états restent lisibles, les affordances visibles correspondent bien aux actions réellement possibles, et aucune régression observable n'a été introduite sur achat, oubli, hover, microcopy ou curseurs.

## Objectif

Sécuriser le flux UX de l'arbre de spécialisation avec une couverture ciblée des cas clés et une passe de correction minimale strictement limitée aux écarts prouvés par cette validation.

## Périmètre

### Inclus

- validation des états `purchased`, `available`, `locked` et `invalid` ;
- validation du hover contextuel, du panneau d'action et de la légende ;
- validation de la cohérence entre action réelle, microcopy visible et curseur exposé ;
- couverture de non-régression sur le flux achat / oubli déjà livré ;
- fix minimal uniquement si la validation révèle un écart observable.

### Exclus

- nouvelle évolution UX hors critères déjà cadrés par GUX1 à GUX5 ;
- refonte métier des règles d'achat, d'oubli ou de progression ;
- campagne E2E large ou validation cross-feature hors vue `SpecializationTreeApp` ;
- changements décoratifs non justifiés par un écart prouvé pendant la validation.

## Fichiers pressentis

| Fichier                                               | Rôle                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `tests/applications/specialization-tree-app.test.mjs` | Couvrir la matrice UX observable de bout en bout sur l'application           |
| `tests/applications/specialization-tree/*.test.mjs`   | Compléter les contrats ciblés de view-model et d'affordances si nécessaire   |
| `module/applications/specialization-tree-app.mjs`     | Support d'un fix minimal si la validation prouve un écart de contexte UI     |
| `templates/applications/specialization-tree-app.hbs`  | Support d'un fix minimal si un écart de rendu ou d'affordance est observé    |
| `styles/applications.less`                            | Support d'un fix minimal si la cohérence visuelle ou curseur est en défaut   |
| `lang/fr.json`                                        | Ajuster la microcopy FR uniquement si un libellé prouvé est ambigu ou erroné |
| `lang/en.json`                                        | Ajuster la microcopy EN uniquement si un libellé prouvé est ambigu ou erroné |

## Plan d'implémentation

### Étape 1 — Formaliser la matrice de validation UX observable

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/specialization-tree/*.test.mjs`

1. Regrouper les scénarios attendus par `#331` autour des cas explicitement listés dans le cadrage projet : nœud acheté, achetable, verrouillé, invalide, hover contextuel, panneau d'action, microcopy des modales et cohérence curseur / action.
2. Vérifier chaque scénario au niveau du contrat observable, sans tester le rendu PIXI fin : état exposé, CTA présent ou absent, raison de blocage, description utile, légende visible et affordance cohérente.
3. Réutiliser autant que possible les fixtures et helpers existants issus de GUX1 à GUX5 pour garder une couverture compacte, lisible et maintenable.

**Validation visée :** la suite de tests décrit clairement le flux UX attendu sans dupliquer la logique métier déjà portée ailleurs.

### Étape 2 — Verrouiller la cohérence action / microcopy / affordance

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `lang/fr.json`, `lang/en.json`

1. Ajouter des assertions ciblées qui prouvent qu'un nœud actionnable expose le bon verbe, le bon curseur et le bon point d'entrée d'action, tandis qu'un nœud non actionnable reste informatif sans faux CTA.
2. Couvrir explicitement la continuité entre hover, panneau d'action et modales pour éviter les divergences de vocabulaire ou d'intention selon le point d'entrée.
3. Si la validation met en évidence un écart, le corriger au plus près du contrat concerné, sans élargir le scope au-delà de l'observable prouvé par le scénario en échec.

**Validation visée :** aucun état visible ne promet une action absente, et aucune action possible n'est masquée par une affordance incohérente.

### Étape 3 — Fermer la non-régression du flux complet GUX1 → GUX5

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/specialization-tree/*.test.mjs`

1. Vérifier que la densité d'information, les états visuels, le hover, le panneau d'action et le polish de surface coexistent sans casser les comportements déjà livrés.
2. Ajouter une couverture de non-régression courte sur le parcours utilisateur principal : lecture d'état, compréhension du blocage, décision via panneau, confirmation du bon verbe d'action.
3. Éviter tout ajout de cas hors matrice `#331` afin que ce ticket reste un verrou de cohérence UX final, et non une nouvelle tranche fonctionnelle.

**Validation visée :** GUX6 clôt la refresh UX en gelant les signaux observables essentiels du flux, avec un coût de maintenance faible.

## Définition de done

- [ ] Les cas `purchased`, `available`, `locked` et `invalid` sont couverts par une validation automatisée ciblée.
- [ ] Le hover contextuel, le panneau d'action et la légende restent cohérents entre eux.
- [ ] La microcopy des actions et modales est explicite et alignée sur l'action réellement permise.
- [ ] Les curseurs et affordances visibles ne créent aucun faux signal d'interaction.
- [ ] Tout écart révélé par cette validation est corrigé par un fix minimal strictement borné au scénario prouvé.

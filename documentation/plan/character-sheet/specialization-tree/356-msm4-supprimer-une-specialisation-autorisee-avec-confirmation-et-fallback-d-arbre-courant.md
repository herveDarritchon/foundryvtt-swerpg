## MSM4 — Supprimer une spécialisation autorisée avec confirmation et fallback d'arbre courant

### Contexte

Issue : [#356 — MSM4 - Supprimer une spécialisation autorisée avec confirmation et fallback d'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/356)

Parent : [#352 — Multi-Specialization Management - Gérer ajout, synthèse et suppression des spécialisations](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/352)

Dépendances :

- [#353 — MSM1 - Stabiliser le contrat métier des spécialisations et de l'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/353)
- [#354 — MSM2 - Résumer les spécialisations dans le header et ouvrir la gestion](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/354)
- [#355 — MSM3 - Acheter une spécialisation avec coût prévisualisé et blocages explicites](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/355)

Après MSM1 à MSM3, le personnage peut résumer, ouvrir et enrichir ses spécialisations, mais il manque encore un flux de suppression contrôlé. Le besoin de `#356` est d'autoriser uniquement les suppressions métier valides, de demander une confirmation avant mutation destructive, puis de recalculer proprement l'arbre courant si la spécialisation supprimée était celle affichée.

### Objectif

Ajouter dans la gestion multi-spécialisations un flux de suppression sûr et localisé, fondé sur le contrat canonique `ownedSpecializations`, qui ne laisse jamais `selectedSpecializationTree` / `#selectedTreeKey` pointer vers un arbre supprimé.

### Périmètre

#### Inclus

- évaluation métier d'une suppression autorisée ou bloquée ;
- confirmation utilisateur avant persistance ;
- persistance de la liste des spécialisations restantes ;
- fallback de l'arbre courant vers une spécialisation encore possédée, ou vers l'état vide si aucun arbre exploitable ne reste ;
- messages et libellés FR/EN du flux ;
- couverture unitaire et applicative du scénario.

#### Exclus

- refonte du flux d'achat MSM3 ;
- refonte large du layout de `SpecializationTreeApp` hors affordance minimale de suppression ;
- évolution des règles de coût d'acquisition déjà cadrées par MSM1/MSM3.

### Fichiers pressentis

| Fichier                                                      | Rôle                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `module/lib/specializations/owned-specializations.mjs`       | Réutiliser le contrat canonique et exposer les helpers de retrait          |
| `module/lib/specializations/specialization-removal-flow.mjs` | Nouveau service pur de validation, preview et résultat de suppression      |
| `module/models/character.mjs`                                | Introduire le point d'entrée dédié à la suppression post-création          |
| `module/applications/specialization-tree-app.mjs`            | Brancher l'action de suppression, la confirmation et le fallback UI        |
| `templates/applications/specialization-tree-app.hbs`         | Exposer l'action utilisateur de suppression sur une spécialisation gérable |
| `lang/en.json` / `lang/fr.json`                              | Ajouter confirmation, warnings et libellés du flux                         |
| `tests/lib/specializations/*.test.mjs`                       | Couvrir validation, blocages et calcul du fallback métier                  |
| `tests/models/character-specializations.test.mjs`            | Verrouiller le patch persistant produit par le flux                        |
| `tests/applications/specialization-tree-app.test.mjs`        | Vérifier confirmation, annulation et recalage de l'arbre courant           |

### Plan d'implémentation

#### Étape 1 — Formaliser le contrat métier de suppression et de fallback

**Fichiers :** `module/lib/specializations/specialization-removal-flow.mjs`,
`module/lib/specializations/owned-specializations.mjs`

1. Introduire un service pur recevant l'acteur, la spécialisation ciblée et le snapshot canonique des spécialisations possédées.
2. Y centraliser la décision `allowed` / `blocked` avec une `reasonCode` stable, sans dépendre de l'état UI courant.
3. Retourner un résultat réutilisable par l'UI avec au minimum : spécialisation ciblée, autorisation, raison éventuelle, payload de confirmation, patch métier attendu et indication de fallback pour l'arbre courant.
4. Définir explicitement la règle : si la spécialisation supprimée correspond à l'arbre courant, sélectionner une spécialisation encore possédée via le mécanisme de fallback existant ; sinon conserver la sélection actuelle.

#### Étape 2 — Brancher la suppression confirmée dans `SpecializationTreeApp`

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`,
`module/models/character.mjs`

1. Exposer une action de suppression uniquement sur les spécialisations gérables par le contrat métier.
2. Au clic, demander le résultat du service métier : notifier immédiatement les cas bloqués, sinon ouvrir une confirmation `DialogV2` localisée.
3. Après confirmation, persister la suppression via un point d'entrée acteur dédié plutôt qu'une mutation UI ad hoc.
4. Recaler `#selectedTreeKey` / le contexte rendu après update : conserver l'arbre courant s'il est toujours valide, sinon appliquer le fallback calculé, et afficher l'état vide si aucune spécialisation exploitable ne reste.

#### Étape 3 — Ajouter les messages i18n et verrouiller les scénarios nominaux et dégradés

**Fichiers :** `lang/en.json`, `lang/fr.json`, `tests/lib/specializations/*.test.mjs`,
`tests/models/character-specializations.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Ajouter les clés FR/EN pour les raisons de blocage, le titre/contenu de confirmation et les retours utilisateur du flux.
2. Couvrir le service métier sur les cas : suppression autorisée hors arbre courant, suppression autorisée de l'arbre courant avec fallback, suppression bloquée, annulation sans mutation.
3. Ajouter des tests applicatifs garantissant qu'aucune clé d'arbre supprimé ne reste sélectionnée après rerender et que le comportement d'état vide reste propre si aucun arbre n'est sélectionnable.
4. Verrouiller côté modèle que le patch persistant ne modifie que les données attendues du contrat de spécialisations et de sélection courante.

### Définition de done

- [ ] Une spécialisation supprimable demande une confirmation avant toute mutation.
- [ ] Une suppression bloquée est refusée avec un message explicite et localisé.
- [ ] Après confirmation, la spécialisation est retirée de `ownedSpecializations` sans laisser de sélection d'arbre orpheline.
- [ ] Si l'arbre courant est supprimé, l'application retombe sur une spécialisation encore possédée ou sur l'état vide existant.
- [ ] Après annulation, aucune donnée acteur ni sélection UI n'est modifiée.
- [ ] Les tests couvrent le flux métier, la persistance et le fallback de l'arbre courant.

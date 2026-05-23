## MSM5 — Valider coûts, états UI et non-régression multi-spécialisation

### Contexte

Issue : [#357 — MSM5 - Valider coûts, états UI et non-régression multi-spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/357)

Parent : [#352 — Multi-Specialization Management - Gérer ajout, synthèse et suppression des spécialisations](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/352)

Dépendances terminées :

- [#354 — MSM2 - Résumer les spécialisations dans le header et ouvrir la gestion](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/354)
- [#355 — MSM3 - Acheter une spécialisation avec coût prévisualisé et blocages explicites](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/355)
- [#356 — MSM4 - Supprimer une spécialisation autorisée avec confirmation et fallback d'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/356)

Cette issue sert à verrouiller la V1 multi-spécialisation par des tests ciblés : matrice de coûts, états de header, flux
d'achat, flux de suppression et non-régressions métier/UI. Le besoin explicite est de rester sur Vitest, sans E2E.

### Objectif

Compléter la couverture unitaire, applicative et d'intégration légère pour garantir que les règles MSM1 à MSM4 restent
stables sur le flux complet `achat → header → suppression → header`, sans modifier le comportement métier au-delà des
écarts prouvés par les tests.

### Périmètre

#### Inclus

- validation de la matrice de coûts carrière / hors carrière ;
- validation des états de header pour `0`, `1`, `2`, `3` spécialisations ;
- validation des cas bloquants d'achat : doublon, XP insuffisante, arbre non résolu ;
- validation des cas de suppression : autorisée, initiale bloquée, talents bloqués, confirmation, fallback ;
- non-régressions : aucun remboursement XP, `career` inchangé, `selectedSpecializationTree` limité au contexte UI ;
- scénario d'intégration couvrant le flux complet côté acteur + UI.

#### Exclus

- ajout de nouvelle fonctionnalité hors checklist de l'issue ;
- tests E2E / Playwright ;
- refactor large des services MSM1 à MSM4 sans défaut démontré.

### Fichiers pressentis

| Fichier | Rôle |
|---|---|
| `tests/lib/specializations/specialization-cost-service.test.mjs` | Verrouiller la matrice de coûts `0→1`, `1→2`, `2→3`, carrière / hors carrière / universelle |
| `tests/lib/specializations/specialization-purchase-flow.test.mjs` | Couvrir décisions d'achat, doublons, XP insuffisante et refus avant mutation |
| `tests/lib/specializations/specialization-removal-flow.test.mjs` | Couvrir autorisation, blocages et fallback de sélection après suppression |
| `tests/models/character-specializations.test.mjs` | Verrouiller les patches persistés : ajout, suppression, absence de remboursement XP, `career` inchangé |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | Valider les états du header et le rafraîchissement après évolution des spécialisations |
| `tests/applications/specialization-tree-app.test.mjs` | Valider confirmation, refus, suppression et recalage de l'arbre courant côté app |
| `tests/integration/multi-specialization-flow.test.mjs` | Scénario complet achat → header → suppression → header sans régression croisée |

### Plan d'implémentation

#### Étape 1 — Verrouiller les contrats métier purs et les patches persistés

**Fichiers :** `tests/lib/specializations/specialization-cost-service.test.mjs`,
`tests/lib/specializations/specialization-purchase-flow.test.mjs`,
`tests/lib/specializations/specialization-removal-flow.test.mjs`, `tests/models/character-specializations.test.mjs`

1. Ajouter une matrice explicite des coûts : `0→1 = 0 XP`, `1→2 carrière = 20 XP`, `1→2 hors carrière = 30 XP`, `2→3 carrière = 30 XP`, `2→3 hors carrière = 40 XP`.
2. Couvrir les décisions d'achat bloquées et nominales avec assertions sur le résultat métier, pas seulement sur le message.
3. Couvrir les règles de suppression et de fallback, y compris l'absence de remboursement XP et la non-mutation de `career`.

#### Étape 2 — Compléter les scénarios UI ciblés sur le header et la suppression

**Fichiers :** `tests/applications/sheets/character-sheet-talents.test.mjs`,
`tests/applications/specialization-tree-app.test.mjs`

1. Ajouter les cas de header `0 / 1 / 2 / 3` spécialisations : libellé, badge `+N`, tooltip des spécialisations additionnelles.
2. Vérifier les retours UI des cas bloquants d'achat et de suppression : message affiché, confirmation demandée seulement quand attendu, aucune mutation après annulation.
3. Verrouiller que la suppression de l'arbre actif recale uniquement la sélection UI et ne transforme jamais `selectedSpecializationTree` en source de vérité métier.

#### Étape 3 — Ajouter une non-régression du flux complet multi-spécialisation

**Fichiers :** `tests/integration/multi-specialization-flow.test.mjs`, avec appui éventuel sur les fixtures existantes des tests applicatifs

1. Simuler un parcours complet : état initial, ajout d'une spécialisation carrière ou hors carrière, contrôle du header, suppression autorisée, puis nouvel état du header.
2. Asserter dans le même scénario les invariants demandés par l'issue : coût correct, XP décrémentée à l'achat uniquement, pas de remboursement à la suppression, `career` inchangé.
3. Couvrir le cas où l'arbre supprimé était l'arbre courant afin de verrouiller le fallback et l'absence de régression inter-modules.

### Définition de done

- [ ] Les tests couvrent les coûts carrière / hors carrière attendus par MSM1/MSM3.
- [ ] Les tests couvrent les états de header `0`, `1`, `2`, `3` spécialisations attendus par MSM2.
- [ ] Les tests couvrent les blocages, confirmations et fallback attendus par MSM3/MSM4.
- [ ] Une non-régression explicite garantit : pas de remboursement XP, `career` inchangé, `selectedSpecializationTree` UI uniquement.
- [ ] Un scénario d'intégration valide le flux complet `achat → header → suppression → header` sans E2E.

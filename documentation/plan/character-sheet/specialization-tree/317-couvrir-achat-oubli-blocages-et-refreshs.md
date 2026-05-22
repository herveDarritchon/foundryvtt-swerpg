# US17.7 — Plan d'implémentation : Couvrir achat, oubli, blocages et refreshs

## Contexte

Issue : [#317 — US17.7 - Couvrir achat, oubli, blocages et refreshs](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/317)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/issues-checklist.md`
- `documentation/plan/character-sheet/specialization-tree/312-stabiliser-la-persistance-acteur-et-limpact-xp.md`
- `documentation/plan/character-sheet/specialization-tree/313-exposer-un-view-model-de-noeud-actionnable.md`
- `documentation/plan/character-sheet/specialization-tree/314-brancher-les-interactions-ui-et-confirmations-dans-specialization-tree-app.md`
- `documentation/plan/character-sheet/specialization-tree/315-synchroniser-l-arbre-et-l-onglet-talents-apres-update-acteur.md`

US17.2 à US17.5 posent déjà les briques domaine, UI et refresh. US17.7 clôt la tranche en verrouillant une matrice de non-régression courte mais complète sur le flux achat/oubli, les refus métier visibles et la synchronisation des vues après mutation.

## Objectif

Ajouter une couverture de tests ciblée qui sécurise le parcours complet depuis l'action sur un nœud jusqu'au refresh de l'arbre et de l'onglet Talents, sans réintroduire de logique métier dupliquée ni laisser de régression silencieuse sur les blocages clés.

## Périmètre

### Inclus

- achat nominal d'un nœud disponible ;
- refus pour XP insuffisante, nœud déjà acheté et arbre non résolu ;
- oubli refusé quand des dépendants achetés bloquent la chaîne ;
- garde de permission côté UI avant mutation ;
- refresh de l'arbre après `actor.update()` pertinent ;
- refresh de l'onglet Talents sur l'état acteur recalculé.

### Exclus

- nouvelles règles métier d'achat/oubli ;
- extension du périmètre audit log (`US17.6`) ;
- campagne E2E Playwright ou refonte UX/CSS ;
- corrections source sans lien direct avec un scénario prouvé par les tests ciblés.

## Fichiers pressentis

| Fichier                                                                      | Rôle                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `tests/lib/talent-node/talent-node-progression.test.mjs`                     | Verrouiller les refus métier et la cohérence du résultat central      |
| `tests/lib/talent-node/talent-node-purchase.test.mjs`                        | Garder le scénario nominal d'achat et ses effets observables          |
| `tests/lib/talent-node/talent-node-forget.test.mjs`                          | Couvrir l'oubli nominal et les blocages par dépendants                |
| `tests/lib/talent-node/talent-node-persistence.test.mjs`                     | Vérifier le patch acteur/XP appliqué au bon moment                    |
| `tests/applications/specialization-tree/actionable-node-view-model.test.mjs` | Verrouiller le contrat UI des nœuds actionnables et bloqués           |
| `tests/applications/specialization-tree-app.test.mjs`                        | Cibler permissions, déclenchement d'action et refresh arbre           |
| `tests/applications/sheets/character-sheet-talents.test.mjs`                 | Vérifier le réalignement de la vue Talents après update acteur        |
| `module/lib/talent-node/*.mjs`                                               | Support d'un fix minimal si un test prouve une divergence métier      |
| `module/applications/specialization-tree-app.mjs`                            | Support d'un fix minimal si un test prouve une divergence applicative |
| `module/documents/actor.mjs`                                                 | Support d'un fix minimal si le déclenchement de refresh est incomplet |

## Plan d'implémentation

### Étape 1 — Fermer la matrice métier achat / oubli / blocages

**Fichiers :** `tests/lib/talent-node/talent-node-progression.test.mjs`, `tests/lib/talent-node/talent-node-purchase.test.mjs`, `tests/lib/talent-node/talent-node-forget.test.mjs`, `tests/lib/talent-node/talent-node-persistence.test.mjs`

1. Ajouter les cas demandés par l'issue sur le contrat domaine : achat nominal, XP insuffisante, nœud déjà acheté, arbre non résolu et oubli bloqué par dépendants.
2. Vérifier pour chaque refus la présence d'un `reasonCode` stable et l'absence d'effet de bord non attendu sur `actor.update()`.
3. Verrouiller le patch de persistance/XP sur les seuls scénarios qui réussissent réellement.

### Étape 2 — Sécuriser le contrat UI et les garde-fous de mutation

**Fichiers :** `tests/applications/specialization-tree/actionable-node-view-model.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Couvrir la projection UI minimale des états utiles : nœud achetable, oubliable, bloqué et non actionnable.
2. Ajouter les scénarios applicatifs où l'utilisateur n'a pas la permission de muter l'acteur et vérifier qu'aucun service métier n'est appelé.
3. Vérifier que les blocages métier remontent proprement jusqu'à l'application sans bypass du view-model ni mutation parasite.

### Étape 3 — Verrouiller les refreshs arbre + onglet Talents après update acteur

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

1. Simuler un `actor.update()` pertinent après achat ou oubli et vérifier que l'arbre ouvert se réaligne sur l'état acteur mis à jour.
2. Vérifier que le refresh arbre conserve le viewport/état de consultation utile et ne se déclenche pas sur des updates hors périmètre.
3. Vérifier que l'onglet Talents se reconstruit depuis les données fraîches de l'acteur immédiatement après la mutation.

## Définition de done

- [ ] Les scénarios listés dans l'issue sont couverts par des tests unitaires/intégration ciblés.
- [ ] Les refus métier critiques retournent un signal exploitable sans mutation parasite.
- [ ] Les permissions UI empêchent toute mutation non autorisée.
- [ ] L'arbre et l'onglet Talents se rafraîchissent correctement après update acteur pertinent.
- [ ] Tout écart révélé par cette couverture est corrigé par un fix minimal strictement limité au scénario prouvé.

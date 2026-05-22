# US17.6 — Plan d'implémentation : Émettre les événements d'audit log d'achat et d'oubli

## Contexte

Issue : [#316 — US17.6 - Émettre les événements d'audit log d'achat et d'oubli](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/316)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/issues-checklist.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-amelioration-achat-oubli-talent-arbre-specialisation.md`
- `documentation/plan/character-sheet/specialization-tree/311-creer-le-service-metier-dachat-et-doubli-de-noeud.md`
- `documentation/plan/character-sheet/specialization-tree/312-stabiliser-la-persistance-acteur-et-limpact-xp.md`

L'existant dispose déjà d'un bridge d'audit non bloquant pour le succès d'achat (`recordTalentNodePurchase`) et d'une UI de lecture du journal, mais l'oubli n'émet rien et la taxonomie actuelle n'est pas encore alignée sur le cadrage US17.6 (`requested` / `succeeded` / `failed`).

## Objectif

Émettre des événements d'audit cohérents pour les flux d'achat et d'oubli de nœud de talent, avec un payload métier minimal utile et une garantie forte que toute erreur d'écriture d'audit reste non bloquante pour l'action utilisateur.

## Périmètre

### Inclus

- alignement de la taxonomie des événements d'audit pour achat et oubli ;
- payload minimal commun : acteur, spécialisation, arbre, nœud, talent, coût XP, XP avant/après si disponible, raison d'échec éventuelle, utilisateur ;
- branchement symétrique des flux `purchase` et `forget` sur le bridge d'audit ;
- conservation du caractère non bloquant de l'audit ;
- exposition lisible des nouveaux types dans l'application de consultation du journal ;
- tests ciblés sur succès, refus métier et échec d'écriture d'audit.

### Exclus

- refonte de l'infrastructure AOP générique du journal d'évolution ;
- fusion/corrélation transverse entre entrées d'audit distinctes ;
- campagne complète de non-régression du flux achat/oubli (`US17.7`) ;
- changements UI de l'arbre hors messages déjà produits par les flux métier.

## Fichiers pressentis

| Fichier                                               | Rôle                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `module/utils/audit-log.mjs`                          | Centraliser le bridge d'audit des opérations de nœud et garantir le mode non bloquant |
| `module/lib/talent-node/talent-node-purchase.mjs`     | Émettre les événements d'audit du flux d'achat aux bons moments                       |
| `module/lib/talent-node/talent-node-forget.mjs`       | Ajouter l'émission symétrique d'audit pour l'oubli                                    |
| `module/applications/character-audit-log.mjs`         | Mapper les nouveaux types d'événements vers familles, labels et descriptions          |
| `lang/fr.json`                                        | Ajouter les libellés/descriptions FR des nouveaux événements                          |
| `lang/en.json`                                        | Ajouter les libellés/descriptions EN des nouveaux événements                          |
| `tests/utils/audit-log.test.mjs`                      | Verrouiller le contrat des entrées d'audit de nœud                                    |
| `tests/lib/talent-node/talent-node-purchase.test.mjs` | Vérifier les émissions d'audit achat et leur non-régression                           |
| `tests/lib/talent-node/talent-node-forget.test.mjs`   | Vérifier les émissions d'audit oubli et le caractère non bloquant                     |
| `tests/applications/character-audit-log.test.mjs`     | Vérifier le rendu lisible des nouveaux types                                          |

## Plan d'implémentation

### Étape 1 — Canoniser le contrat d'événement d'audit des nœuds

**Fichiers :** `module/utils/audit-log.mjs`, `module/applications/character-audit-log.mjs`, `lang/fr.json`, `lang/en.json`

1. Choisir une taxonomie canonique alignée sur le cadrage US17.6 pour distinguer achat/oubli et statut (`requested`, `succeeded`, `failed`), tout en traitant explicitement le cas du type déjà existant `talent-node-purchase`.
2. Définir un payload commun et stable pour les opérations de nœud afin d'éviter deux formats divergents entre achat et oubli.
3. Préparer le mapping UI/i18n minimal pour que chaque nouveau type reste lisible dans le journal sans fallback `unknown`.

### Étape 2 — Brancher achat et oubli sur un bridge d'audit symétrique et non bloquant

**Fichiers :** `module/utils/audit-log.mjs`, `module/lib/talent-node/talent-node-purchase.mjs`, `module/lib/talent-node/talent-node-forget.mjs`

1. Remplacer le bridge achat spécialisé par un point d'entrée partagé capable d'enregistrer les événements pertinents pour `purchase` et `forget`.
2. Émettre les événements au bon niveau du flux : demande reçue, succès après persistance, échec métier/persistance avec `reasonCode` exploitable quand l'action échoue.
3. Conserver la règle absolue de non-blocage : tout échec d'écriture d'audit est capturé, journalisé, et n'altère jamais le résultat métier retourné à l'appelant.

### Étape 3 — Verrouiller le comportement observable par des tests ciblés

**Fichiers :** `tests/utils/audit-log.test.mjs`, `tests/lib/talent-node/talent-node-purchase.test.mjs`, `tests/lib/talent-node/talent-node-forget.test.mjs`, `tests/applications/character-audit-log.test.mjs`

1. Ajouter des cas nominaux achat/oubli couvrant le type émis et le payload minimal attendu.
2. Couvrir les refus métier clés pour vérifier qu'un événement d'échec exploitable est bien produit sans `actor.update()` parasite.
3. Vérifier que les nouveaux types sont correctement classés dans la famille `talents`, décrits par l'UI d'audit, et qu'une panne d'audit reste strictement non bloquante.

## Définition de done

- [ ] Les flux `purchase` et `forget` émettent des événements d'audit cohérents et symétriques.
- [ ] Le payload d'audit expose les identifiants métier utiles, le coût XP, l'XP avant/après quand disponible et la raison d'échec si applicable.
- [ ] Les erreurs d'écriture d'audit ne bloquent jamais l'achat ni l'oubli.
- [ ] L'application de consultation du journal affiche les nouveaux types sans fallback générique.
- [ ] Les tests ciblés couvrent succès, refus métier et non-blocage de l'audit.

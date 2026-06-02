# Market — Corriger le calcul de crédits en mode vente (économie cassée)

**Issue** : [#535 — Market — Corriger le calcul de crédits en mode vente (économie cassée)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/535)

## Objectif

Empêcher la vente d’un item de gonfler artificiellement le budget disponible en distinguant correctement la valeur persistée `system.credits` (manual adjustment) de la valeur dérivée `creditBudget.availableCredits`.

## Décisions de cadrage

- La base de calcul persistée doit être `seller.system._source?.credits`, avec repli sur `seller.system?.credits ?? 0` si nécessaire.
- Le montant écrit après vente doit être `manualAdjustmentAvant + resalePrice - basePrice` pour neutraliser le remboursement automatique de `totalSpent` causé par la suppression de l’item.
- Les feedbacks métier (`remaining`, audit log, notification) doivent continuer à exprimer le **disponible dérivé** après vente, soit `availableBefore + resalePrice`.

## Étapes d’implémentation

### 1. Corriger le calcul persistant dans le flow `sellItem`

**Fichiers cibles** : `module/applications/market/market-application.mjs`

**What**

- séparer explicitement `availableCreditsBefore` (affichage + invariant métier) de `manualAdjustmentBefore` (valeur persistée) ;
- après `deleteEmbeddedDocuments`, calculer la nouvelle valeur de `system.credits` avec la formule compensée au lieu de réinjecter `availableCredits` ;
- conserver une variable dédiée `availableCreditsAfter = availableCreditsBefore + resalePrice` pour la notification de succès, le log et la donnée transmise à l’audit.

**Validation visée** : vendre un item de base 100 avec une revente à 25 n’augmente le disponible que de 25, sans gonfler le budget total.

### 2. Verrouiller la régression par des tests ciblés

**Fichiers cibles** : `tests/applications/market/market-application.test.mjs`, éventuellement `tests/utils/audit-log.test.mjs`

**What**

- adapter le test de vente existant pour vérifier que `actor.update()` reçoit la formule compensée, et non `availableCredits + resalePrice` ;
- ajouter un cas où `creditBudget.availableCredits` et `system._source.credits` divergent pour reproduire le bug historique ;
- vérifier l’invariant demandé par l’issue : `availableAfter = availableBefore + resalePrice`, y compris dans la valeur `creditsAfter` utilisée pour le feedback métier.

**Validation visée** : la suite ciblée couvre le cas nominal, le cas avec budget dérivé ≠ valeur persistée, et l’invariant de non-régression demandé par l’issue.

## Résultat attendu

- `system.credits` n’est plus alimenté depuis une valeur dérivée.
- La suppression de l’item ne provoque plus de double remboursement implicite.
- Le disponible du personnage augmente uniquement du montant réel de revente.

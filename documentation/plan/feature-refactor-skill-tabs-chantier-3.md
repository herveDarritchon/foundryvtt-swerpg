# Chantier 3 — Enrichissement des données de préparation

## Objectif
Fournir à la template tous les champs calculés nécessaires (prochain coût, état d'achat, raison).

## Fichiers probablement concernés
- `module/applications/sheets/character-sheet.mjs` (méthode `#prepareSkills`)

## Travail à faire
1. Dans `#prepareSkills()`, après avoir calculé `pips` et `freeRank`, enrichir chaque skill avec :
   - `nextRank`
   - `nextCost`
   - `canPurchase`
   - `isFreePurchase`
   - `purchaseReason`
2. Utiliser les fonctions du Chantier 2.

## Critères d'acceptation
- La structure de données retournée par `#prepareSkills()` contient les nouveaux champs.
- Aucune modification de template à ce stade.

## Risques / points de vigilance
Modification de la couche de préparation. Faire un diff pour vérifier que les données existantes (pips, freeRank) ne sont pas altérées.

## Commande de test ou vérification manuelle
Aucune (pas de changement visuel encore). Vérifier dans la console du navigateur que les données passées au template sont correctes.

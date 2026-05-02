# Chantier 2 — Fonctions pures de calcul (coût, état, preview dés)

## Objectif
Créer les fonctions de calcul réutilisables sans effet de bord, faciles à tester.

## Fichiers probablement concernés
- Créer `module/utils/skill-costs.mjs` (ou ajouter dans `character-sheet.mjs`)

## Travail à faire
1. `getSkillNextRankCost({ rank, isCareer, maxRank = 5 })`
2. `getSkillPurchaseState({ rank, isCareer, isSpecialization, availableXp, freeCareerSkillsLeft, freeSpecializationSkillsLeft, maxRank })`
3. `getPositiveDicePoolPreview({ characteristicValue, skillRank })`

## Critères d'acceptation
- Les fonctions sont pures, documentées, et retournent des structures prévisibles.
- Tests unitaires (Vitest) si le projet en possède.

## Risques / points de vigilance
Aucun risque visuel (pas de template modifié). Vérifier que la règle FFG correspond à la logique existante dans le système.

## Commande de test ou vérification manuelle
```bash
npx vitest run --reporter=verbose
```
(si Vitest configuré)

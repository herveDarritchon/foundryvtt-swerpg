# Chantier 6 — Interaction utilisateur (survol, clic, notifications)

## Objectif
Gérer le survol pour prévisualiser l'achat et le clic pour exécuter l'achat avec validation.

## Fichiers probablement concernés
- `module/applications/sheets/character-sheet.mjs` (ajouter gestionnaires d'événements)
- `templates/sheets/partials/character-skill.hbs` (ajouter `mouseenter`/`mouseleave`)
- `templates/sheets/actor/skills.hbs` (mettre à jour la console au survol)

## Travail à faire
1. Ajouter un événement `mouseenter` sur `.skill` pour mettre à jour la console XP (afficher `nextRank`, `nextCost`, `Status`).
2. Modifier `toggleTrainedSkill` pour :
   - Vérifier `canPurchase` avant d'appliquer le changement.
   - Décrémenter l'XP ou le compteur gratuit selon `isFreePurchase`.
   - Afficher une notification si achat impossible.
3. Utiliser `ui.notifications.warn()` ou `error()` pour les messages d'erreur.

## Critères d'acceptation
- Au survol d'une compétence, la console affiche les détails de l'achat.
- Le clic sur un pip achète le rang si possible, sinon affiche une erreur.
- Les XP sont correctement décrémentées (achat payant) ou le compteur gratuit (achat gratuit).

## Risques / points de vigilance
Risque plus élevé car on modifie la logique d'achat. Tester avec différents scénarios (XP insuffisante, rang max, achat gratuit).

## Commande de test ou vérification manuelle
Tester les cas listés dans le plan (Phase 9.2) : XP suffisante, XP insuffisante, rang max, achat gratuit carrière/spécialisation.

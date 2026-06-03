# Issue #537 — Market : brancher `NegotiationDialog` sur un vrai `StandardCheck` (supprimer la saisie manuelle)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/537  
**Domaine métier** : `market`

## Goal

Supprimer la saisie manuelle des résultats de négociation dans `NegotiationDialog` et la remplacer par un vrai lancer `StandardCheck`, afin de préserver l'intégrité économique du Market tout en gardant le contrat de résultat déjà consommé par les flux d'achat et de vente.

## Contexte utile

- `module/applications/market/negotiation-dialog.mjs` repose aujourd'hui sur `successRanks` et `isDisaster` saisis à la main dans le formulaire.
- `module/applications/market/availability-check-dialog.mjs` montre déjà le pattern cible : construire un `StandardCheck`, ouvrir le dialogue de roll réel, puis dériver un résultat applicatif.
- `module/lib/market/negotiation.mjs` porte déjà la logique pure de pricing (`computeNegotiatedPrice`, `rarityToDifficulty`) ; le bug est surtout un problème d'orchestration UI et de dérivation du résultat du jet.
- `tests/applications/market/negotiation-dialog.test.mjs` reste aujourd'hui centré sur `mapOutcomeToSale` ; il manque une couverture sur le vrai flux de roll.

## Plan d'implémentation

### Étape 1 — Remplacer l'état manuel par un état dérivé d'un vrai roll

**Fichiers** : `module/applications/market/negotiation-dialog.mjs`, `module/lib/market/negotiation.mjs` _(si un helper partagé de dérivation devient utile)_

**What** :

- Introduire dans `NegotiationDialog` un état de roll négocié (roll exécuté + résultat dérivé) au lieu de piloter le calcul depuis des champs saisis manuellement.
- Réutiliser `StandardCheck` avec la compétence sélectionnée, la caractéristique de l'acteur, et une difficulté dérivée de `rarityToDifficulty`, sur le modèle déjà utilisé par `AvailabilityCheckDialog`.
- Dériver ensuite les données métier attendues par le pricing : `successRanks` depuis l'écart au `dc` et `isDisaster` depuis l'état critique du roll, tout en conservant le shape final `{ confirmed, finalPrice, outcome, successRanks }`.

**Résultat attendu** : `NegotiationDialog` ne dépend plus d'une auto-déclaration utilisateur et fournit toujours le même contrat de sortie aux appels Market existants.

### Étape 2 — Refaire l'UX du dialog autour d'une action de roll réelle

**Fichiers** : `templates/market/negotiation-dialog.hbs`, `module/applications/market/negotiation-dialog.mjs`, `lang/en.json`, `lang/fr.json`

**What** :

- Supprimer les contrôles manuels `successRanks` / `isDisaster` du template.
- Garder la sélection de compétence, ajouter une action explicite pour lancer le test, puis afficher l'état/résultat réel du jet et le prix recalculé en achat comme en vente.
- Adapter les libellés i18n si nécessaire (appel à l'action, état du jet, consigne avant confirmation) sans changer les clés déjà utilisées par le flux existant lorsqu'elles restent valides.

**Résultat attendu** : l'utilisateur lance un vrai test de négociation depuis le dialog, voit son résultat appliqué au prix, puis confirme l'achat/la vente sans pouvoir éditer manuellement l'issue du jet.

### Étape 3 — Verrouiller la dérivation du roll et la non-régression du contrat

**Fichiers** : `tests/applications/market/negotiation-dialog.test.mjs`, `tests/applications/market/market-application.test.mjs` _(si une vérification d'intégration légère est nécessaire)_

**What** :

- Ajouter des tests sur le flux réel du dialog : annulation du roll, succès simple, échec, désastre/critical failure, et triomphe côté vente.
- Vérifier que la dérivation `roll -> successRanks/isDisaster/outcome/finalPrice` reste cohérente en mode achat et en mode vente.
- Protéger le contrat public de `NegotiationDialog.prompt()` pour éviter toute régression dans `MarketApplicationV2`, qui ne doit pas avoir à connaître les détails du roll interne.

**Résultat attendu** : la sécurité fonctionnelle du correctif est couverte par des tests ciblés sur le dialogue et le point d'intégration Market.

## Périmètre / hors périmètre

### Inclus

- Remplacement de la saisie manuelle par un `StandardCheck` réel dans `NegotiationDialog`
- Dérivation métier du résultat de roll pour le pricing achat/vente
- Ajustements UI/i18n strictement nécessaires au nouveau parcours

### Exclus

- Refonte du moteur de prix Market
- Changement des règles de rareté, de disponibilité ou du flow anti-bypass déjà traité en #536
- Refonte de `StandardCheck` ou de `StandardCheckDialog` au-delà de leur réutilisation

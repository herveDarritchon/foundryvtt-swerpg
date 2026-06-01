# Issue #526 — Market UI : rationaliser les badges (hiérarchie, déduplication, regroupement)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/526  
**Domaine métier** : `market`

## Goal

Alléger la colonne « Nom » du catalogue Market en supprimant les doublons visuels, en limitant l’affichage à un badge de statut prioritaire visible, et en regroupant les signaux narratifs secondaires sans toucher à la logique métier d’achat / négociation.

## Contexte utile

- `templates/market/market.hbs` cumule aujourd’hui dans la même cellule le badge de restriction, le groupe `.market-badges` et le bouton `Négocier`, ce qui provoque les doublons tête-de-mort / poignée-de-main signalés par l’audit UX3.
- `module/applications/market/market-application.mjs` calcule déjà les indicateurs utiles (`isRestricted`, `isBlackMarket`, `isImperialSuspicion`, `obtainability`, `isNegotiable`) mais pas encore une hiérarchie ou un regroupement de présentation.
- `styles/market.less` stylise déjà `.market-col--name`, `.market-badge` et `.market-entry__restriction-badge` ; l’audit indique qu’une refonte complète du markup n’est pas nécessaire.
- Le ticket est `HITL` : la hiérarchie finale des badges et l’iconographie regroupée doivent être validées humainement avant gel du rendu.

## Plan d’implémentation

### Étape 1 — Préparer un modèle de présentation des badges

**Fichiers** : `module/applications/market/market-application.mjs`, `templates/market/market.hbs`

**What** :

- Transformer les booléens déjà disponibles en un petit view-model de rendu qui distingue : badge prioritaire visible, signaux secondaires regroupés, et cas de déduplication.
- Encoder explicitement les règles de non-doublon : pas de seconde tête-de-mort si le statut `illegal` porte déjà l’information, pas de badge `négociable` redondant si le CTA `Négocier` est présent sur la ligne.
- Soumettre la hiérarchie retenue au point de validation HITL avant stabilisation du markup final.

**Résultat attendu** : le template reçoit des données prêtes à afficher sans logique de hiérarchie dispersée dans le Handlebars.

### Étape 2 — Simplifier le rendu dans la colonne « Nom »

**Fichiers** : `templates/market/market.hbs`

**What** :

- Remplacer l’empilement actuel par un rendu condensé : un seul badge de statut prioritaire visible, puis un regroupement unique des badges narratifs secondaires (survol unique ou cluster compact selon la décision HITL).
- Conserver les affordances existantes (`data-tooltip`, `aria-label`, `role="img"`, boutons buy / negotiate) sans modifier les actions métier de la ligne.
- Éviter toute création de colonne supplémentaire tant que la validation HITL ne l’exige pas, pour rester dans le scope minimal recommandé par l’audit.

**Résultat attendu** : la cellule nom n’est plus surchargée et les doublons visuels disparaissent sans refonte de la table.

### Étape 3 — Réajuster les styles et fermer le scope

**Fichiers** : `styles/market.less`

**What** :

- Adapter le layout de `.market-col--name` et des badges pour supporter le nouveau rendu condensé sans wrap excessif ni collision avec le nom de l’objet.
- Harmoniser le badge principal et le regroupement secondaire avec les tokens existants du Market.
- Vérifier visuellement les cas représentatifs (objet illégal + black market, objet négociable, accès immédiat / différé), puis prévoir la validation finale par `pnpm run build` et revue visuelle ciblée.

**Résultat attendu** : la hiérarchie est lisible, la colonne reste compacte, et le changement reste limité au rendu UI du Market.

## Périmètre / hors périmètre

### Inclus

- Hiérarchie et déduplication visuelle des badges du catalogue Market
- Regroupement des signaux narratifs secondaires
- Ajustements localisés de template, préparation de contexte et styles Market

### Exclus

- Toute modification de logique métier d’achat, de vente ou de négociation
- Refonte générale du tableau Market ou de ses colonnes hors besoin HITL validé
- Refonte globale du design system ou des autres écrans du système

# Issue #528 — Market UI : afficher la rareté en étoiles/pips et localiser la colonne restriction

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/528  
**Domaine métier** : `market`

## Goal

Rendre le catalogue Market plus lisible en remplaçant l’affichage brut de la rareté par un rendu visuel en étoiles/pips, et en affichant dans la colonne restriction le libellé localisé plutôt que la valeur technique, sans toucher à la logique métier d’achat / négociation.

## Contexte utile

- `templates/market/market.hbs` affiche aujourd’hui `{{entry.rarity}}` et `{{entry.restrictionLevel}}` dans les colonnes dédiées, alors que la colonne nom montre déjà un badge restriction localisé.
- `module/applications/market/market-application.mjs` prépare déjà `restrictionLabel` et la valeur numérique `rarity`, ce qui permet d’ajouter un view-model de présentation sans déplacer la logique dans Handlebars.
- `styles/market.less` ne contient aujourd’hui que des règles de largeur / alignement pour `.market-col--rarity` et `.market-col--restriction` ; un rendu en pips demandera donc seulement un ajustement CSS localisé.
- `tests/applications/market/market-application.test.mjs` est le point d’ancrage naturel pour verrouiller le rendu localisé et l’absence de régression sur le catalogue.

## Plan d’implémentation

### Étape 1 — Préparer le contrat de rendu rareté / restriction

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- Ajouter au view-model du catalogue des champs purement UI pour la rareté (`rarityDisplay` / `rarityPips` / libellé accessible) à partir de l’entier existant, avec gestion explicite des cas `0` et absence de valeur.
- Réutiliser `restrictionLabel` comme source canonique pour la colonne restriction afin de ne plus exposer les clés métier brutes (`restricted`, `military`, `illegal`, `none`).
- Conserver strictement inchangées les logiques d’obtainability, d’achat, de négociation et de badges ; seul le contrat de présentation du tableau évolue.

**Résultat attendu** : le template reçoit des données prêtes à afficher, sans calcul de présentation dispersé dans le HBS.

### Étape 2 — Rendre les étoiles/pips et localiser la colonne restriction

**Fichiers** : `templates/market/market.hbs` _(et `lang/en.json`, `lang/fr.json` seulement si une chaîne aria/tooltip manque)_

**What** :

- Remplacer l’entier brut de la colonne rareté par un rendu visuel compact en étoiles/pips, tout en conservant une information textuelle accessible via tooltip ou `aria-label`.
- Remplacer `{{entry.restrictionLevel}}` par le libellé localisé déjà préparé, avec un fallback explicite pour les objets sans restriction.
- Vérifier que le rendu reste cohérent avec le badge de restriction déjà présent dans la colonne nom, sans introduire de doublon contradictoire.

**Résultat attendu** : la table Market devient lisible sans exposer de valeurs techniques à l’utilisateur.

### Étape 3 — Ajuster le layout et verrouiller la non-régression

**Fichiers** : `styles/market.less`, `tests/applications/market/market-application.test.mjs`

**What** :

- Ajouter uniquement les hooks CSS nécessaires pour aligner les étoiles/pips dans `.market-col--rarity` et préserver la compacité de la colonne restriction.
- Étendre les tests ciblés pour couvrir : rendu visuel de la rareté, libellé de restriction localisé, cas `none`, et absence de régression sur le tri / filtrage existants du catalogue.
- Prévoir la validation finale par `pnpm test` ciblé et revue visuelle Market au moment de l’implémentation, sans élargir le scope.

**Résultat attendu** : le changement reste strictement UI/application, lisible et sécurisé par tests.

## Périmètre / hors périmètre

### Inclus

- Affichage visuel de la rareté dans le catalogue Market
- Localisation des valeurs de la colonne restriction
- Ajustements localisés du view-model, template, styles et tests Market

### Exclus

- Changement des règles métier de rareté, disponibilité, achat ou négociation
- Refonte du système de badges ou des autres colonnes Market
- Refonte générale du Market au-delà du besoin de lisibilité demandé

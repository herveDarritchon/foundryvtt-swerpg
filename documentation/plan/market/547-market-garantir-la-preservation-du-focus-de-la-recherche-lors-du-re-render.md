# Market — Garantir la préservation du focus de la recherche lors du re-render

**Issue** : [#547 — Market — Garantir la préservation du focus de la recherche lors du re-render](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/547)

**Domaine métier** : `market`

## Goal

Empêcher la perte de focus et le saut de curseur pendant la saisie dans le Market lorsque le catalogue se re-render après une recherche, avec un correctif minimal compatible avec le debounce déjà introduit par `#540`.

## Contexte utile

- `module/applications/market/market-application.mjs` met à jour `_viewState.search` et `_viewState.inventorySearch` puis déclenche `_debouncedRender()`, ce qui recrée les champs de recherche au prochain rendu.
- L’issue demande de vérifier le comportement après `#540`, puis de ne sortir l’input du fragment re-rendu qu’en dernier recours si une restauration locale du focus/caret ne suffit pas.
- Le contrat UX attendu ne se limite pas au focus binaire : le curseur ne doit pas sauter ni repartir arbitrairement en fin de champ pendant la frappe.

## Plan d’implémentation

### Étape 1 — Poser le contrat exact de préservation de focus

**Fichiers** : `module/applications/market/market-application.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- cadrer explicitement quels contrôles doivent être protégés au rerender (`market-search`, et `market-inventory-search` si la même logique couvre aussi le mode vente) ;
- définir la donnée minimale à préserver entre deux rendus : champ actif, valeur courante, position du curseur et éventuelle sélection ;
- garder `#540` comme prérequis de baseline et exclure toute nouvelle refonte de cache/debounce.

**Résultat attendu** : le correctif cible un contrat UX précis et borné, sans élargir le scope au-delà de la recherche Market.

### Étape 2 — Implémenter une restauration minimale et locale au cycle de rendu Market

**Fichiers** : `module/applications/market/market-application.mjs`, `templates/market/market.hbs` _(uniquement si un attribut stable supplémentaire est nécessaire)_

**What** :

- capturer avant rerender l’état du champ de recherche actif puis le restaurer après rerender si le même contrôle existe encore dans le mode courant ;
- privilégier une solution locale au cycle AppV2 du Market (capture/restauration ciblée) avant toute extraction du champ hors du template rerendu ;
- ne retenir une séparation structurelle du champ de recherche que si la restauration focus/caret s’avère insuffisante ou instable.

**Résultat attendu** : pendant la frappe, les résultats filtrés se mettent à jour sans perte de focus ni saut de curseur.

### Étape 3 — Verrouiller la non-régression par des tests ciblés

**Fichiers** : `tests/applications/market/market-application.test.mjs`

**What** :

- ajouter des tests DOM ciblés sur le rerender déclenché par `market-search` et, si mutualisé, par `market-inventory-search` ;
- vérifier au minimum la conservation du focus, la stabilité de la position du curseur et le maintien des résultats filtrés après mise à jour ;
- documenter le contrôle manuel final Chrome/Firefox attendu par l’issue sans élargir la couverture à d’autres comportements Market.

**Résultat attendu** : la régression UX devient détectable automatiquement, puis confirmable manuellement sur les navigateurs cibles.

## Périmètre / hors périmètre

### Inclus

- préservation du focus et du caret des champs de recherche Market au rerender ;
- correctif minimal dans le cycle de rendu AppV2 du Market ;
- tests ciblés sur la recherche buy/sell si la logique est partagée.

### Exclus

- nouvelle refonte du cache ou du debounce de `#540` ;
- refonte visuelle du toolbar Market ;
- changements métier sur filtres, tri, pricing ou catalogue.

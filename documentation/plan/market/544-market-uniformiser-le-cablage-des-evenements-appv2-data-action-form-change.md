# Market — Uniformiser le câblage des événements (AppV2 data-action / form change)

**Issue** : [#544 — Market — Uniformiser le câblage des événements (AppV2 data-action / form change)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/544)

**Domaine métier** : `market`

## Goal

Uniformiser le câblage UI du Market en migrant les contrôles de recherche, filtres, tri et sélection de marché vers le paradigme idiomatique AppV2, afin de supprimer les listeners manuels dans `_onRender` sans changer le comportement fonctionnel.

## Contexte utile

- Les boutons du Market passent déjà par `DEFAULT_OPTIONS.actions`, mais plusieurs contrôles de formulaire restent branchés via `addEventListener` manuel dans `_onRender`.
- Le périmètre concerné couvre au minimum le sélecteur de type de marché, la recherche catalogue, les filtres, le tri, et le toolbar d’inventaire en mode vente qui suit aujourd’hui le même pattern impératif.
- Le changement de marché invalide le cache catalogue, tandis que les champs de recherche conservent un rendu debounced : ce contrat doit être préservé pendant la migration.
- Les tests actuels documentent surtout l’état résultant ou simulent le vieux câblage ; ils devront être réalignés sur le contrat AppV2 retenu.

## Plan d’implémentation

### Étape 1 — Définir un contrat AppV2 cohérent pour les contrôles Market

**Fichiers** : `templates/market/market.hbs`, `module/applications/market/market-application.mjs`

**What** :

- choisir un mécanisme uniforme pour les contrôles non-boutons (`form` + `change`/`input` AppV2, avec `data-action` seulement quand c’est pertinent) ;
- donner aux champs catalogue et inventaire les attributs nécessaires pour remonter dans des handlers AppV2 explicites au lieu d’un binding DOM local contrôle par contrôle ;
- clarifier dans le template et la JSDoc quels contrôles déclenchent un rendu immédiat, un rendu debounced, ou une invalidation de cache.

**Résultat attendu** : le template décrit le contrat d’événements du Market, et le code n’a plus besoin d’inventer un câblage impératif par sélecteur CSS pour ce périmètre.

### Étape 2 — Migrer la mise à jour du `_viewState` hors de `_onRender`

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- extraire la logique de mutation de `_viewState` vers un ou plusieurs handlers AppV2 dédiés au catalogue et à l’inventaire ;
- supprimer les `addEventListener` manuels devenus redondants pour la recherche, les filtres, le tri et le sélecteur de marché ;
- préserver les comportements spéciaux existants : normalisation des valeurs de tri, invalidation du cache au changement de marché, debounce des champs de recherche, et rerender sans régression métier.

**Résultat attendu** : `_onRender` n’est plus le point de câblage de ces contrôles, et la logique événementielle Market devient homogène et plus maintenable.

### Étape 3 — Réaligner les tests sur le nouveau contrat d’événements

**Fichiers** : `tests/applications/market/market-application.test.mjs`

**What** :

- remplacer les tests qui supposent le vieux câblage manuel par des tests du contrat AppV2 effectivement exposé ;
- couvrir au minimum le changement de marché, la recherche debounced, les filtres/tri du catalogue et la recherche/tri d’inventaire si migrés dans le même lot ;
- vérifier que le cache, les valeurs par défaut et les résultats visibles restent inchangés après refactor.

**Résultat attendu** : la non-régression passe par les nouveaux points d’entrée idiomatiques et empêche le retour de listeners manuels dans le périmètre Market.

## Périmètre / hors périmètre

### Inclus

- uniformisation AppV2 du câblage recherche / filtres / tri / sélecteur de marché ;
- suppression des `addEventListener` manuels correspondants dans `MarketApplicationV2` ;
- mise à jour des tests liés au contrat UI.

### Exclus

- refonte UX du toolbar Market ;
- modification du moteur métier catalogue / pricing / vente ;
- nouvelle optimisation de performance hors comportement déjà attendu (cache et debounce existants).

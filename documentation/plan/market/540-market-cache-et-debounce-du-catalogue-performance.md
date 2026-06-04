# Market — Cache et debounce du catalogue (performance)

**Issue** : [#540 — Market — Cache et debounce du catalogue (performance)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/540)

**Domaine métier** : `market`

## Goal

Réduire le coût des interactions fréquentes dans le catalogue Market en évitant de reconstruire tout le pipeline World + Compendiums à chaque rerender, et en lissant la saisie utilisateur pour ne plus relancer un rendu complet à chaque frappe.

## Contexte utile

- Le champ de recherche du catalogue déclenche actuellement `this.render()` à chaque `input` dans `module/applications/market/market-application.mjs`.
- `#prepareCatalog()` recharge à chaque rendu les items du monde, les index de compendiums via `loadCompendiumItems()`, puis relance `loadMarketCatalog()` avant d’appliquer recherche, filtres et tris.
- Les opérations coûteuses sont donc rejouées même quand seul `search`, un filtre UI ou un tri change.
- Le projet utilise déjà des patterns de debounce (`foundry.utils.debounce` et timers locaux) dans d’autres applications ; le Market peut s’aligner dessus sans inventer un mécanisme exotique.

## Plan d’implémentation

### Étape 1 — Isoler un socle de catalogue réutilisable et cacheable

**Fichiers** : `module/applications/market/market-application.mjs`, `module/applications/market/compendium-source-adapter.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- découper le pipeline du catalogue pour distinguer la phase coûteuse (chargement world + compendiums + `loadMarketCatalog`) de la phase légère (recherche, filtres, tri, annotation liée au buyer) ;
- introduire un cache local à l’instance du Market, indexé au minimum par le type de marché actif et les paramètres qui changent réellement le contenu source ;
- faire en sorte qu’un changement purement UI (recherche, filtres, tri, affordable-only) réutilise le socle déjà calculé au lieu de relire les compendiums ;
- prévoir une invalidation explicite quand le contenu catalogue doit réellement être recalculé.

**Résultat attendu** : ouvrir le Market puis ajuster les contrôles du catalogue ne recharge plus les index de compendiums ni le catalogue brut à chaque interaction.

### Étape 2 — Debouncer les interactions à haute fréquence du catalogue

**Fichiers** : `module/applications/market/market-application.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- remplacer le rerender immédiat du champ de recherche du catalogue par un déclenchement debounced, avec un délai court cohérent avec les autres patterns du projet ;
- centraliser le déclenchement de rerender catalogue pour éviter les rafales de rendus concurrents pendant la frappe ;
- conserver les sélecteurs de filtre/tri en mise à jour immédiate, tout en les branchant sur le cache afin que leur coût reste faible.

**Résultat attendu** : une saisie rapide dans la recherche catalogue ne déclenche plus un rendu complet par caractère et reste fluide même avec beaucoup de sources Market.

### Étape 3 — Verrouiller le contrat de performance par des tests ciblés

**Fichiers** : `tests/applications/market/market-application.test.mjs`, `tests/applications/market/compendium-source-adapter.test.mjs` _(si un spy direct sur l’adapter est le plus simple)_

**What** :

- ajouter des tests qui prouvent qu’après un premier calcul, une variation de recherche/filtre/tri réutilise le cache au lieu de rappeler `loadCompendiumItems()` et le pipeline complet ;
- couvrir l’invalidation attendue quand le type de marché actif change ;
- couvrir le debounce du champ de recherche pour garantir qu’une rafale de frappes n’entraîne qu’un nombre minimal de rerenders/calculs ;
- vérifier qu’aucune régression fonctionnelle n’apparaît sur `filteredCount`, `isFilteredEmpty`, le tri et l’annotation `canBuy`.

**Résultat attendu** : le gain de performance visé devient un contrat testé, sans fragiliser le comportement métier déjà livré.

## Périmètre / hors périmètre

### Inclus

- cache local du catalogue Market côté application ;
- debounce de la recherche du catalogue ;
- invalidation ciblée du cache quand le contenu du catalogue change réellement ;
- tests de non-régression et de contrat de performance.

### Exclus

- persistance de cache entre sessions Foundry ;
- refonte du moteur métier de pricing, d’éligibilité ou de déduplication ;
- pagination, virtualisation de liste ou refonte globale de l’UI Market ;
- optimisation du mode vente au-delà de ce qui est strictement nécessaire au partage de pattern.

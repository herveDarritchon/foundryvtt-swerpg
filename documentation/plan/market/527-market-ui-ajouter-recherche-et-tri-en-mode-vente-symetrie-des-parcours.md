# Issue #527 — Market UI : ajouter recherche et tri en mode vente (symétrie des parcours)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/527  
**Domaine métier** : `market`

## Goal

Donner au mode vente les mêmes capacités de repérage rapide que le mode achat, en ajoutant une toolbar de recherche / tri / reset adaptée à l’inventaire vendeur, sans régression sur le catalogue achat ni sur le flow de vente existant.

## Contexte utile

- `templates/market/market.hbs` n’affiche la `.market-toolbar` qu’en mode achat ; le mode vente montre aujourd’hui uniquement la buyer bar, la description et la table d’inventaire.
- `module/applications/market/market-application.mjs` sait déjà piloter la recherche et le tri du catalogue achat via `_viewState`, alors que `#prepareInventory()` se limite à un tri alphabétique fixe.
- `styles/market.less` contient déjà les styles de `.market-toolbar`, ce qui permet de viser un partage de markup et de comportements plutôt qu’une nouvelle UI parallèle.
- `tests/applications/market/market-application.test.mjs` couvre déjà les comportements buy et sell ; c’est le point d’ancrage naturel pour verrouiller l’absence de régression demandée par l’issue.

## Plan d’implémentation

### Étape 1 — Isoler un état de toolbar compatible buy / sell

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- Étendre le state UI pour supporter la recherche et le tri du mode vente sans recycler aveuglément les filtres buy-only (`type`, `source`, `restriction`, `affordableOnly`).
- Définir le contrat de vue du mode vente : recherche texte, clé de tri et direction, avec des options limitées à `name`, `basePrice` et `resaleEstimate`.
- Ajuster l’action de reset pour réinitialiser les contrôles utiles du mode courant sans faire sortir l’utilisateur du mode vente ni casser l’état utile du mode achat.

**Résultat attendu** : le mode vente dispose d’un state UI propre et prédictible, sans couplage involontaire avec les filtres du catalogue achat.

### Étape 2 — Brancher le pipeline recherche / tri sur l’inventaire vendeur

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- Refactoriser `#prepareInventory()` pour appliquer un pipeline explicite : collecte des items vendables → normalisation des champs utiles → filtre texte sur le nom → tri par nom / prix de base / estimation de revente.
- Exposer au template les métadonnées nécessaires à la toolbar vente et un état vide filtré dédié quand la recherche ne retourne aucun item.
- Conserver strictement la logique métier existante de vente, négociation et calcul de revente ; seul l’ordre et la visibilité des lignes changent.

**Résultat attendu** : la vue vente se comporte comme une liste pilotée par state, avec une recherche et un tri déterministes sur l’inventaire vendeur.

### Étape 3 — Rendre la toolbar en mode vente et verrouiller la parité

**Fichiers** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/market/market-application.test.mjs` _(et `styles/market.less` seulement si un hook visuel mineur manque)_

**What** :

- Réutiliser ou décliner `.market-toolbar` dans la branche `sell` du template avec champ de recherche, tri, direction et reset, sans réintroduire les filtres achat qui n’ont pas de sens en inventaire.
- Ajouter les libellés i18n spécifiques aux tris vente si les libellés achat existants sont trop ambigus (`prix de base` vs `prix de revente`).
- Étendre les tests autour du mode vente : recherche par nom, tri par nom / prix, reset, état vide filtré, et non-régression du mode achat / du toggle buy-sell.

**Résultat attendu** : la vue vente atteint la symétrie fonctionnelle demandée avec le mode achat, tout en gardant un scope strictement UI/application.

## Périmètre / hors périmètre

### Inclus

- Toolbar recherche / tri / reset du mode vente
- State UI et préparation de contexte associés à l’inventaire Market
- i18n et tests ciblés Market

### Exclus

- Nouveaux filtres métier en mode vente
- Changement de logique de vente, de négociation ou de calcul de revente
- Refonte visuelle globale du Market au-delà du partage de la toolbar existante

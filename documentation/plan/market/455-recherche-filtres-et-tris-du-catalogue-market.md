# Recherche, filtres et tris du catalogue Market

**Issue** : [#455 — Recherche, filtres et tris du catalogue Market](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/455)

**Dépend sur** : [#453 — Catalogue Market depuis les items du monde](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/453), [#454 — Sources configurables et éligibilité avancée du Market](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/454)

## Objectif

Permettre au MJ et aux joueurs de retrouver rapidement une entrée du Market, de réduire le catalogue via des filtres utiles et d’appliquer des tris lisibles, sans dupliquer la logique métier d’éligibilité, de pricing ou de sourcing.

## Décisions de cadrage

- Le travail reste centré sur la couche UI/application du Market ; aucune nouvelle logique métier parallèle ne doit être créée.
- Les filtres et tris s’appliquent sur les entrées déjà construites par le catalogue Market, après éligibilité et déduplication.
- L’état de vue du catalogue doit être explicite et stable : recherche texte, filtres actifs, clé de tri et sens de tri.
- Livrer un socle de contrôles court mais immédiatement utile : recherche texte, filtres `type` / `source` / `restriction`, tri par `nom` / `prix` / `rareté`.
- Les interactions restent 100% client-side ; pas de pagination, pas de requête supplémentaire, pas de nouvelle persistance dans cette tranche.

## Étapes d’implémentation

### 1. Étendre le contexte du Market avec un état filtrable et triable

**Fichiers cibles** : `module/applications/market/market-application.mjs`, helper Market dédié si l’extraction devient utile.

**What**

- définir l’état UI canonique du catalogue (`search`, `filters`, `sortBy`, `sortDirection`) ;
- normaliser les champs utilisés par la recherche, les filtres et les tris à partir des entrées Market existantes ;
- appliquer un pipeline unique : construire les entrées → filtrer → trier → regrouper → exposer les options et compteurs au template.

**Validation visée** : le contexte du Market expose à la fois les groupes visibles et les métadonnées nécessaires aux contrôles, sans altérer le contrat métier existant.

### 2. Ajouter la barre de recherche, les filtres et les tris dans le template

**Fichiers cibles** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json`.

**What**

- ajouter une toolbar de catalogue avec champ de recherche, sélecteurs de filtres, sélecteur de tri et action de réinitialisation ;
- afficher l’état courant des contrôles et un état vide dédié quand aucun résultat ne correspond ;
- localiser tous les libellés et placeholders du Market liés à la recherche, aux filtres, aux tris et au reset.

**Validation visée** : la fenêtre Market offre des contrôles lisibles, localisés et cohérents avec le catalogue existant.

### 3. Câbler les interactions UI et le rerender ciblé du catalogue

**Fichiers cibles** : `module/applications/market/market-application.mjs`.

**What**

- raccorder les actions `input`, `change` et `reset` au state applicatif du Market ;
- garantir que les changements de recherche/filtre/tri recalculent le catalogue sans réinitialiser arbitrairement l’état utilisateur ;
- limiter le rerender à la part catalogue/toolbar si le découpage applicatif le permet.

**Validation visée** : chaque interaction met à jour la liste visible de manière déterministe et fluide.

### 4. Finaliser les styles et verrouiller le comportement par tests ciblés

**Fichiers cibles** : `styles/market.less`, `styles/swerpg.less`, `tests/applications/market/market-application.test.mjs`.

**What**

- ajouter le style de la toolbar, des contrôles actifs et de l’état “aucun résultat” ;
- couvrir par tests la recherche texte, un cumul de filtres, l’ordre de tri, la réinitialisation et l’état vide ;
- vérifier que les filtres/tris ne réintroduisent pas d’items exclus par l’éligibilité amont.

**Validation visée** : le catalogue filtré/trié est stable visuellement et contractuellement.

## Résultat attendu

- Le Market dispose d’une recherche texte directement exploitable sur le catalogue.
- Le catalogue peut être réduit via des filtres métiers utiles sans casser les groupes ni les compteurs.
- L’utilisateur peut trier les résultats selon plusieurs ordres cohérents avec les colonnes affichées.
- La fonctionnalité reste strictement branchée sur le pipeline Market existant, sans refonte du modèle métier.

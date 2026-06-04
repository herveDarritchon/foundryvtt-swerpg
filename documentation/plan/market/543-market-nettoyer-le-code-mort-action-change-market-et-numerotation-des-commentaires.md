# Market — Nettoyer le code mort : action `changeMarket` et numérotation des commentaires

**Issue** : [#543 — Market — Nettoyer le code mort : action changeMarket et numérotation des commentaires](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/543)

**Domaine métier** : `market`

## Goal

Retirer un reliquat AppV2 non utilisé dans le Market et remettre la documentation inline de `#prepareCatalog()` en cohérence, sans changer le comportement métier achat/vente.

## Contexte utile

- `MarketApplicationV2.DEFAULT_OPTIONS.actions.changeMarket` et `#onChangeMarket()` existent encore, mais le changement de marché passe déjà par le listener du sélecteur dans `_onRender()`.
- Des tests ciblent aujourd’hui cette action morte et devront être réalignés sur le vrai chemin utilisateur.
- Les commentaires de pipeline dans `#prepareCatalog()` ont une numérotation incohérente, ce qui nuit à la lecture sans affecter l’exécution.

## Plan d’implémentation

### Étape 1 — Supprimer l’action `changeMarket` devenue morte

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- retirer l’entrée `changeMarket` de la map `actions` et la méthode privée `#onChangeMarket()` ;
- nettoyer la JSDoc et les commentaires qui prétendent qu’un élément `data-action="changeMarket"` pilote le changement de marché ;
- conserver comme unique source de vérité le listener du sélecteur déjà branché dans `_onRender()`, y compris l’invalidation de cache associée.

**Résultat attendu** : le fichier ne porte plus de point d’entrée AppV2 inutilisé pour le changement de marché, sans régression sur le sélecteur réel.

### Étape 2 — Réaligner les tests et la lisibilité locale du pipeline catalogue

**Fichiers** : `tests/applications/market/market-application.test.mjs`, `module/applications/market/market-application.mjs`

**What** :

- supprimer ou remplacer les tests qui appellent directement `DEFAULT_OPTIONS.actions.changeMarket` ;
- couvrir le comportement conservé via le vrai chemin encore supporté (changement de `activeMarketType` depuis le sélecteur et invalidation du cache) ;
- corriger la numérotation des commentaires dans `#prepareCatalog()` pour refléter l’ordre réel des étapes sans doublons.

**Résultat attendu** : la suite ciblée ne dépend plus d’une API morte, et la lecture du pipeline catalogue redevient linéaire et fiable.

## Périmètre / hors périmètre

### Inclus

- suppression de code mort lié à `changeMarket` ;
- réalignement des tests impactés ;
- correction cosmétique de la numérotation des commentaires de `#prepareCatalog()`.

### Exclus

- refonte plus large du câblage d’événements Market ;
- changement d’UX du sélecteur de marché ;
- évolution du métier, du pricing, de la négociation ou des templates Market.

# Issue #532 — Market UI : rendre le prix modifié visible (couleur remise/premium + indicateur)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/532  
**Domaine métier** : `market`

**Dépend sur** : [#523 — Market UI : Variabiliser toute la palette `market.less` sur le design system](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/523)

## Goal

Rendre immédiatement lisible qu’un prix Market a été négocié ou modifié par le contexte métier, en affichant une couleur sémantique et un indicateur visuel ↑/↓ sans changer la logique de calcul de prix ni le tooltip existant base → final.

## Contexte utile

- Le template distingue déjà les prix modifiés via `.market-price--modified` dans `templates/market/market.hbs`, mais aucun style dédié n’est appliqué aujourd’hui.
- `module/applications/market/market-application.mjs` enrichit déjà les entrées catalogue avec des view-models UI (`toolbarState`, `badges`, `rarityPips`) : c’est le bon point d’ancrage pour exposer un état prix simple à rendre.
- `tests/applications/market/market-application.test.mjs` couvre déjà `priceResult` sur les entrées de catalogue ; il peut verrouiller le nouveau contrat UI sans dépendre d’une validation visuelle seule.
- `styles/market.less` contient déjà les tokens sémantiques success / warning / danger consommables sans couleur en dur.

## Plan d’implémentation

### Étape 1 — Exposer un état visuel de variation de prix dans le view-model Market

**Fichiers** : `module/applications/market/market-application.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- Enrichir chaque entrée catalogue d’un petit état dérivé du `priceResult` (ex. `isModified`, `priceTrend`, `priceIndicator`, `priceStateClass`) basé sur la comparaison `basePrice` / `finalPrice`.
- Distinguer explicitement les 3 cas utiles au template : prix inchangé, remise (`finalPrice < basePrice`), premium (`finalPrice > basePrice`).
- Ajouter des tests ciblés sur ce contrat UI pour éviter toute logique conditionnelle implicite dans le template.

**Résultat attendu** : le template reçoit une information prête à afficher, sans calcul métier embarqué dans le Handlebars.

### Étape 2 — Brancher l’indicateur ↑/↓ et les états sémantiques dans le template prix

**Fichiers** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json` _(uniquement si un libellé aria dédié manque)_

**What** :

- Conserver le rendu actuel pour les prix non modifiés.
- Pour les prix modifiés, ajouter à côté de la valeur un indicateur visuel compact (`↑` / `↓` ou équivalent décoratif) et les classes/attributs nécessaires au style et à l’accessibilité.
- Préserver le tooltip existant `base → final`, qui reste la source de détail, sans refondre la structure de ligne ni les actions d’achat/négociation.

**Résultat attendu** : un prix modifié est identifiable au premier coup d’œil, y compris avant survol du tooltip.

### Étape 3 — Styliser remise vs premium dans `market.less`

**Fichiers** : `styles/market.less`

**What** :

- Introduire le style de base de `.market-price` / `.market-price--modified` dans la colonne prix, puis décliner les variantes remise / premium avec tokens sémantiques (`--color-success*`, `--color-warning*` ou `--color-danger*`).
- Donner à l’indicateur une présence visuelle nette mais compacte, cohérente avec la densité actuelle du tableau Market.
- Veiller à ne pas altérer le rendu des prix normaux ni introduire de couleur en dur hors design system.

**Résultat attendu** : remise et premium sont distingués visuellement sans ambiguïté, avec un prix normal inchangé.

## Périmètre / hors périmètre

### Inclus

- View-model UI de variation de prix
- Indicateur visuel ↑/↓ sur prix modifié
- Styles sémantiques remise / premium
- Tests ciblés sur le contrat de contexte Market

### Exclus

- Changement du calcul métier des prix, négociations ou modificateurs
- Refonte globale de la table Market
- Modification du détail tooltip base → final au-delà de sa conservation

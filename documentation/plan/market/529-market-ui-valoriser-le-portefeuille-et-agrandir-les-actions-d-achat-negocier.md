# Issue #529 — Market UI : valoriser le portefeuille et agrandir les actions d’achat / négocier

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/529  
**Domaine métier** : `market`

## Goal

Rendre l’en-tête crédits plus lisible et plus "valuable", puis augmenter la clarté et la taille des CTA d’achat / négociation, sans toucher à la logique métier du Market ni aux règles d’achat/vente.

## Contexte utile

- `templates/market/market.hbs` affiche aujourd’hui le portefeuille en texte brut (`Credits: {{buyer.credits}}`) dans les deux modes, sans icône ni formatage monétaire.
- `module/applications/market/market-application.mjs` expose seulement `buyer.credits` au template ; aucun champ de présentation formaté n’est fourni pour distinguer valeur brute et rendu UI.
- `styles/market.less` donne à `.market-buyer-bar` un rendu sobre, et garde `.market-item__buy` / `.market-item__negotiate` sur des boutons compacts à icône seule avec padding `0.3rem`.
- `lang/en.json` et `lang/fr.json` contiennent déjà les libellés métier `MARKET.Purchase.BuyButton` et `MARKET.Purchase.NegotiateButton`, réutilisables pour rendre les actions compréhensibles sans tooltip.
- L’audit `documentation/audit/market/audit-ui-ux-market.md` cible explicitement UX6 (portefeuille peu valorisé) et UX7 (CTA trop petits / icon-only), avec critère a11y de cible tactile ≥ 44px.

## Plan d’implémentation

### Étape 1 — Préparer un contrat d’affichage enrichi pour le portefeuille

**Fichiers** : `module/applications/market/market-application.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- Étendre le contexte buyer exposé au template pour distinguer la valeur numérique métier (`credits`) et une variante prête à afficher (`formattedCredits` ou équivalent).
- Centraliser ce contrat dans `_preparePartContext` pour garantir un rendu homogène entre mode achat et mode vente, sans dupliquer de logique de formatage dans le Handlebars.
- Verrouiller en test le nouveau contrat de contexte afin d’éviter une régression sur la récupération des crédits depuis `creditBudget.availableCredits` / `system.credits`.

**Résultat attendu** : le template reçoit une donnée portefeuille déjà formatée et exploitable visuellement, sans altérer les calculs métier existants.

### Étape 2 — Revaloriser visuellement la buyer bar dans les deux modes

**Fichiers** : `templates/market/market.hbs`, `styles/market.less` _(et `lang/en.json`, `lang/fr.json` seulement si un libellé dédié manque pour l’accessibilité)_

**What** :

- Enrichir la buyer bar avec une icône crédits, un séparateur visuel clair entre nom du buyer et montant, et une emphase visuelle portée sur le montant formaté.
- Harmoniser le markup buy/sell autour d’un même rendu portefeuille pour éviter que l’un des deux modes garde l’ancienne version texte brut.
- Préserver l’état vide (`market-buyer-bar--empty`) et l’accessibilité clavier / lecteur d’écran du bandeau.

**Résultat attendu** : le portefeuille devient un repère visuel immédiat du Market, cohérent dans les deux parcours buy/sell.

### Étape 3 — Agrandir et expliciter les CTA achat / négocier

**Fichiers** : `templates/market/market.hbs`, `styles/market.less` _(et `tests/applications/market/market-application.test.mjs` si un contrat de rendu/template est verrouillé côté tests)_

**What** :

- Faire évoluer la colonne d’actions achat pour supporter des boutons réellement actionnables (cibles ≥ 44px), sans casser le layout du tableau ni l’état disabled existant.
- Ajouter un libellé court visible ou une combinaison icône + texte pour distinguer immédiatement `Acheter` et `Négocier`, sans dépendre exclusivement du tooltip.
- Ajuster `.market-col--buy`, `.market-item__buy` et `.market-item__negotiate` pour conserver une hiérarchie claire entre CTA, états hover/focus-visible/disabled compris.
- Prévoir la validation finale par `pnpm run build` et revue visuelle ciblée du mode achat, sans ouvrir de refonte globale du tableau Market.

**Résultat attendu** : les actions d’achat et de négociation sont compréhensibles au premier regard, plus confortables au clic/tactile, et restent compatibles avec les affordances existantes.

## Périmètre / hors périmètre

### Inclus

- Formatage et mise en avant visuelle du portefeuille buyer
- Ajustements localisés de markup et styles sur la buyer bar et les CTA achat / négocier
- Contrat de contexte UI et tests ciblés associés

### Exclus

- Toute modification de logique métier de crédits, d’achat, de vente ou de négociation
- Refonte globale du tableau Market au-delà de la colonne d’actions
- Refonte générale du design system ou des autres écrans du système

# Issue #524 — Market UI : styler la table de vente et le toggle buy/sell

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/524  
**Domaine métier** : `market`

## Goal

Mettre le mode vente du Market au même niveau de finition que le mode achat, sans changer la logique métier ni le flow buy existant.

## Contexte utile

- Le rendu sell est déjà présent dans `templates/market/market.hbs` avec les hooks `.market-inventory__table`, `.market-col--sell`, `.market-item__sell`, `.market-resale-estimate` et `.market-mode-toggle`.
- `styles/market.less` contient déjà les styles du catalogue achat (`.market-catalog__table`, `.market-item__buy`) mais aucune règle dédiée pour la table de vente ni pour le toggle buy/sell.
- `templates/market/market-inventory.hbs` duplique les mêmes hooks visuels : garder les classes alignées si ce template est encore consommé.

## Plan d’implémentation

### Étape 1 — Harmoniser les styles de la table de vente

**Fichiers** : `styles/market.less`, `templates/market/market.hbs` _(et `templates/market/market-inventory.hbs` seulement si harmonisation de hooks nécessaire)_

**What** :

- Ajouter une base de style pour `.market-inventory__table` au niveau de finition de `.market-catalog__table` : cadre, radius, header en capitales, padding cellules, hover de ligne.
- Ajouter les règles manquantes pour `.market-col--sell`, `.market-item__sell` et `.market-resale-estimate`.
- Réutiliser les design tokens existants du Market pour rester cohérent avec ADR-0022 et avec les boutons achat/négociation.

**Résultat attendu** : la table vente ressemble visuellement au catalogue achat, avec une colonne action lisible et un estimateur de revente mis en valeur.

### Étape 2 — Transformer le toggle buy/sell en segmented control

**Fichiers** : `styles/market.less`, `templates/market/market.hbs` _(et `templates/market/market-inventory.hbs` si actif)_

**What** :

- Styliser `.market-mode-toggle` comme un conteneur segmenté : fond, bordure, espacement, radius.
- Styliser `.market-mode-toggle__btn` pour distinguer clairement états actif, inactif, hover et focus-visible.
- Utiliser `aria-pressed` / `.is-active` comme source d’état visuel, sans modifier la logique JS existante.

**Résultat attendu** : le basculement buy/sell est immédiatement compréhensible et visuellement cohérent avec le reste du Market.

### Étape 3 — Vérification ciblée sans élargir le scope

**Fichiers** : aucun nouveau fichier requis

**What** :

- Vérifier que les nouveaux styles n’impactent pas les sélecteurs achat existants.
- Vérifier la parité visuelle sur le mode achat et le mode vente.
- Prévoir une validation finale par `pnpm run build` et une vérification visuelle du Market, sans refactor métier ni changement JS hors hooks éventuels.

## Périmètre / hors périmètre

### Inclus

- CSS Market pour la table vente et le toggle buy/sell
- Ajustements mineurs de template uniquement si nécessaires pour garder des hooks cohérents

### Exclus

- Toute modification de logique buy/sell
- Refactor ApplicationV2 ou changement de state JS
- Nouvelles fonctionnalités de vente ou de négociation

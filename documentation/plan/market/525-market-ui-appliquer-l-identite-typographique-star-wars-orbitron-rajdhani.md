# Issue #525 — Market UI : appliquer l’identité typographique Star Wars (Orbitron / Rajdhani)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/525  
**Domaine métier** : `market`

## Goal

Renforcer l’identité visuelle Star Wars du Market en appliquant la hiérarchie typographique déjà disponible dans le système, sans toucher à la logique métier ni aux comportements buy/sell.

## Contexte utile

- `styles/variables.less` expose déjà les fontes Orbitron et Rajdhani via les tokens `--font-h1`, `--font-h2`, `--font-h3` et `--font-sans`.
- `styles/market.less` structure déjà les composants visuels du Market, mais sans hiérarchie typographique dédiée au module.
- `templates/market/market.hbs` expose déjà les hooks nécessaires pour le toggle, la buyer bar, le sélecteur, la toolbar et les tables achat/vente ; aucun changement de logique n’est attendu.

## Plan d’implémentation

### Étape 1 — Définir la hiérarchie typographique du Market

**Fichiers** : `styles/market.less`

**What** :

- Identifier les zones “titres / labels structurants / données” du Market et leur attribuer une police cohérente : Orbitron pour les marqueurs d’identité, Rajdhani pour la lecture courante.
- Réutiliser exclusivement les design tokens existants (`--font-h1`, `--font-h2`, `--font-h3`, `--font-sans`) sans introduire de `font-family` littéral.

**Résultat attendu** : une grille de lecture claire avec une identité Star Wars visible mais lisible.

### Étape 2 — Appliquer la typo sur les composants clés achat/vente

**Fichiers** : `styles/market.less` _(et `templates/market/market.hbs` seulement si un hook CSS mineur manque)_

**What** :

- Harmoniser la typo du toggle buy/sell, de la buyer bar, du sélecteur, de la toolbar, des entêtes de table, des noms d’objets et des CTA achat/vente.
- Veiller à la cohérence entre mode achat et mode vente pour éviter un Market visuellement mixte entre catalogue et inventaire.

**Résultat attendu** : les deux modes du Market partagent la même signature typographique, sans divergence entre catalogue et inventaire.

### Étape 3 — Vérification visuelle ciblée et garde-fous de scope

**Fichiers** : aucun nouveau fichier requis

**What** :

- Vérifier que la mise à jour n’altère ni les espacements critiques, ni les états hover/focus, ni la lisibilité des données de prix et de rareté.
- Prévoir une validation finale par revue visuelle du Market et `pnpm run build`, sans ouvrir de refonte globale des styles.

## Périmètre / hors périmètre

### Inclus

- Typographie des composants Market existants
- Ajustements CSS localisés au Market
- Hook de template minimal uniquement si indispensable à l’application des styles

### Exclus

- Toute modification de logique métier Market
- Refonte globale du design system ou des autres écrans
- Introduction de nouvelles fontes ou de nouveaux assets typographiques

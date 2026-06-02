# Issue #533 — Market UI : ajouter un chrome diégétique léger (cadre holographique, liseré, en-tête de marché)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/533  
**Domaine métier** : `market`

**Dépend sur** : [#523 — Market UI : Variabiliser toute la palette `market.less` sur le design system](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/523), [#525 — Market UI : Appliquer l’identité typographique Star Wars (Orbitron / Rajdhani)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/525)

**Tags** : `HITL` — validation humaine requise sur la direction artistique du chrome avant implémentation

## Goal

Donner au Market un framing léger de terminal galactique via un cadre holographique, un liseré et un en-tête distinctif, sans alourdir le DOM, sans changer la logique métier, et sans dégrader contraste ou focus.

## Contexte utile

- L’issue et l’audit `documentation/audit/market/audit-ui-ux-market.md` (DA5) demandent explicitement un chrome **léger**, à fort impact perçu et à faible coût CSS.
- `templates/market/market.hbs` expose déjà les hooks visuels principaux (`.market-catalog`, `.market-mode-toggle`, `.market-selector`, `.market-buyer-bar`) : le plan doit capitaliser dessus avant d’ajouter du markup.
- `styles/market.less` contient déjà la base visuelle du Market et les tokens nécessaires (`--color-glow`, fonds de frame, typographies Market) ; le chrome doit rester 100 % design tokens.
- En mode achat, la racine reçoit déjà la classe `uiVariant` du marché actif ; le chrome et l’en-tête doivent rester compatibles avec ces variantes et avec les thèmes clair/sombre.

## Plan d’implémentation

### Étape 1 — Valider la direction artistique minimale (HITL)

**Fichiers** : `styles/market.less`, `templates/market/market.hbs` _(zone d’impact cible)_

**What** :

- Faire valider un unique concept compact : forme des coins/biseaux, position du liseré, niveau d’intensité du glow, et composition de l’en-tête.
- Trancher si l’en-tête s’appuie uniquement sur les éléments déjà visibles (sélecteur de marché, description, buyer bar) ou s’il faut un wrapper dédié très léger.

**Résultat attendu** : une cible visuelle claire, validée avant toute écriture CSS structurelle.

### Étape 2 — Poser une structure d’en-tête Market légère et réutilisable

**Fichiers** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json` _(uniquement si un libellé d’en-tête manque)_

**What** :

- Introduire si nécessaire un wrapper de type `market-header` autour des éléments déjà présents, sans refonte du flux buy/sell.
- Mettre en avant l’identité du marché actif (nom, description, variante visuelle) dans une zone distincte du contenu tabulaire.
- Préserver l’accessibilité existante : structure lisible, focus visible, aucun texte purement décoratif indispensable à la compréhension.

**Résultat attendu** : l’en-tête du Market est visuellement distinct du contenu, sans logique métier supplémentaire.

### Étape 3 — Ajouter le chrome diégétique en CSS via pseudo-éléments

**Fichiers** : `styles/market.less`

**What** :

- Ajouter le cadre léger du terminal sur `.market-catalog` et/ou `.market-header` avec `::before` / `::after` : coins lumineux, bornes d’angle, liseré supérieur ou latéral.
- Réutiliser `--color-glow` et les tokens du design system pour rester compatible avec `uiVariant`, les thèmes clair/sombre et l’ADR design tokens.
- Garantir que le chrome reste décoratif : pas de masque sur les focus rings, pas d’obstacle à la lisibilité, pas d’animation ou d’illustration lourde.

**Résultat attendu** : le Market évoque un terminal Star Wars au premier regard, avec un coût DOM/CSS maîtrisé.

### Étape 4 — Validation ciblée

**Fichiers** : aucun nouveau fichier requis

**What** :

- Vérifier que le cadre, le liseré et l’en-tête sont visibles sans perturber toolbar, tableau, toggle ou buyer bar.
- Vérifier que contraste et focus restent lisibles dans les variantes de marché et les thèmes clair/sombre.
- Prévoir la validation finale par `pnpm run build` et une revue visuelle manuelle du Market.

## Périmètre / hors périmètre

### Inclus

- Chrome diégétique léger du conteneur Market
- En-tête de marché distinctif
- Ajustements minimes de template et d’i18n si nécessaires au rendu

### Exclus

- Refonte de la logique JS ou métier du Market
- Recomposition lourde du DOM
- Nouvelles animations, assets illustrés complexes ou effets non essentiels

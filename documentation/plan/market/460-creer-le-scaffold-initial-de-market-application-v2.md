# Créer le scaffold initial de MarketApplicationV2

**Issue** : [#460 — Créer le scaffold initial de MarketApplicationV2](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/460)

**Dépend sur** : [#452 — Modèle métier du Market](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/452) ✅ livré

## Objectif

Poser la première coquille technique de `MarketApplicationV2` pour disposer d’une fenêtre ouvrable, localisée et stylable, sans embarquer encore la logique complète de catalogue, d’achat ou de filtres.

## Décisions de cadrage

- Scope strictement limité au scaffold `ApplicationV2` du Market.
- Créer la structure minimale : classe applicative, template, styles, clés i18n, point d’entrée d’ouverture.
- Ne pas implémenter dans cette issue le sourcing des items, le groupement du catalogue, les actions métier ou l’achat.
- Préparer un shell compatible avec les itérations suivantes du domaine `market`.

## Étapes d’implémentation

### 1. Poser la classe `MarketApplicationV2` et son point d’ouverture

**Fichiers cibles** : `module/applications/market/market-application.mjs`, surface d’initialisation/hook Market concernée.

**What**

- créer la classe `MarketApplicationV2` sur le pattern `ApplicationV2` du système ;
- définir `DEFAULT_OPTIONS` minimales (`id`, `window.title`, classes CSS, dimensions si utiles) ;
- déclarer une structure `PARTS` minimale pour le rendu du shell ;
- exposer un point d’entrée explicite pour ouvrir la fenêtre (`game.system.swerpg.openMarket()` ou surface équivalente).

**Validation visée** : le Market peut être instancié et rendu sans erreur, même avec un contenu vide.

### 2. Créer le shell UI minimal et les traductions associées

**Fichiers cibles** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json`.

**What**

- créer le template principal avec une structure simple (`header`/`body`/état vide ou placeholder) ;
- ajouter les clés i18n minimales pour le titre et le message d’état vide ;
- réserver les points d’ancrage de markup nécessaires aux futures évolutions du catalogue.

**Validation visée** : la fenêtre affiche un titre localisé et un état vide lisible, sans texte hardcodé.

### 3. Ajouter le style de base et verrouiller le scaffold par tests ciblés

**Fichiers cibles** : `styles/market.less` (ou équivalent), `styles/swerpg.less`, `tests/applications/market/market-application.test.mjs`.

**What**

- ajouter un style de base cohérent avec les conventions visuelles du système ;
- raccorder le fichier LESS au pipeline de styles existant ;
- écrire des tests ciblés sur le scaffold : options par défaut, rendu de la part principale, ouverture via le point d’entrée exposé.

**Validation visée** : le scaffold Market est stable, testable et prêt à recevoir le catalogue dans une issue suivante.

## Résultat attendu

- `MarketApplicationV2` existe et suit les conventions UI du système.
- Une fenêtre Market peut être ouverte depuis une surface système explicite.
- Le rendu initial affiche un shell localisé et stylé, sans logique métier avancée.
- Le terrain est prêt pour brancher ensuite le catalogue Market et ses interactions.

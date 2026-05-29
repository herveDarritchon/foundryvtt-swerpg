# Marchés contextualisés (marché noir, spécialisé, local)

**Issue** : [#458 — Marchés contextualisés (marché noir, spécialisé, local)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/458)

**Dépend sur** : [#457 — Achat simple depuis le Market (crédits, vérification, inventaire)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/457)

## Objectif

Faire évoluer le Market global vers des marchés contextualisés sélectionnables, où le type de marché pilote les items visibles, les modificateurs de prix, la disponibilité locale et les signaux UI, sans dupliquer la logique métier entre moteur de prix, catalogue et application.

## Décisions de cadrage

- La V1 livre un registre extensible `SYSTEM.MARKET.MARKET_TYPES` avec au minimum `standard`, `black-market`, `specialized`, `local`.
- `black-market` est un contexte métier complet, pas un simple filtre visuel : il peut exposer des items restreints/illégaux invisibles ailleurs.
- Les règles par marché restent déclaratives : types autorisés, overrides de disponibilité, modificateurs de prix, labels/badges UI.
- Le Market conserve une seule chaîne de calcul de prix : le moteur canonique reçoit le `marketType` actif et produit le prix final explicable.
- Les exemples plus spécialisés (`surplus impérial`, `comptoir hutt`) restent des presets ou variantes futures tant que la V1 n’a pas besoin d’une configuration MJ persistée.

## Étapes d’implémentation

### 1. Poser le registre canonique des types de marché et leurs règles minimales

**Fichiers cibles** : `module/config/market.mjs`, `module/lib/market/price-engine.mjs`, `module/lib/market/market-entry.mjs`, tests de config/lib ciblés.

**What**

- définir `MARKET_TYPES` avec structure stable (`id`, `label`, `description`, `allowedItemTypes`, `availability`, `priceModifiers`, `uiVariant`) ;
- formaliser les règles minimales de V1 pour `standard`, `local`, `specialized`, `black-market` ;
- brancher le contexte de marché dans l’évaluation d’éligibilité et dans le moteur de prix sans introduire de logique parallèle.

**Validation visée** : le domaine Market expose un registre unique des types de marché et sait calculer visibilité/price à partir du marché actif.

### 2. Contextualiser le catalogue et la disponibilité par marché actif

**Fichiers cibles** : `module/lib/market/source-resolver.mjs`, `module/lib/market/market-entry.mjs`, `module/lib/market/index.mjs`, tests métier Market ciblés.

**What**

- enrichir chaque entrée Market avec son statut dans le marché courant (`visible`, `blocked`, `reason`, `priceResult`) ;
- masquer hors `black-market` les items illégaux/restreints prévus pour ce seul contexte ;
- permettre les overrides locaux de disponibilité et de types autorisés sans casser les règles génériques du catalogue.

**Validation visée** : à item identique, le catalogue produit des décisions différentes mais explicables selon le marché sélectionné.

### 3. Ajouter la sélection du marché dans l’application Market et rafraîchir l’affichage

**Fichiers cibles** : `module/applications/market/market-application.mjs`, `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json`, tests application ciblés.

**What**

- introduire un sélecteur de marché (dropdown ou tabs selon le scaffold existant) piloté par `MARKET_TYPES` ;
- rerendre catalogue, prix, badges et états d’achat quand le marché actif change ;
- afficher une micro-copy/contextualisation visuelle légère par marché, suffisante pour distinguer `standard`, `specialized`, `local` et `black-market`.

**Validation visée** : l’utilisateur change de marché depuis la fenêtre Market et voit immédiatement le catalogue et les prix se recalculer.

### 4. Verrouiller les règles V1 par des tests ciblés

**Fichiers cibles** : `tests/config/market.test.mjs`, `tests/lib/market/*.test.mjs`, `tests/applications/market/market-application.test.mjs`.

**What**

- couvrir le registre `MARKET_TYPES` et ses constantes métier ;
- couvrir les cas `standard`, `local`, `specialized`, `black-market` sur visibilité, disponibilité et modificateurs de prix ;
- couvrir côté application le changement de marché actif et le rafraîchissement du rendu catalogue/prix.

**Validation visée** : chaque type de marché possède un contrat testé, lisible et non régressif.

## Résultat attendu

- `SYSTEM.MARKET.MARKET_TYPES` définit les marchés V1 et leurs propriétés.
- Le Market applique ses règles de visibilité, disponibilité et prix selon le marché actif.
- Le marché noir expose ses items dédiés sans les rendre visibles ailleurs.
- L’application Market permet de sélectionner un marché et de recalculer le catalogue sans logique dupliquée.

# Sources configurables et éligibilité avancée du Market

**Issue** : [#454 — Sources configurables et éligibilité avancée du Market](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/454)

**Dépend sur** : [#452 — Modèle métier du Market — éligibilité, types autorisés, sources](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/452) ✅ livré

## Objectif

Permettre au MJ de piloter les sources commerciales du Market, la liste blanche des types affichables et l’exclusion unitaire d’items, sans dépendre d’une UI dédiée. La livraison doit rester centrée sur le modèle de données, les règles métier et les APIs prêtes pour une future interface de configuration.

## Décisions de cadrage

- Réutiliser le contrat canonique posé par `#452` ; aucune logique parallèle d’éligibilité ne doit apparaître côté consommateurs.
- Introduire une configuration runtime lisible par le MJ via settings système, avec constantes par défaut conservées dans la configuration Market.
- Porter l’exclusion unitaire sur un flag d’item dédié (namespace `swerpg`), afin d’éviter une évolution de DataModel pour cette tranche.
- Conserver une règle unique de déduplication, pilotée par une clé canonique avec ordre de priorité explicite, puis fallback déterministe documenté.
- Exclure l’UI de configuration de cette issue ; seule l’API et la persistance doivent être livrées.

## Étapes d’implémentation

### 1. Définir le contrat de configuration du Market

**Fichiers cibles** : `module/config/market.mjs`, surface `SYSTEM.MARKET`, documentation technique Market pertinente.

**What**

- définir la structure canonique de configuration : `enabledSources`, `allowedItemTypes`, `dedupStrategy` ;
- préciser les valeurs par défaut, les invariants et les règles de normalisation ;
- exposer une API de lecture unique pour que le reste du Market consomme une configuration déjà résolue.

**Validation visée** : la configuration Market devient une source de vérité unique, lisible et extensible sans UI.

### 2. Ajouter la persistance et l’exclusion unitaire

**Fichiers cibles** : enregistrement des settings système du Market, couche `module/lib/market/` concernée, barrel `module/lib/market/index.mjs` si nécessaire.

**What**

- enregistrer les settings monde/système nécessaires pour activer ou désactiver les sources et types autorisés ;
- définir le flag d’item `non achetable` et son adaptateur vers le contrat métier d’éligibilité ;
- centraliser les helpers de lecture/écriture pour éviter une dépendance directe des consommateurs aux settings Foundry.

**Validation visée** : les règles de configuration et l’exclusion d’item sont accessibles au runtime sans UI dédiée.

### 3. Faire évoluer la résolution des sources et la déduplication

**Fichiers cibles** : `module/lib/market/source-resolver.mjs`, `module/lib/market/eligibility.mjs`, adaptateurs Market identifiés par `#452`.

**What**

- filtrer les sources commerciales à partir de la configuration active ;
- appliquer la liste blanche des types autorisés avant exposition au catalogue ;
- formaliser la règle de déduplication avec priorité sur la clé canonique d’import quand elle existe, puis fallback déterministe documenté ;
- garantir qu’une entrée exclue manuellement reste non éligible même si sa source et son type sont autorisés.

**Validation visée** : le catalogue Market expose une seule entrée canonique par item achetable, issue uniquement des sources activées.

### 4. Verrouiller les contrats par tests ciblés

**Fichiers cibles** : `tests/config/market.test.mjs`, `tests/lib/market/eligibility.test.mjs`, `tests/lib/market/source-resolver.test.mjs`, autres tests Market ciblés si nécessaire.

**What**

- couvrir les valeurs par défaut et la normalisation de la configuration ;
- tester l’exclusion manuelle via flag ;
- tester l’activation/désactivation des sources et des types autorisés ;
- tester la déduplication sur clé canonique et sur fallback.

**Validation visée** : les critères d’acceptation de `#454` sont couverts par des tests unitaires sans dépendre d’une UI.

## Résultat attendu

- Le Market lit une configuration runtime explicite pour ses sources et ses types autorisés.
- Un item peut être exclu individuellement du Market via un flag dédié.
- La résolution des sources et la déduplication sont unifiées dans la couche métier Market.
- Toute l’API nécessaire à une future interface de configuration est disponible sans refonte du catalogue.

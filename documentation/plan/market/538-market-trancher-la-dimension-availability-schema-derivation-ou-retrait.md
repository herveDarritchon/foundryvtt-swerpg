# Issue #538 — Market : trancher la dimension `availability` (schéma, dérivation ou retrait)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/538  
**Domaine métier** : `market`

## Goal

Supprimer l’ambiguïté autour de `availability` dans le Market en décidant si cette donnée doit rester portée par le schéma, être dérivée depuis les autres dimensions métier, ou être retirée du contrat canonique, puis aligner tous les consommateurs sur cette décision.

## Contexte utile

- `documentation/plan/market/452-modele-metier-du-market-eligibilite-types-autorises-sources.md` a posé `AVAILABILITY_STATUS` et un contrat d’entrée Market contenant `availability`.
- `documentation/plan/market/456-moteur-de-prix-avec-modificateurs-rarete-disponibilite-contexte.md` fait déjà de `availability` une dimension de pricing, en parallèle de `rarity` et du `marketContext`.
- Les plans récents du Market croisent déjà plusieurs axes (`rarity`, `restrictionLevel`, type de marché, availability check), ce qui expose un risque de double source de vérité si `availability` reste à la fois stockée et redérivée.
- Le ticket est donc d’abord une décision d’architecture métier avant d’être un simple ajustement UI ou un correctif ponctuel.

## Plan d’implémentation

### Étape 1 — Cartographier les usages de `availability` et choisir une source de vérité unique

**Fichiers** : `module/config/market.mjs`, `module/lib/market/*.mjs`, `module/applications/market/*.mjs`, adaptateurs/imports Market identifiés, documentation d’architecture ou ADR associée.

**What** :

- Inventorier où `availability` est lue, écrite, calculée ou simplement affichée.
- Distinguer les rôles actuellement mélangés : statut métier stocké, dérivation depuis `rarity`/contexte, filtre de visibilité, modificateur de prix, prérequis d’un check de disponibilité.
- Trancher explicitement une option canonique :
  - **schéma** : `availability` reste une donnée persistée et validée ;
  - **dérivation** : `availability` devient un résultat calculé depuis les autres dimensions ;
  - **retrait** : la notion sort du contrat public et ses usages sont redistribués vers des concepts plus précis.

**Résultat attendu** : une décision explicite supprime la double source de vérité et fixe la stratégie de migration pour les données historiques.

### Étape 2 — Aligner le contrat canonique Market sur la décision retenue

**Fichiers** : `module/config/market.mjs`, `module/lib/market/market-entry.mjs`, `module/lib/market/pricing.mjs` ou moteur canonique équivalent, `module/lib/market/availability-check.mjs`, loaders/adaptateurs Market concernés.

**What** :

- Mettre à jour le contrat canonique (`SYSTEM.MARKET`, entry builder, helpers métier) pour refléter une seule sémantique de `availability`.
- Si `availability` est conservée dans le schéma, centraliser sa validation et supprimer les redérivations implicites.
- Si `availability` est dérivée ou retirée, centraliser le resolver canonique et faire converger pricing, visibilité catalogue, checks de disponibilité et import vers ce nouveau contrat.
- Prévoir le traitement des données legacy pour éviter qu’une ancienne valeur stockée continue de contredire la règle retenue.

**Résultat attendu** : tous les producteurs et consommateurs du Market appliquent la même définition métier de `availability`, sans heuristique locale divergente.

### Étape 3 — Verrouiller la décision par des tests et une migration lisible

**Fichiers** : `tests/config/market.test.mjs`, `tests/lib/market/*.test.mjs`, `tests/applications/market/market-application.test.mjs`, tests d’import Market ciblés si nécessaire.

**What** :

- Ajouter des tests contractuels qui encodent la décision retenue : valeur persistée autorisée, dérivation canonique, ou absence assumée du champ.
- Couvrir les cas de non-régression les plus risqués : item legacy avec ancienne `availability`, cohérence entre pricing et visibilité, cohérence entre achat/négociation et règle de disponibilité.
- Documenter la migration ou la normalisation attendue pour éviter toute réintroduction future d’une seconde source de vérité.

**Résultat attendu** : la décision d’architecture est testable, lisible et protégée contre les régressions transverses du Market.

## Périmètre / hors périmètre

### Inclus

- Décision canonique sur le statut de `availability` dans le domaine Market
- Alignement du contrat métier, des adaptateurs et des consommateurs directs
- Tests ciblés garantissant l’unicité de la source de vérité

### Exclus

- Refonte UI cosmétique du Market sans lien avec la décision métier
- Changement des règles économiques au-delà de ce qui est nécessaire pour aligner le contrat
- Extension fonctionnelle du Market hors sujet (nouveaux types de marché, nouvelles actions utilisateur)

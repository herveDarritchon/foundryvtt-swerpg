# Issue #569 — Audit Log : unifier la source du delta crédits dans `recordItemPurchase`

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/569  
**Domaine métier** : `audit-log`

## Goal

Supprimer la double source de vérité entre `creditDelta` et `snapshot.creditsDelta` lors d’un achat Market, afin que l’entrée d’audit reflète toujours le delta réel de crédits après modificateurs et arrondis.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` identifie ce défaut via **AL11**.
- L’issue précise que `recordItemPurchase` calcule aujourd’hui `creditDelta = -(price * quantity)` indépendamment de `snapshot.creditsDelta = creditsBefore - creditsAfter`.
- Cette divergence peut produire des écarts dès qu’un modificateur de commerce, un arrondi ou une variation de calcul intervient dans le flux d’achat.
- Les garde-fous naturels se trouvent déjà dans `tests/utils/audit-log.test.mjs` et `tests/integration/market-audit-log.integration.test.mjs`.

## Plan d’implémentation

### Étape 1 — Rebrancher `recordItemPurchase` sur une source canonique unique du delta crédits

**Fichiers** : `module/utils/audit-log.mjs`

**What** :

- Revoir `recordItemPurchase()` pour que `creditDelta` et `snapshot.creditsDelta` proviennent de la même valeur canonique au lieu d’être calculés séparément.
- Privilégier le delta issu du snapshot (`creditsBefore - creditsAfter`) comme source de vérité métier, car il reflète le résultat réellement appliqué après modificateurs.
- Conserver le contrat d’entrée `item.purchase` et sa convention de signe, sans élargir le changement au calcul Market lui-même, aux ventes ou au rendu chat.

**Résultat attendu** : une entrée `item.purchase` ne peut plus exposer deux deltas crédits divergents pour une même opération.

### Étape 2 — Verrouiller la non-régression sur les scénarios d’achat avec variation réelle du coût

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/integration/market-audit-log.integration.test.mjs`

**What** :

- Ajouter ou ajuster un cas ciblé couvrant un achat où le total effectivement payé diffère du simple `price * quantity` (modificateur, arrondi ou cas équivalent déjà reproductible dans le flux).
- Vérifier explicitement que `creditDelta` et `snapshot.creditsDelta` restent alignés sur la même valeur dans l’entrée d’audit persistée.
- Mettre à jour uniquement les assertions impactées par cette unification, sans ouvrir un refactor plus large du Market ou du modèle Audit Log.

**Résultat attendu** : la divergence signalée par AL11 est couverte par des tests ciblés et ne peut plus réapparaître silencieusement.

## Périmètre / hors périmètre

### Inclus

- Unification de la source du delta crédits dans `recordItemPurchase`
- Préservation du contrat métier de l’entrée `item.purchase`
- Mise à jour ciblée des tests Audit Log / Market concernés

### Exclus

- Refonte du calcul de prix du Market
- Changement de sémantique des ventes ou d’autres types d’entrées d’audit
- Refactor large du système Audit Log au-delà du défaut AL11

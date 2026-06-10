# Issue #671 — Audit Log : étape 1 taxonomie et UI pour les obligations

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/671  
**Plan parent** : `documentation/plan/audit-log/obligation-audit-log-integration.md`  
**Domaine métier** : `audit-log`

## Goal

Livrer la première tranche de l’intégration Audit Log des obligations en ajoutant la taxonomie canonique, les libellés i18n et le rendu UI/chat nécessaires, sans encore brancher les hooks Item qui écriront les entrées.

## Contexte utile

- L’issue `#671` reprend explicitement l’**Étape 1 — Taxonomie et UI Audit Log** du cadrage `obligation-audit-log-integration.md`.
- `module/lib/audit/taxonomy.mjs` est la source de vérité métier pour les types, familles et descriptions Audit Log.
- `module/applications/character-audit-log.mjs` porte le filtre, l’icône de famille et le rendu visuel des entrées dans l’application.
- `module/utils/audit-log.mjs` reste responsable du contexte chat ; les événements obligation doivent y rester descriptifs (`xpDelta: 0`, `creditDelta: 0`) et ne jamais logger le HTML complet de `description`.

## Plan d’implémentation

### Étape 1 — Étendre la taxonomie et les labels des obligations

**Fichiers** : `module/lib/audit/taxonomy.mjs`, `lang/en.json`, `lang/fr.json`, `tests/lib/audit/taxonomy.test.mjs`

**What** :

- ajouter la famille `obligations` ;
- ajouter les types `obligation.create`, `obligation.update`, `obligation.delete` ;
- enregistrer leurs descriptions métier et le fallback `SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION` ;
- compléter les clés i18n `FILTER.OBLIGATIONS`, `TYPE.OBLIGATION_*`, `DESCRIPTION.OBLIGATION_*`.

**Résultat attendu** : la taxonomie Audit Log sait reconnaître et décrire les événements `obligation.*` sans duplication implicite.

### Étape 2 — Brancher le rendu application et chat sur la nouvelle taxonomie

**Fichiers** : `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs`, `tests/applications/character-audit-log.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- ajouter `obligations` dans `AUDIT_LOG_FILTER_ORDER` avec une icône de famille cohérente ;
- ajouter les branches `buildAuditLogEntryVisual()` pour `obligation.create/update/delete` avec variantes `add` / `change` / `remove` ;
- ajouter les entrées `CHAT_HANDLERS` correspondantes en gardant les bonus XP/crédits comme métadonnées descriptives, pas comme deltas de progression ;
- garantir qu’une modification de `description` reste signalée sans exposer son HTML en clair.

**Résultat attendu** : une entrée obligation déjà présente dans le journal serait lisible et filtrable de façon cohérente dans l’application et dans le chat.

### Étape 3 — Verrouiller la tranche 1 par tests ciblés

**Fichiers** : `tests/lib/audit/taxonomy.test.mjs`, `tests/applications/character-audit-log.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- couvrir les familles, types et descriptions `obligation.*` ;
- vérifier l’apparition du filtre `Obligations` et le rendu visuel attendu des trois variantes ;
- vérifier le contexte chat et le fallback inconnu, avec `xpDelta: 0` / `creditDelta: 0` et sans logging brut de `description`.

**Résultat attendu** : l’issue `#671` est livrable indépendamment des hooks Item prévus dans l’étape suivante du chantier parent.

## Périmètre / hors périmètre

### Inclus

- taxonomie `obligation.*`
- labels FR/EN associés
- filtre, icône et rendu application Audit Log
- handlers chat et tests ciblés de la tranche 1

### Exclus

- hooks `createItem` / `preUpdateItem` / `updateItem` / `deleteItem`
- écriture effective d’entrées obligation depuis les actions métier
- correction ADR-0025 ou refonte plus large du sous-système Audit Log

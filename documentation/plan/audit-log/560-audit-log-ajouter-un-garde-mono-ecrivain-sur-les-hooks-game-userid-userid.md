# Issue #560 — Audit Log : ajouter un garde mono-écrivain sur les hooks (`game.userId === userId`)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/560  
**Domaine métier** : `audit-log`

## Goal

Empêcher les doublons d’entrées Audit Log, de cartes de chat et de whispers GM en session multi-utilisateur en réservant la capture, la composition et l’écriture des logs au seul client initiateur de l’action.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` identifie **AL1 / AUDIT-01** comme défaut critique : les hooks d’audit s’exécutent sur tous les clients connectés et produisent des écritures/chats dupliqués.
- `module/utils/audit-log.mjs` concentre le flux concerné : `onPreUpdateActor()` alimente `pendingOldStates`, `onUpdateActor()` compose les entrées puis `writeLogEntries()` déclenche `actor.update()` et `sendChatForAuditEntries()`, et `onCreateItem()` écrit directement une entrée d’audit talent.
- `tests/utils/audit-log.test.mjs` couvre déjà les handlers et constitue le point naturel pour verrouiller la régression multijoueur sans étendre le périmètre.
- `module/documents/actor.mjs` applique déjà le pattern projet `if (game.userId === userId)` pour réserver des effets de bord au client initiateur ; l’issue peut s’aligner sur ce précédent.

## Plan d’implémentation

### Étape 1 — Appliquer le garde mono-écrivain sur les hooks d’audit

**Fichiers** : `module/utils/audit-log.mjs`

**What** :

- Introduire un garde explicite et homogène pour les hooks Audit Log basé sur `game.userId === userId`, puis l’appliquer au minimum à `onPreUpdateActor()`, `onUpdateActor()` et `onCreateItem()`.
- Faire en sorte que seul le client initiateur puisse alimenter `pendingOldStates`, composer les entrées, écrire `flags.swerpg.logs` et déclencher l’émission chat associée.
- Préserver les autres gardes existants (`swerpgAuditLog`, actor non-character, audit-only update) et ne pas modifier le schéma des entrées ni la stratégie de stockage actuelle.

**Résultat attendu** : un seul client produit l’effet de bord Audit Log pour une action donnée, avec conservation de l’attribution `userId` existante dans les entrées.

### Étape 2 — Verrouiller la non-régression multijoueur dans les tests d’audit

**Fichiers** : `tests/utils/audit-log.test.mjs`

**What** :

- Ajouter des tests ciblés démontrant qu’un client dont `game.userId !== userId` ne capture pas d’état pending, n’écrit pas dans l’acteur et n’émet pas d’effet de bord Audit Log sur `updateActor` et `createItem`.
- Ajouter le cas positif miroir confirmant que le client initiateur continue de produire exactement une écriture d’audit pour le même événement.
- Verrouiller le besoin métier prouvé par l’issue : absence de duplication, sans élargir la correction à l’intégrité du stockage, à l’export CSV ou à d’autres refactors d’architecture.

**Résultat attendu** : la protection mono-écrivain est couverte par des tests unitaires explicites et protège durablement le correctif contre une régression future.

## Périmètre / hors périmètre

### Inclus

- Garde mono-écrivain sur les hooks Audit Log concernés
- Tests unitaires ciblés sur le comportement multijoueur côté audit

### Exclus

- Refonte du stockage `flags.swerpg.logs` ou arbitrage d’inviolabilité du journal
- Migration de l’export CSV, refactor de taxonomie Audit Log, ou autres chantiers de backlog non requis par l’issue

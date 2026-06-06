# Issue #565 — Audit Log : corréler old/new par identifiant d’opération (ou purge sur update échouée)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/565  
**Domaine métier** : `audit-log`

## Goal

Éviter qu’un `oldState` capturé par `preUpdateActor()` soit réutilisé par la mauvaise mise à jour quand une update précédente échoue, afin de garantir que chaque entrée Audit Log compare bien le bon couple old/new.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` documente explicitement ce défaut sous **AL7** : la file pending est aujourd’hui FIFO par `actor:userId`, ce qui devient faux dès qu’une update rejetée laisse un `oldState` orphelin.
- `module/utils/audit-log.mjs` pousse actuellement les snapshots via `pushPendingEntry()` dans `onPreUpdateActor()`, puis consomme le plus ancien via `shiftPendingEntry()` dans `onUpdateActor()`.
- Le mono-writer (`game.userId === userId`), le TTL (`PENDING_TTL_MS`) et l’éviction (`evictOldestIfNeeded`) existent déjà ; le correctif doit préserver ces garde-fous tout en supprimant l’appariement FIFO fragile.
- `tests/utils/audit-log.test.mjs` couvre déjà la queue pending et les handlers `onPreUpdateActor()` / `onUpdateActor()` ; c’est le point naturel pour verrouiller la régression sans élargir le périmètre.

## Plan d’implémentation

### Étape 1 — Remplacer l’appariement FIFO par un appariement par opération

**Fichiers** : `module/utils/audit-log.mjs`

**What** :

- Introduire un identifiant d’opération interne partagé entre `preUpdateActor` et `updateActor` pour une même update, idéalement porté par `options`, puis stocké avec l’entrée pending.
- Remplacer la consommation “plus ancien snapshot de la file” par une récupération ciblée de l’entrée pending correspondant à cet identifiant d’opération.
- Conserver le TTL, l’éviction mémoire et le garde mono-écrivain ; utiliser la purge expirée comme filet de sécurité pour les updates rejetées qui ne déclenchent jamais `updateActor`.

**Résultat attendu** : une update réussie ne peut plus consommer le `oldState` d’une update précédente rejetée ou abandonnée.

### Étape 2 — Verrouiller la régression sur update rejetée puis update réussie

**Fichiers** : `tests/utils/audit-log.test.mjs`

**What** :

- Ajouter un test ciblé reproduisant la séquence métier problématique : un `preUpdateActor()` capture un snapshot, l’update associée échoue donc `onUpdateActor()` n’est jamais appelée, puis une seconde update valide survient rapidement.
- Vérifier que la seconde update corrèle son diff avec son propre `oldState`, et non avec le snapshot orphelin de la première tentative.
- Mettre à jour les tests de la pending queue pour refléter le nouveau contrat de corrélation par identifiant plutôt que le FIFO implicite actuel.

**Résultat attendu** : l’intégrité old/new de l’Audit Log reste correcte même en cas d’update rejetée suivie d’une nouvelle tentative immédiate.

## Périmètre / hors périmètre

### Inclus

- Corrélation fiable des snapshots pending pour `preUpdateActor` / `updateActor`
- Purge défensive des entrées pending orphelines via les mécanismes déjà en place
- Tests unitaires ciblés sur cette séquence d’échec puis retry

### Exclus

- Refonte du stockage `flags.swerpg.logs` ou de la structure des entrées d’audit
- Refonte UI de l’application Audit Log ou des cartes de chat
- Chantiers Audit Log non liés à l’appariement old/new (CSV, taxonomie, styling, etc.)

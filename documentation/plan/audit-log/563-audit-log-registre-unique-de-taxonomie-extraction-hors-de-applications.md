# Issue #563 — Audit Log : registre unique de taxonomie + extraction hors de `applications/`

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/563  
**Domaine métier** : `audit-log`

## Goal

Consolider la taxonomie Audit Log dans un registre métier unique pour supprimer les duplications labels/familles/descriptions/chat, lever l’inversion de couche entre `utils/` et `applications/`, et réduire le coût d’ajout d’un nouveau type d’événement à une seule édition.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` cadre précisément le besoin via **AL4**, **AL5** et **AL10** : taxonomie dupliquée, description métier logée dans `applications/`, et `switch` chat monolithique.
- `module/applications/character-audit-log.mjs` concentre aujourd’hui plusieurs sources de vérité : `AUDIT_LOG_TYPE_LABELS`, `getAuditLogFamily()`, `buildAuditLogDescription()` et une partie du rendu de variantes.
- `module/utils/audit-log.mjs` dépend actuellement de `../applications/character-audit-log.mjs` pour `buildAuditLogDescription()`, puis porte `_buildChatContext()` avec un `switch` long et coûteux à maintenir.
- `tests/applications/character-audit-log.test.mjs` couvre déjà la description, les familles et une partie du rendu ; c’est le point naturel pour verrouiller le nouveau contrat partagé sans élargir le périmètre.

## Plan d’implémentation

### Étape 1 — Introduire un registre métier partagé de taxonomie Audit Log

**Fichiers** : `module/lib/audit/taxonomy.mjs` _(nouveau)_, `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs`

**What** :

- Créer un module métier dédié exportant un registre unique `type -> { label, family, describe(), chatVariant }` pour tous les types d’événements Audit Log connus.
- Y déplacer la logique aujourd’hui dispersée entre `AUDIT_LOG_TYPE_LABELS`, `getAuditLogFamily()` et `buildAuditLogDescription()`, avec des fallbacks explicites pour les types inconnus.
- Faire de ce module la seule source de vérité consommable aussi bien par l’application Audit Log que par le pipeline d’écriture/chat.

**Résultat attendu** : tout ajout ou modification d’un type d’événement se fait dans un seul registre métier, sans duplication silencieuse entre UI, utilitaires et chat.

### Étape 2 — Rebrancher les consommateurs et lever l’inversion de couche

**Fichiers** : `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs`

**What** :

- Remplacer dans l’application les accès directs aux mappings locaux par des helpers basés sur le registre partagé, en conservant le contrat public nécessaire au rendu existant.
- Déplacer `buildAuditLogDescription()` hors de `applications/` et supprimer l’import `utils/ -> applications/` dans `module/utils/audit-log.mjs`.
- Limiter le refactor aux responsabilités de taxonomie/description afin de ne pas modifier le stockage, l’export CSV ni le flux d’écriture des entrées.

**Résultat attendu** : `module/utils/audit-log.mjs` ne dépend plus de la couche Application, et la description métier est réutilisable depuis une couche domaine neutre.

### Étape 3 — Remplacer le `switch` chat par une map de handlers adossée au registre et verrouiller les tests

**Fichiers** : `module/utils/audit-log.mjs`, `tests/applications/character-audit-log.test.mjs`, `tests/utils/audit-log.test.mjs` _(si couverture chat existante ou à compléter)_

**What** :

- Refactorer `_buildChatContext()` en map de handlers indexée par type, avec lecture des métadonnées (`label`, `family`, `chatVariant`) depuis le registre unique.
- Conserver à l’identique le rendu fonctionnel attendu des cartes de chat pour éviter tout changement de comportement hors périmètre.
- Mettre à jour/ajouter des tests ciblés pour garantir : source de vérité unique, description extraite hors de `applications/`, et couverture de plusieurs branches chat représentatives sans retomber dans un `switch` monolithique.

**Résultat attendu** : le rendu chat devient extensible type par type, et le contrat métier de taxonomie est protégé par des tests explicites côté application et côté utilitaires.

## Périmètre / hors périmètre

### Inclus

- Registre unique de taxonomie Audit Log
- Extraction de la description métier hors de `applications/`
- Refactor ciblé du rendu chat vers une map de handlers
- Mise à jour ciblée des tests liés à la taxonomie et au chat

### Exclus

- Refonte du stockage `flags.swerpg.logs`, de l’export CSV ou des règles d’intégrité du journal
- Changement fonctionnel des textes, filtres ou variantes chat au-delà de la consolidation demandée
- Ajout de nouveaux types d’événements non requis par l’issue

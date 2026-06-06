# Issue #567 — Audit Log : surveiller/segmenter la volumétrie du journal sur l’acteur

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/567  
**Domaine métier** : `audit-log`

## Goal

Réduire le coût de synchronisation du journal Audit Log stocké sur l’acteur quand sa volumétrie augmente, sans perdre les capacités actuelles de consultation, filtrage, export CSV et rétention pilotée par `auditLogMaxEntries`.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` cadre déjà ce sujet via **AL9 / AUDIT-09** : le journal reste stocké sur l’acteur, est resynchronisé aux clients à chaque update, et peut monter jusqu’à 500–5000 entrées.
- `module/utils/audit-log.mjs` append aujourd’hui les nouvelles entrées dans `flags.swerpg.logs`, puis réécrit le tableau complet en appliquant une FIFO bornée par `auditLogMaxEntries`.
- `module/applications/character-audit-log.mjs` et `buildCsvContent()` lisent directement ce tableau plat ; toute évolution de stockage doit donc rester transparente pour l’UI, les filtres et l’export.
- `tests/utils/audit-log.test.mjs`, `tests/applications/character-audit-log.test.mjs` et `tests/integration/market-audit-log.integration.test.mjs` sont déjà les garde-fous naturels pour verrouiller la compatibilité fonctionnelle.

## Plan d’implémentation

### Étape 1 — Introduire un contrat de stockage segmenté compatible avec l’historique existant

**Fichiers** : `module/utils/audit-log.mjs`, `module/applications/character-audit-log.mjs` ou un helper dédié `module/lib/audit/storage.mjs` _(nouveau)_

**What** :

- Définir une représentation segmentée de l’historique sur l’acteur (index + segments bornés) afin d’éviter de réécrire un tableau monolithique à chaque append.
- Ajouter des helpers uniques pour lire l’historique agrégé, append de nouvelles entrées, tronquer selon `auditLogMaxEntries`, et relire les mondes existants encore au format plat `flags.swerpg.logs`.
- Conserver `auditLogMaxEntries` comme plafond fonctionnel total, sans changer le contrat utilisateur existant ni imposer un nouveau réglage si un découpage interne suffit.

**Résultat attendu** : le sous-système peut stocker et relire un journal volumineux via des segments internes, sans casser les acteurs déjà persistés au format historique.

### Étape 2 — Brancher la surveillance de volumétrie et rendre les consommateurs transparents

**Fichiers** : `module/utils/audit-log.mjs`, `module/applications/character-audit-log.mjs`, éventuellement `module/applications/settings/settings.js` seulement si un seuil configurable s’avère nécessaire

**What** :

- Centraliser le calcul de métriques utiles (nombre total d’entrées, nombre de segments, proximité du plafond configuré, taille approximative du payload réécrit) et journaliser un signal explicite quand le journal approche de ses limites.
- Faire consommer ces helpers par l’application Audit Log et l’export CSV pour que tri, filtrage, compteurs et export continuent de travailler sur une vue agrégée, indépendamment du format segmenté sous-jacent.
- Limiter le scope à la volumétrie/stockage du journal, sans rouvrir la taxonomie, le chat summary, ni les durcissements CSV déjà traités ailleurs.

**Résultat attendu** : la volumétrie devient observable et la segmentation reste invisible pour les usages existants de consultation et d’export.

### Étape 3 — Verrouiller la non-régression sur rétention, compatibilité et lecture agrégée

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/applications/character-audit-log.test.mjs`, `tests/integration/market-audit-log.integration.test.mjs` _(si un flux réel d’écriture/lecture doit être couvert)_

**What** :

- Ajouter des tests ciblés couvrant : lecture d’un ancien acteur au format plat, création/rotation de segments, conservation des N dernières entrées selon `auditLogMaxEntries`, et absence de duplication/perte lors d’un append multi-entrées.
- Étendre les tests applicatifs pour garantir que `buildAuditLogEntries()` et `buildCsvContent()` restituent exactement la même vue métier depuis un stockage segmenté.
- Vérifier explicitement que le contrat existant côté UI/export reste inchangé alors que le format de persistance évolue.

**Résultat attendu** : la segmentation et la surveillance de volumétrie sont couvertes par des tests qui protègent la compatibilité descendante et les usages Audit Log déjà livrés.

## Périmètre / hors périmètre

### Inclus

- Stockage segmenté et compatible du journal Audit Log sur l’acteur
- Surveillance ciblée de la volumétrie et des seuils
- Mise à jour des tests liés à la persistance, à la lecture et à l’export

### Exclus

- Déplacement du journal vers un stockage monde/serveur externe à l’acteur
- Refonte UI générale du journal Audit Log
- Changements de taxonomie, de chat ou de permissions d’accès

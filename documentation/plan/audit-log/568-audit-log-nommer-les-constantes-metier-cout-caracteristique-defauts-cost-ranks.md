# Issue #568 — Audit Log : nommer les constantes métier (coût caractéristique, défauts `cost` / `ranks`)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/568  
**Domaine métier** : `audit-log`

## Goal

Aligner le flux Audit Log sur l’ADR-0018 en supprimant les derniers littéraux métier ciblés (`10`, `5`, `1`) sans changer le comportement fonctionnel des entrées d’audit déjà produites.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` identifie ce défaut via **AL12**.
- `module/utils/audit-diff.mjs` calcule encore le coût de caractéristique via `newValue * 10`.
- `module/config/progression.mjs` expose déjà la constante canonique `CHARACTERISTIC_RANK_COST_MULTIPLIER = 10`, ainsi que le namespace `SYSTEM.PROGRESSION` destiné à ce type de règle métier.
- `module/utils/audit-log.mjs` utilise encore des fallbacks inline dans `onCreateItem()` : `item.system?.cost ?? 5` et `item.system?.ranks ?? 1`.
- `tests/utils/audit-diff.test.mjs`, `tests/utils/audit-log.test.mjs` et `tests/config/progression.test.mjs` constituent les points naturels pour verrouiller le contrat sans élargir le périmètre.

## Plan d’implémentation

### Étape 1 — Centraliser les règles métier ciblées dans la configuration canonique

**Fichiers** : `module/config/progression.mjs`, `module/config/system.mjs`, `tests/config/progression.test.mjs`

**What** :

- Réutiliser la constante existante `CHARACTERISTIC_RANK_COST_MULTIPLIER` comme source de vérité du coût de caractéristique au lieu de conserver un `10` inline dans l’audit.
- Ajouter dans `module/config/progression.mjs` les constantes nommées manquantes pour les fallbacks de talent purchase audit (coût par défaut et rangs par défaut), puis les exposer via `SYSTEM.PROGRESSION` conformément à l’ADR-0018.
- Étendre les tests de configuration pour verrouiller les valeurs exportées et leur exposition via `SYSTEM`, sans introduire de doublon sémantique avec une constante déjà existante.

**Résultat attendu** : chaque valeur métier visée par l’issue possède une source de vérité explicite dans `module/config/`.

### Étape 2 — Rebrancher l’audit sur ces constantes et préserver le comportement actuel

**Fichiers** : `module/utils/audit-diff.mjs`, `module/utils/audit-log.mjs`, `tests/utils/audit-diff.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- Remplacer dans `computeCharacteristicCost()` le littéral `10` par la constante canonique de progression.
- Remplacer dans `onCreateItem()` les fallbacks inline `5` / `1` par les nouvelles constantes nommées, tout en conservant à l’identique `cost`, `ranks` et `xpDelta` dans les entrées `talent.purchase`.
- Mettre à jour les tests ciblés pour démontrer que le comportement reste inchangé (coût caractéristique 30/40, fallback talent purchase 5/1) tout en supprimant la dépendance aux magic numbers dans l’implémentation.

**Résultat attendu** : l’audit reste fonctionnellement identique, mais les règles métier ciblées sont désormais lisibles, centralisées et protégées par des tests.

## Périmètre / hors périmètre

### Inclus

- Remplacement des littéraux métier ciblés par l’issue
- Réutilisation de la constante de progression déjà existante pour le coût de caractéristique
- Ajout ciblé des constantes manquantes pour les fallbacks `cost` / `ranks`
- Mise à jour ciblée des tests de configuration et d’audit concernés

### Exclus

- Changement des valeurs métier elles-mêmes
- Refactor large d’Audit Log, du stockage, du chat ou des hooks
- Revue exhaustive d’autres seuils déjà nommés (`MAX_PENDING`, TTL, etc.) au-delà de la vérification de non-régression demandée

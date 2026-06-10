# Issue #672 — Étape 2 hooks Item et écriture Audit Log pour les obligations

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/672  
**Plan parent** : `documentation/plan/audit-log/obligation-audit-log-integration.md`  
**Domaine métier** : `audit-log`

## Goal

Livrer la deuxième tranche de l’intégration Audit Log des obligations en branchant les hooks `Item` qui écrivent effectivement les entrées `obligation.create`, `obligation.update` et `obligation.delete`, sans toucher au DataModel `obligation`.

## Contexte utile

- L’issue `#672` reprend explicitement l’**Étape 2 — Hooks Item obligations** du cadrage `obligation-audit-log-integration.md`.
- La taxonomie, les labels et le rendu UI/chat sont déjà cadrés par `documentation/plan/audit-log/671-etape-1-taxonomie-et-ui-audit-log-pour-les-obligations.md`.
- `module/utils/audit-log.mjs` reste l’adapter Foundry responsable de `makeEntry()`, `captureSnapshot()` et `writeLogEntries()` ; la logique obligation doit y rester tolérante aux échecs et mono-écrivain.

## Plan d’implémentation

### Étape 1 — Étendre les hooks Item pour créer et supprimer les entrées obligation

**Fichiers** : `module/utils/audit-log.mjs`, `tests/utils/audit-log.test.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- étendre `onCreateItem` pour écrire `obligation.create` quand l’item embarqué appartient à un acteur `character` et que `item.type === 'obligation'` ;
- ajouter `onDeleteItem` pour écrire `obligation.delete` avec les métadonnées utiles (`obligationId`, `obligationName`, valeur, bonus éventuels) ;
- appliquer les guards communs (`game.userId === userId`, `options?.swerpgAuditLog !== false`, item embarqué valide) et ne jamais casser l’action métier si l’écriture échoue ;
- préserver le comportement existant des autres flux, notamment `talent.purchase`.

**Résultat attendu** : la création et la suppression d’une obligation produisent des entrées Audit Log dédiées sans doublon multi-client ni régression des hooks existants.

### Étape 2 — Capturer l’ancien état et écrire les updates obligation

**Fichiers** : `module/utils/audit-log.mjs`, `module/lib/audit/obligation-events.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- introduire un stockage pending corrélé par `item.uuid:userId` et `_swerpgOpId` pour capturer l’état avant `updateItem` ;
- brancher `onPreUpdateItem` / `onUpdateItem` pour comparer ancien et nouvel état d’une obligation et n’écrire `obligation.update` que sur les changements métier pertinents ;
- normaliser les données obligation dans un helper pur dédié si nécessaire afin d’isoler la détection des champs modifiés et d’éviter d’exposer le HTML brut de `description`.

**Résultat attendu** : une modification pertinente d’obligation écrit une entrée `obligation.update` lisible, corrélée au bon état précédent et sans fuite de contenu HTML complet.

### Étape 3 — Verrouiller le flux par tests ciblés de hooks et de garde

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- couvrir la création narrative, la création d’obligation extra, la suppression et l’update des champs métier (`system.value`, `system.campaignDelta`, bonus de création) ;
- vérifier qu’un item non-obligation ne produit rien, que `swerpgAuditLog: false` désactive le flux et que `game.userId !== userId` évite les doublons ;
- vérifier qu’une mise à jour de description reste descriptive sans logger son HTML complet et que le flux existant des talents reste intact.

**Résultat attendu** : l’issue `#672` est livrable indépendamment, avec des hooks obligations sécurisés, testés et compatibles avec la tranche UI/taxonomie déjà planifiée.

## Périmètre / hors périmètre

### Inclus

- hooks `createItem` / `preUpdateItem` / `updateItem` / `deleteItem` pour les obligations ;
- écriture effective des événements `obligation.create/update/delete` ;
- guards mono-écrivain, anti-récursion et tests ciblés associés.

### Exclus

- nouvelle taxonomie, nouveaux labels ou rendu UI/chat hors ajustement strictement nécessaire ;
- ajout de champs au DataModel `obligation` ;
- correction ADR-0025 ou refonte plus large du sous-système Audit Log.

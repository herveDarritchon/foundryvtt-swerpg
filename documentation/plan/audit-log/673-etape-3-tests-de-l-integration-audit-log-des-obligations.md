# Issue #673 — Étape 3 tests de l’intégration Audit Log des obligations

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/673  
**Plan parent** : `documentation/plan/audit-log/obligation-audit-log-integration.md`  
**Domaine métier** : `audit-log`

## Goal

Livrer une tranche de tests ciblés qui verrouille l’intégration Audit Log des obligations sur la taxonomie, le helper pur, les hooks d’écriture et le rendu UI, sans élargir le périmètre fonctionnel.

## Contexte utile

- L’issue `#673` reprend explicitement l’**Étape 3 — Tests** du cadrage `obligation-audit-log-integration.md`.
- Les tranches `#671` et `#672` ont déjà cadré la taxonomie/UI puis les hooks `Item` et l’écriture des entrées `obligation.*`.
- Le helper pur `module/lib/audit/obligation-events.mjs` existe et mérite une couverture dédiée pour isoler les règles métier de normalisation et de diff.

## Plan d’implémentation

### Étape 1 — Verrouiller la taxonomie et le helper pur

**Fichiers** : `tests/lib/audit/taxonomy.test.mjs`, `tests/lib/audit/obligation-events.test.mjs`

**What** :

- couvrir `AUDIT_LOG_FAMILIES.obligations`, les types `obligation.create/update/delete` et leur rattachement à la famille `obligations` ;
- vérifier que `buildAuditLogDescriptionFromRegistry()` produit des descriptions lisibles avec fallback `UNKNOWN_OBLIGATION` ;
- verrouiller le helper pur sur les champs métier significatifs, la détection de changements et la non-exposition du HTML complet de `description`.

**Résultat attendu** : les invariants métier de taxonomie et de composition des données obligation sont protégés avant de tester l’adapter Foundry.

### Étape 2 — Couvrir les hooks d’écriture et les gardes de flux

**Fichiers** : `tests/utils/audit-log.test.mjs`

**What** :

- couvrir `obligation.create`, `obligation.update` et `obligation.delete` pour obligation narrative et obligation extra ;
- vérifier les métadonnées utiles (`isExtra`, `extraXp`, `extraCredits`, `system.value`, `system.campaignDelta`) et la non-régression `talent.purchase` ;
- verrouiller les gardes `swerpgAuditLog: false`, `game.userId !== userId`, item non-obligation, acteur non-`character`, et absence de snapshot pending.

**Résultat attendu** : le flux d’écriture Audit Log des obligations est testé de bout en bout côté hooks, sans doublons multi-client ni régression des flux existants.

### Étape 3 — Verrouiller le rendu application et les flows pilotés par sheet

**Fichiers** : `tests/applications/character-audit-log.test.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs` _(si le niveau sheet reste la meilleure preuve d’intégration)_

**What** :

- vérifier que le filtre `Obligations` apparaît, compte correctement les entrées et classe `obligation.*` dans la bonne famille ;
- couvrir les variantes visuelles `add` / `change` / `remove` et les fallbacks d’affichage quand `obligationName` manque ;
- compléter seulement si nécessaire les tests sheet pour prouver que les flows utilisateur obligations déclenchent toujours le bon audit sans couplage excessif à l’UI.

**Résultat attendu** : l’intégration obligations reste lisible et filtrable dans l’application Audit Log, avec une couverture d’intégration cohérente entre niveau applicatif et niveau sheet.

## Périmètre / hors périmètre

### Inclus

- tests Vitest taxonomie, helper pur, hooks Audit Log et UI Audit Log ;
- non-régressions `talent.purchase` et gardes anti-doublon / anti-récursion ;
- vérification explicite de l’absence de logging brut du HTML de `description`.

### Exclus

- modification du DataModel `obligation` ;
- refonte fonctionnelle de l’Audit Log ;
- ajout de nouvelles familles, nouveaux handlers ou nouveaux comportements métier hors manque strictement révélé par les tests.

## Validation visée

```bash
pnpm vitest run tests/lib/audit/taxonomy.test.mjs
pnpm vitest run tests/lib/audit/obligation-events.test.mjs
pnpm vitest run tests/utils/audit-log.test.mjs
pnpm vitest run tests/applications/character-audit-log.test.mjs
pnpm vitest run tests/applications/sheets/character-sheet-commitments.test.mjs
```

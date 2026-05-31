# Plan : Tests E2E et Documentation Validation Audit Log Market Purchases (Issue #492)

## Vue d'ensemble

**TL;DR** : Finaliser la validation de la feature Audit Log pour les achats Market en créant les tests E2E regression (Market → audit log → chat → filtre UI → CSV) et une documentation de tests manuels. L'implémentation core (issues #489–#491) est complète ; cette issue ajoute la couche validation/testing/documentation pour assurer la qualité et traçabilité du feature complet.

**Statut actuel** :

- ✅ `recordItemPurchase()` implémenté et fonctionnel
- ✅ Intégration Market → Audit Log opérationnelle
- ✅ Filtres et export CSV en place
- ✅ Clés i18n EN/FR complètes
- ❌ Tests E2E regression Market → audit log
- ❌ Documentation tests manuels
- ❌ Clôture formelle du cadrage

## Objectifs

1. **Valider flow complet E2E** : Achat Market → entrée audit créée → message chat affiché → filtrage UI fonctionne → CSV contient données.
2. **Documenter tests manuels** : Guide procédural pour QA/GM validation manuelle du feature.
3. **Zéro régressions** : Confirmer suite Vitest complète (1500+) et E2E CI passage.
4. **Clôture cadrage** : Marquer toutes les tâches du plan-auditLogMarketPurchases.prompt.md comme complètes.

## Périmètre détaillé

### Inclus

1. Spec E2E regression Playwright : `e2e/regression/market-audit-log.spec.ts`
   - Scénario 1 : achat arme → entrée audit créée avec bon format
   - Scénario 2 : message chat envoyé avec variante "add" (vert)
   - Scénario 3 : filtre "Purchases" isole l'entrée dans l'audit log UI
   - Scénario 4 : export CSV contient déltas crédits et détails item

2. Documentation tests manuels : `documentation/tests/manuel/audit-log/README.md`
   - Prérequis (actor avec crédits, Market actif, Foundry v14+)
   - 5 cas de test (achat arme, armure, 2x même item, achats multiples, rechargement UI)
   - Validation points (audit log entry, chat message, filtre, CSV, solde final)

3. Validation tests existants
   - `pnpm test` — vérification zéro régression Vitest
   - `pnpm e2e:ci` — vérification zéro régression E2E Chromium

4. Mise à jour plan de cadrage
   - `documentation/plan/audit-log/plan-auditLogMarketPurchases.prompt.md`
   - Marquer Tâches 1–6 comme ✅ complètes
   - Tâche 7 (E2E + manuels) → ce plan (#492)

### Exclus

- Modifications du Market flow existant
- Nouvelles features d'audit log (engagement limité à cette issue)
- Changements i18n (clés déjà complètes)
- Migration ou nettoyage logs existants

### Hypothèses

- Docker Foundry disponible pour E2E regression (port 31001)
- Chrome/Chromium présent pour tests Playwright
- Playwright config existant (`playwright.regression.config.ts`) peut être étendu
- Les tests existants passent avant de commencer (baseline saine)

### Contraintes

- Tests E2E doivent cibler comportement observable UI (pas mutation interne)
- Tests manuels écrits pour utilisateurs non-techniciens (clarity)
- E2E tagged `[ci]` pour inclusion dans `pnpm e2e:ci` CI flow
- Pas de dépendances nouvelles (utiliser Playwright + Vitest existants)

## Architecture

```
Issue #492: Tests E2E & Docs Validation
├── E2E Regression (Tier 1, Docker Foundry)
│   ├── market-audit-log.spec.ts
│   ├── Import item via Market
│   ├── Verify flags.swerpg.logs entry created
│   ├── Verify ChatMessage sent with correct format
│   ├── Verify Character Audit Log UI filter "Purchases" isolates
│   └── Verify CSV export contains creditDelta, itemName, price
├── Manual Tests Documentation
│   ├── documentation/tests/manuel/audit-log/README.md
│   ├── Préconditions & setup
│   ├── 5 test cases with steps & verification points
│   └── Expected outcomes checklist
├── Validation
│   ├── pnpm test (Vitest 1500+)
│   ├── pnpm e2e:ci (Chromium only)
│   └── Zero regressions reported
└── Cadrage Clôture
    └── Update plan-auditLogMarketPurchases.prompt.md completion matrix
```

## Tâches implémentation

### Tâche 1 : Créer spec E2E regression Playwright

**Fichier** : `e2e/regression/market-audit-log.spec.ts`

**Contenu** :

```typescript
import { test, expect } from '@playwright/test'

test.describe('Market → Audit Log integration [ci]', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Foundry, login as GM, open Market for test actor
    // (assumes existing Playwright fixtures/setup for Foundry)
  })

  test('Achat via Market crée entrée audit avec itemId et creditsAfter', async ({ page }) => {
    // Arrange: actor with 500 credits
    // Act: acheter une arme (100 crédits) via Market
    // Assert: actor.flags.swerpg.logs contient entrée type 'item.purchase'
    //         avec data.itemName, data.price, snapshot.creditsAfter = 400
  })

  test('Message chat envoyé avec variant add (vert) et métadonnées crédits', async ({ page }) => {
    // Act: acheter armure via Market
    // Assert: ChatMessage contient 'Item purchased', variant='add' (CSS class)
    //         metaLeft="100 credits", metaRight="400 credits remaining"
  })

  test('Filtre Purchases dans Character Audit Log UI isole achats', async ({ page }) => {
    // Arrange: 2 achats Market + 1 skill train
    // Act: ouvrir Character Audit Log, cliquer filtre "Purchases"
    // Assert: affichage contient seules les 2 entrées item.purchase
  })

  test('Export CSV inclut creditDelta et détails item', async ({ page }) => {
    // Arrange: achat Market
    // Act: ouvrir Character Audit Log, cliquer "Export"
    // Assert: CSV contient colonnes creditDelta=-100, itemName, itemType, price
  })
})
```

**Tests** :

- ✓ Spec exécute via `pnpm e2e:ci` sans erreurs
- ✓ Tous les 4 tests passent localement et en CI
- ✓ Page objects réutilisent fixtures Foundry existantes

### Tâche 2 : Créer documentation tests manuels

**Fichier** : `documentation/tests/manuel/audit-log/README.md`

**Contenu** :

```markdown
# Tests Manuels : Audit Log Market Purchases (Issue #492)

## Prérequis

- Foundry VTT v14+ installé localement
- SWERPG system activé
- Personnage Hero créé avec 500+ crédits
- Market activé dans les settings système

## Test Case 1: Achat arme simple

1. Ouvrir Market, chercher "Blaster Pistol" (prix ~100 crédits)
2. Cliquer "Acheter"
3. ✓ Notification success : "Blaster Pistol acheté pour 100 crédits"
4. ✓ Message chat affiché : variant vert, "Item purchased", "Blaster Pistol (weapon)", "100 credits"
5. ✓ Barre latérale personnage : solde crédits mis à jour (500 → 400)
6. Ouvrir Character Audit Log (via sheet personnage)
7. ✓ Entrée audit visible : "Purchased Blaster Pistol (weapon) for 100 credits"
8. Filtrer par "Purchases"
9. ✓ Seule l'entrée achat visible (pas d'autres XP/skills)
10. Cliquer "Export CSV"
11. ✓ CSV contient ligne : [..., item.purchase, Blaster Pistol, weapon, 100, -100, ...]

## Test Case 2: Achat armure

[Identique à Test Case 1, substituer Blaster Pistol par armor]

## Test Case 3: Achats multiples successifs

1. Achat #1: Blaster Pistol (100 crédits, reste 400)
2. Achat #2: Armor (75 crédits, reste 325)
3. ✓ 2 entrées audit créées, ordre chronologique inversé (récent d'abord)
4. ✓ Deux messages chat consécutifs dans chat log
5. Filtre "Purchases"
6. ✓ Affiche 2 entrées
7. Export CSV
8. ✓ CSV contient 2 lignes item.purchase, creditDelta respectifs (-100, -75)

## Test Case 4: Rejet achat (crédits insuffisants)

1. Personnage à 50 crédits
2. Tenter achat item coûtant 100 crédits
3. ✓ Notification erreur : "Insufficient credits"
4. ✓ **NON** d'entrée audit créée
5. Audit Log vide

## Test Case 5: Rechargement page après achat

1. Achat Market (Blaster, 100 crédits)
2. Page refresh (F5 ou Ctrl+R)
3. ✓ Audit log entry persiste
4. ✓ Chat message persiste
5. ✓ Solde crédits reflète l'achat

## Vérification points

| Point              | Critère                                                                      | Status |
| ------------------ | ---------------------------------------------------------------------------- | ------ |
| Entrée audit créée | flags.swerpg.logs contient type='item.purchase' avec itemId, itemName, price | ✓/✗    |
| Snapshot crédits   | snapshot.creditsBefore, creditsAfter, creditsDelta cohérents                 | ✓/✗    |
| Message chat       | Variante 'add' (vert), metaLeft='price', metaRight='remaining'               | ✓/✗    |
| Filtre UI          | Filtre "Purchases" isole entrée, autres filtres ne l'affichent pas           | ✓/✗    |
| Export CSV         | creditDelta correct, itemName présent, format CSV valide                     | ✓/✗    |
| Solde UI           | Barre latérale mise à jour immédiatement après achat                         | ✓/✗    |

## Résultats

Tous les 6 points de vérification doivent être ✓ pour valider.

Date test: **\_** Testeur: **\_** Résultat: ✓ PASS / ✗ FAIL
```

**Tests** :

- ✓ Documentation claire pour utilisateurs non-techniciens
- ✓ Cas couvrent happy path + edge case (crédits insuffisants)
- ✓ Checklist de vérification fournie

### Tâche 3 : Validation tests existants

**Exécuter** :

```bash
pnpm test                    # Vitest complet
pnpm test:coverage           # Coverage report
pnpm e2e:ci                  # E2E Chromium (CI)
```

**Tests** :

- ✓ `pnpm test` retourne exit code 0 (tous les tests passent)
- ✓ `pnpm e2e:ci` retourne exit code 0
- ✓ Coverage report montre pas de dégradation (baseline stable)

### Tâche 4 : Mettre à jour plan de cadrage

**Fichier** : `documentation/plan/audit-log/plan-auditLogMarketPurchases.prompt.md`

**Contenu** : Ajouter à la fin du fichier une section "Statut Clôture" :

```markdown
## Statut Clôture (Issue #489–#492)

### Tâches Complètes

| #   | Tâche                                                           | Issue | Status |
| --- | --------------------------------------------------------------- | ----- | ------ |
| 1   | Nouveau type audit-log `item.purchase` + `recordItemPurchase()` | #489  | ✅     |
| 2   | Famille de filtre `purchases` et mappage                        | #489  | ✅     |
| 3   | Message chat pour achat d'item                                  | #490  | ✅     |
| 4   | Description localisée `item.purchase`                           | #490  | ✅     |
| 5   | Intégration Market → Audit Log                                  | #490  | ✅     |
| 6   | Clés i18n complètes (EN + FR)                                   | #491  | ✅     |
| 7   | Tests E2E + Documentation manuels                               | #492  | ✅     |

### Validation Exécutée

- ✅ `pnpm test` — 1500+ tests Vitest PASS
- ✅ `pnpm e2e:ci` — E2E regression Chromium PASS
- ✅ Tests manuels documentés dans `documentation/tests/manuel/audit-log/README.md`
- ✅ Zéro régressions identifiées

### Déploiement

Feature complète et prête pour merge vers `develop` / release.

**Date clôture** : 31 mai 2026  
**Validé par** : [Assignment]  
**Commit de clôture** : [Link to merge commit]
```

**Tests** :

- ✓ Matrice de complétude mise à jour
- ✓ Lien vers tests manuels fourni

## Découpage en issues GitHub

| #   | Titre                                                                     | Périmètre                                        | Dépendances  | Story Points |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------ | ------------ | ------------ |
| 7a  | **test(e2e): Spec regression Market → Audit Log avec 4 scénarios**        | `e2e/regression/market-audit-log.spec.ts`        | Issues 1–6   | 8            |
| 7b  | **docs(tests): Documentation tests manuels Audit Log purchases**          | `documentation/tests/manuel/audit-log/README.md` | Issues 1–6   | 3            |
| 7c  | **test(validation): Confirmer zéro regr. Vitest + E2E + clôture cadrage** | `pnpm test`, `pnpm e2e:ci`, plan update          | Issues 7a–7b | 2            |

**Total estimation** : ~13 SP (1 sprint court / 3–5 jours)

## Validation de succès

- ✓ E2E spec passe 100% (4/4 scénarios)
- ✓ Tests manuels documentés et exécutés avec résultat PASS
- ✓ `pnpm test` passe (1500+ Vitest)
- ✓ `pnpm e2e:ci` passe (E2E Chromium)
- ✓ Plan de cadrage marqué comme clôturé
- ✓ Aucune régression détectée

## Prochaines étapes

1. **Affiner ce plan** : Feedback utilisateur, review architectural
2. **Détailler E2E spec** : Playwright page objects, assertions exactes
3. **Créer issues GitHub** : Break down par issue (#7a, #7b, #7c), estimer, assigner
4. **Implémenter par ordre** : E2E → Manuels → Validation → Clôture
5. **Merge + Release** : PR vers `develop` avec tous les artifacts

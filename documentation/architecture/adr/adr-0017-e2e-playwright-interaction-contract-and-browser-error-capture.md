---
title: "ADR-0017: Contrat d'interaction E2E et capture centralisée des erreurs navigateur"
status: 'Accepted'
date: '2026-05-24'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'testing', 'e2e', 'playwright', 'quality', 'browser-errors']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Implémenté dans le cadre de l'issue #368 (PWE2). Applicable à toutes les specs E2E Playwright du projet.

## Context

Le projet dispose d'une suite E2E Playwright à deux niveaux :

- **Tier 1 — Regression** (`e2e/regression/specs/`) : validation fonctionnelle pré-livraison, instance dédiée port 31001.
- **Tier 2 — Smoke** (`e2e/smoke/`) : vérification de surface lecture-seule sur l'instance de production port 30000.

Avant cette décision, chaque spec pouvait brancher ses propres listeners `page.on('console')` et `page.on('pageerror')` de façon ad hoc. La conséquence était :

- détection des erreurs navigateur **non garantie** sur les specs qui ne l'implémentaient pas ;
- duplication de logique de filtrage entre specs ;
- patterns incohérents selon les auteurs (listener local vs fixture, reset oublié, filtres différents) ;
- helpers d'interaction (Settings, session Foundry) réimplémantés dans certains tests plutôt que partagés.

Il manquait un contrat explicite définissant ce que chaque spec **doit** et **ne doit pas** faire.

## Decision

### 1. Capture centralisée des erreurs navigateur

Un utilitaire unique `e2e/utils/browserErrors.ts` expose `createBrowserErrorCollector(page)`.

- Écoute `console.error` et `pageerror` dès l'appel.
- Filtre automatiquement les bruits connus (`KNOWN_NOISE_PATTERNS`) : favicon, chrome-extension, moz-extension, modules Foundry manquants.
- Expose `assertNoErrors(context?)` — lève une erreur Playwright si une erreur non filtrée a été captée.
- Expose `reset()` — vide le buffer (utilisé par les fixtures entre setUp et début du test).

### 2. Branchement automatique dans les fixtures

Les fixtures `worldReady` (`e2e/fixtures/index.ts`) et `smokeReady` (`e2e/smoke/fixtures.ts`) :

1. Créent un collecteur (`createBrowserErrorCollector`) **avant** le setUp.
2. Appellent `reset()` après que le setUp est terminé (purge les erreurs de démarrage connues).
3. Appellent `assertNoErrors` dans le `use` post-test — l'assertion fait échouer le test si une erreur non autorisée a été captée pendant le scénario.

Pour `smokeReady`, l'assertion est conditionnelle : elle ne s'exécute que si le monde est configuré et que la page est en `/game` (pour ne pas faire échouer des runs smoke partiels où le monde n'est pas prêt).

### 3. Contrat d'interaction partagé

Toutes les interactions critiques avec Foundry VTT doivent passer par les helpers communs :

| Besoin                                                   | Helper                        | Fichier                                    |
| -------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| Bootstrap complet (licence → auth → setup → join → game) | `setUp` / `tearDown`          | `e2e/utils/playwrightTest.ts`              |
| Vérifier session active `/game`                          | `ensureSessionActive`         | `e2e/utils/foundryUI.ts`                   |
| Ouvrir l'onglet Game Settings                            | `openGameSettings`            | `e2e/utils/foundryUI.ts`                   |
| Naviguer vers settings d'un système                      | `navigateToSystemSettings`    | `e2e/utils/foundryUI.ts`                   |
| Ouvrir le dialog OggDude                                 | `openOggDudeImporterDialog`   | `e2e/regression/utils/oggdude-importer.ts` |
| Capturer les erreurs navigateur                          | `createBrowserErrorCollector` | `e2e/utils/browserErrors.ts`               |

Les helpers ne doivent pas être réimplémentés dans les specs. Si un helper manque, il doit être ajouté dans le fichier centralisé.

### 4. Règles négatives (interdits dans les specs)

- Pas de `page.on('console')` ou `page.on('pageerror')` ad hoc dans les specs — la fixture s'en charge.
- Pas de `waitForTimeout` pour la synchronisation — assertions web-first uniquement.
- Pas de `click({ force: true })` sans justification écrite dans la spec.
- Pas d'import de fixture locale — toujours utiliser `../../fixtures` (regression) ou `./fixtures` (smoke).

### 5. Politique d'évolution de `KNOWN_NOISE_PATTERNS`

Chaque ajout à la liste de filtrage dans `browserErrors.ts` **doit** être accompagné d'un commentaire expliquant pourquoi ce bruit est ignoré. La liste ne doit jamais être élargie pour masquer une vraie régression.

## Consequences

### Positive

- **POS-001** : Détection des erreurs navigateur **garantie** pour toutes les specs regression et legacy sans code additionnel dans chaque spec.
- **POS-002** : Zéro duplication de logique de capture/filtrage entre specs.
- **POS-003** : Contrat explicite et documenté — une nouvelle spec sait exactement ce qu'elle doit et ne doit pas faire (checklist dans `e2e/README.md` et `playwright-e2e-guide.md` §6).
- **POS-004** : Interactions critiques Foundry centralisées — maintenabilité améliorée lors d'évolutions de l'UI Foundry.
- **POS-005** : Specs plus courtes et plus lisibles — pas de boilerplate de gestion d'erreurs navigateur.

### Negative

- **NEG-001** : Un test qui recharge la page dans son scénario doit gérer manuellement le reset du collecteur (cas documenté dans `playwright-e2e-guide.md` §6.2).
- **NEG-002** : La liste `KNOWN_NOISE_PATTERNS` doit être maintenue — tout nouveau bruit non filtré fait échouer les tests, ce qui nécessite une investigation avant d'ajouter un filtre.
- **NEG-003** : L'assertion `assertNoErrors` de `smokeReady` est conditionnelle, ce qui réduit légèrement la couverture de détection dans les runs smoke partiels.

## Alternatives Considered

### Listener ad hoc par spec

- **Rejection reason** : duplication, couverture non garantie, patterns divergents entre auteurs.

### Assertion globale dans `afterAll` uniquement

- **Rejection reason** : trop tardif — des erreurs de milieu de test seraient masquées si d'autres steps nettoient l'état.

### Collecteur dans `beforeEach` Playwright global (playwright.config)

- **Rejection reason** : ne fonctionne pas correctement avec les fixtures Playwright qui gèrent leur propre cycle de vie de page — mélange de responsabilités.

## References

- **REF-001** : [browserErrors.ts](../../../e2e/utils/browserErrors.ts) — implémentation du collecteur
- **REF-002** : [e2e/fixtures/index.ts](../../../e2e/fixtures/index.ts) — fixture worldReady
- **REF-003** : [e2e/smoke/fixtures.ts](../../../e2e/smoke/fixtures.ts) — fixture smokeReady
- **REF-004** : [playwright-e2e-guide.md §6](../../tests/e2e/playwright-e2e-guide.md) — guide complet (contrat + checklist)
- **REF-005** : [e2e/README.md](../../../e2e/README.md) — checklist rapide
- **REF-006** : Issue #368 — PWE2 : fiabiliser les contrats d'interaction et la capture d'erreurs navigateur

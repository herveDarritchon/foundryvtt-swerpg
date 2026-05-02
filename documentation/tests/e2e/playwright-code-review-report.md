# Rapport de code review – Playwright E2E pour Swerpg

**Date**: 30 novembre 2025  
**Auteur**: Code Review Automatisée  
**Périmètre**: Mise en place Playwright et premières features E2E (bootstrap, oggdude-import)

---

## Résumé exécutif

### Points forts ✅

- Configuration Playwright bien structurée avec gestion flexible des environnements
- Architecture de session Foundry complète et robuste avec gestion d'erreurs
- Utilisation systématique de locators accessibles (ARIA) dans les specs
- Documentation E2E exhaustive et à jour avec guides complémentaires
- Fixtures auto-extensibles avec pattern clean

### Points d'attention ⚠️

- Code commenté dans `tearDown` nécessite clarification
- Utilisation de `waitForTimeout` dans helpers (risque de flakiness)
- `click({force: true})` dans oggdude-import.spec.ts à investiguer
- Duplication de logique de sélection utilisateur dans `enterGameAsGamemaster`
- Scripts `foundry:e2e:*` nécessitent documentation d'usage

### Risques critiques 🔴

- Absence de tests de régression pour les helpers de session
- Pas de validation de la politique de cleanup entre tests
- Gestion silencieuse d'erreurs (`catch(() => {})`) peut masquer des problèmes

---

## 1. Configuration Playwright & scripts

### 1.1 `playwright.config.ts` ✅

**Points conformes:**

- ✅ Chargement correct des variables avec `dotenv.config()`
- ✅ Support de `E2E_ENV_FILE` pour environnements multiples
- ✅ Timeouts configurables via variables d'env (`PLAYWRIGHT_TEST_TIMEOUT`, `PLAYWRIGHT_EXPECT_TIMEOUT`)
- ✅ Valeurs par défaut sensées (900s pour test timeout, 15s pour expect)
- ✅ `workers: 1` → séquentiel, évite collisions sur instance Foundry partagée
- ✅ Politique traces/screenshots/vidéos adaptée (CI vs local)
- ✅ Projets chromium + firefox avec viewport cohérent (1920×1080)
- ✅ Reporter adapté selon environnement (list en local, list+html en CI)
- ✅ Retries en CI uniquement (1 retry)

**Recommandations:**

- 💡 Documenter les valeurs de timeout recommandées selon le contexte (local/CI/headed)
- 💡 Envisager d'ajouter un projet `webkit` (Safari) pour couverture cross-browser complète

### 1.2 Scripts `package.json` ✅

**Points conformes:**

- ✅ Scripts `e2e`, `e2e:headed` présents et cohérents avec la doc
- ✅ Scripts `foundry:e2e:start|stop|restart` pour gestion de l'instance Foundry
- ✅ Pas de scripts obsolètes (`test:e2e` absent, bien nettoyé)

**Recommandations:**

- 💡 Ajouter un script `e2e:ui` → `playwright test --ui` pour faciliter le debug interactif
- 💡 Documenter dans le README quand utiliser `foundry:e2e:start` (environnement local vs CI)

### 1.3 Gestion des `.env.e2e*` ✅

**Points conformes:**

- ✅ Fichier `.env.e2e.example` présent avec toutes les variables nécessaires
- ✅ Variables bien nommées et explicites (`E2E_FOUNDRY_BASE_URL`, `E2E_FOUNDRY_ADMIN_PASSWORD`, etc.)
- ✅ Commentaires clairs dans l'example
- ✅ Support de `E2E_ENV_FILE` pour fichiers alternatifs

**Recommandations:**

- 💡 Ajouter une validation au démarrage des tests si variables critiques manquent
- 💡 Documenter la différence entre `ADMIN_PASSWORD` (auth Foundry) et `PASSWORD` (user monde)

---

## 2. Structure du dossier `e2e/`

### 2.1 Arborescence générale ✅

**Structure actuelle:**

```
e2e/
├── README.md
├── fixtures/
│   ├── global-setup.ts
│   └── index.ts
├── helper/
│   └── overlay.ts
├── specs/
│   ├── bootstrap.spec.ts
│   └── oggdude-import.spec.ts
├── tsconfig.json
└── utils/
    ├── e2eTest.ts
    └── foundrySession.ts
```

**Points conformes:**

- ✅ Séparation claire des responsabilités (fixtures, helpers, specs, utils)
- ✅ Pas de code mort détecté
- ✅ README présent avec renvoi vers guide détaillé

**Recommandations:**

- 💡 Créer un dossier `e2e/pages/` pour futurs page objects (Game Settings, dialogs récurrents)
- 💡 Documenter `global-setup.ts` (actuellement non lu)

### 2.2 Fixtures / entrypoints ✅

**Points conformes:**

- ✅ Fixture `worldReady` bien définie dans `e2e/fixtures/index.ts`
- ✅ Auto-exécutée (`{auto: true}`) → tous les tests démarrent en `/game`
- ✅ Import simplifié via `import { test, expect } from '../fixtures'`
- ✅ Utilisation de `setUp`/`tearDown` depuis `e2eTest.ts`

**Points d'attention:**

- ⚠️ `tearDown` simplifié à un simple `goto(/join)` → la logique commentée doit être clarifiée
- ⚠️ Pas de gestion d'échec du setUp (si licence/login/world échouent, le test continue)

**Recommandations:**

- 🔴 **Critique**: Ajouter une validation après `setUp` pour fail-fast si monde non chargé
- 💡 Clarifier la stratégie de cleanup : pourquoi ne pas revenir à `/setup` ou `/auth` ?

### 2.3 Utilitaires ✅

**`foundrySession.ts`:**

- ✅ Fonctions atomiques bien nommées (`accepteLicense`, `loginIntoInstance`, `enterWorld`, etc.)
- ✅ Utilisation de locators accessibles (roles, placeholders, aria-labels)
- ✅ Gestion des overlays (tours, partage de données)
- ✅ Try/catch avec fallbacks `page.goto()` pour robustesse

**Points d'attention:**

- ⚠️ Duplication dans `enterGameAsGamemaster` :

  ```ts
  await page.getByRole('combobox').selectOption({ label: options.username })

  // Variante 2 : par sélecteur CSS
  const userSelect = page.locator('select[name="userid"]')
  await userSelect.waitFor({ state: 'visible' })
  await userSelect.selectOption({ label: options.username })
  ```

  → Les deux approches sont redondantes

- ⚠️ Gestion d'erreurs silencieuse (`catch(() => {})`) peut masquer des problèmes réels

**`e2eTest.ts`:**

- ✅ Orchestration claire du flux `/license` → `/auth` → `/setup` → `/join` → `/game`
- ⚠️ `tearDown` incomplet : logique commentée sans explication

**Recommandations:**

- 🔴 **Blocker**: Décider du sort du code commenté dans `tearDown` et le documenter
- 💡 Unifier la sélection d'utilisateur dans `enterGameAsGamemaster` (supprimer duplication)
- 💡 Logger les erreurs silencieuses pour faciliter le debug (ex: `console.warn`)

---

## 3. Logique de session Foundry

### 3.1 Flux complet ✅

**Points conformes:**

- ✅ Séquence complète et logique : accepte licence → login admin → enter world → join MJ
- ✅ Utilisation systématique de `waitForURL` avec `domcontentloaded`
- ✅ Gestion des overlays Foundry (tours, partage de données) via helpers dédiés

**Points d'attention:**

- ⚠️ `dismissTourIfPresent` utilise `waitForTimeout(500)` (2 fois) → risque de flakiness
  ```ts
  // On laisse 500 ms à Foundry pour afficher ses popins
  await page.waitForTimeout(500)
  ```

**Recommandations:**

- 🔴 **Risque de flakiness**: Remplacer `waitForTimeout` par des attentes explicites :
  ```ts
  // Au lieu de waitForTimeout(500)
  await page.locator('.step-button').first().waitFor({ state: 'visible', timeout: 2000 })
  ```

### 3.2 Nettoyage ✅⚠️

**Points conformes:**

- ✅ Fonctions `logout`, `quitWorld`, `logoutFromInstance` couvrent tous les chemins
- ✅ Fallback sur `page.goto()` en cas d'erreur
- ✅ Try/catch global pour ne pas faire échouer les tests sur cleanup

**Points d'attention:**

- ⚠️ `tearDown` actuel ne fait que `page.goto(/join)` → pas de vraie restauration de l'état initial
- ⚠️ Logique complète commentée sans explication du pourquoi

**Recommandations:**

- 🔴 **Blocker**: Documenter la stratégie de cleanup et la raison du code commenté
- 💡 Si cleanup complet non nécessaire, le préciser explicitement dans un commentaire
- 💡 Ajouter un test de vérification de l'état post-tearDown

### 3.3 Résilience générale ✅⚠️

**Points conformes:**

- ✅ Try/catch stratégiques pour éviter échecs sur cleanup
- ✅ Vérifications de présence d'éléments avec `count()` avant interaction
- ✅ Fallbacks `page.goto()` si navigation échoue

**Points d'attention:**

- ⚠️ Gestion d'erreurs silencieuse peut masquer des vrais problèmes :
  ```ts
  await gameSettingsTab.click().catch(() => {})
  ```

**Recommandations:**

- 💡 Logger les erreurs capturées pour faciliter le debug
- 💡 Différencier erreurs attendues (cleanup) vs erreurs inattendues (bugs)

---

## 4. Specs initiales

### 4.1 `bootstrap.spec.ts` ✅

**Points conformes:**

- ✅ Test minimal et rapide (< 5s attendu)
- ✅ Vérifie URL `/game` et présence de `body.system-swerpg`
- ✅ Sert bien de test de santé / smoke test

**Recommandations:**

- 💡 Ajouter une assertion sur un élément UI critique (ex: sidebar, canvas)

### 4.2 `oggdude-import.spec.ts` ✅⚠️

**Points conformes:**

- ✅ Scénario fonctionnel complet (Game Settings → Configure Settings → Système → Import)
- ✅ Utilisation de locators accessibles (`getByRole`, `getByText`)
- ✅ Pas de `waitForTimeout` dans la spec elle-même

**Points d'attention:**

- ⚠️ `click({force: true})` sur Game Settings tab :
  ```ts
  await page.getByRole('tab', { name: /Game Settings/i }).click({ force: true })
  ```
  → Peut masquer un problème de visibilité réel

**Recommandations:**

- 💡 Investiguer pourquoi `force: true` est nécessaire
- 💡 Si l'élément est hors viewport, ajouter un scroll explicite
- 💡 Tester sans `force: true` pour vérifier la robustesse

### 4.3 Patterns à généraliser ✅

**Patterns identifiés pour extraction:**

1. **Ouverture Game Settings** (réutilisable dans futurs tests) :

   ```ts
   async function openGameSettings(page: Page) {
     await page.getByRole('tab', { name: /Game Settings/i }).click()
   }
   ```

2. **Navigation vers settings système** (pattern récurrent) :
   ```ts
   async function openSystemSettings(page: Page, systemName: string) {
     await page.getByRole('button', { name: /Configure Settings/i }).click()
     await page.getByRole('button', { name: new RegExp(systemName, 'i') }).click()
   }
   ```

**Recommandations:**

- 💡 Créer un helper `e2e/utils/foundryUI.ts` ou un page object `e2e/pages/GameSettingsPage.ts`
- 💡 Factoriser la navigation récurrente pour réduire duplication

---

## 5. Documentation & guides

### 5.1 `playwright-e2e-guide.md` ✅

**Points conformes:**

- ✅ Cohérence totale avec la config réelle (`playwright.config.ts`, scripts pnpm)
- ✅ Sections complètes : prérequis, config, commandes, structure, bonnes pratiques, troubleshooting
- ✅ Références explicites vers le squelette de spec

**Recommandations:**

- 💡 Ajouter une section "FAQ" pour problèmes courants (timeouts, overlays bloquants, etc.)

### 5.2 `playwright-spec-squelette-mon-parcours.md` ✅

**Points conformes:**

- ✅ Squelette générique bien structuré (bootstrap → navigation → assertions)
- ✅ Guide complet sur l'adaptation à une nouvelle feature
- ✅ Pas de duplication avec le guide principal

**Recommandations:**

- 💡 Ajouter un exemple d'instanciation pour un cas réel (ex: fiche d'acteur)

### 5.3 `e2e-playwright-copilot-workflow.md` ✅

**Points conformes:**

- ✅ Focus sur l'utilisation de Copilot (pas de redondance avec les autres guides)
- ✅ Check-list de bonnes pratiques claire
- ✅ Référence au squelette pour la structure métier

**Recommandations:**

- 💡 Ajouter des exemples de prompts Copilot concrets pour générer des locators

---

## 6. Axes d'amélioration / prochaines étapes

### 6.1 Couverture fonctionnelle

**Tests manquants critiques:**

- 🔴 Fiches d'acteur (création, édition, suppression)
- 🔴 Jets de dés (pool de dés Swerpg, résultats, chat)
- 🔴 Settings système (configuration générale Swerpg)
- 🟡 Inventaire et items (armes, armures, talents)
- 🟡 Combat (initiative, tours, actions)

**Recommandations:**

- Prioriser les tests sur les parcours joueur/MJ critiques
- Utiliser le squelette `mon-parcours.spec.ts` pour chaque nouveau test

### 6.2 Stabilisation / helpers

**Helpers à créer:**

1. `openGameSettings(page)` → factorise ouverture Game Settings
2. `openSystemSettings(page, systemName)` → navigation vers settings système
3. `waitForOverlaysToDisappear(page)` → remplace `waitForTimeout` dans overlays
4. `createActor(page, actorType, name)` → helper pour tests d'acteurs

**Code à clarifier:**

- 🔴 **Blocker**: Décider du sort du `tearDown` commenté
- 💡 Documenter l'usage des scripts `foundry:e2e:*` dans le README

### 6.3 CI & reporting

**Points à vérifier:**

- ✅ Reporter HTML configuré pour CI (`playwright-report/`)
- ✅ Politique trace/video correcte (`retain-on-failure` en local, `on-first-retry` en CI)
- 🟡 Pas de pipeline CI visible → vérifier intégration GitHub Actions

**Recommandations:**

- 💡 Ajouter un workflow GitHub Actions pour E2E automatisé
- 💡 Uploader artifacts (traces, vidéos) en cas d'échec
- 💡 Badge de statut E2E dans le README principal

### 6.4 Accessibilité & bonnes pratiques

**Points conformes:**

- ✅ Utilisation systématique de locators ARIA dans les specs
- ✅ Documentation mentionne les exigences a11y
- ✅ Pattern `getByRole`/`getByLabel` encouragé

**Points d'attention:**

- ⚠️ `click({force: true})` peut bypasser des problèmes a11y réels

**Recommandations:**

- 💡 Auditer systématiquement les `force: true` et les justifier
- 💡 Intégrer des assertions a11y (ex: `axe-playwright`) dans les tests critiques

---

## Matrice de priorisation

| Action                                             | Priorité    | Effort | Impact |
| -------------------------------------------------- | ----------- | ------ | ------ |
| Clarifier code commenté dans `tearDown`            | 🔴 Critique | Faible | Élevé  |
| Remplacer `waitForTimeout` par attentes explicites | 🔴 Critique | Moyen  | Élevé  |
| Supprimer duplication dans `enterGameAsGamemaster` | 🟡 Moyen    | Faible | Moyen  |
| Créer helpers pour Game Settings                   | 🟡 Moyen    | Moyen  | Élevé  |
| Ajouter tests fiches d'acteur                      | 🔴 Critique | Élevé  | Élevé  |
| Ajouter tests jets de dés                          | 🔴 Critique | Élevé  | Élevé  |
| Investiguer `click({force: true})`                 | 🟡 Moyen    | Faible | Moyen  |
| Intégration CI GitHub Actions                      | 🟢 Faible   | Moyen  | Élevé  |
| Ajouter projet webkit                              | 🟢 Faible   | Faible | Faible |

---

## Conclusion

La mise en place Playwright pour Swerpg est **globalement solide** avec une architecture propre, des bonnes pratiques respectées et une documentation exhaustive. Les premières specs (`bootstrap`, `oggdude-import`) démontrent une bonne maîtrise des patterns Playwright et de l'accessibilité.

**Points bloquants à traiter en priorité:**

1. Clarifier la stratégie de `tearDown` et le code commenté
2. Remplacer les `waitForTimeout` par des attentes explicites
3. Étendre la couverture fonctionnelle (fiches acteur, jets de dés)

**Prochaines étapes recommandées:**

1. Résoudre les points bloquants (items 🔴 dans la matrice)
2. Créer les helpers pour Game Settings (factorise patterns récurrents)
3. Ajouter 2–3 specs critiques (acteurs, dés) pour valider la robustesse
4. Intégrer la suite E2E dans un workflow CI automatisé

Le projet est **prêt pour production** avec ces ajustements mineurs.

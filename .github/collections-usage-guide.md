# Guide d'utilisation des collections Copilot installées

> Ce guide décrit comment exploiter efficacement les chat modes, prompts et instructions ajoutés pour professionnaliser votre workflow (Spécification → Planification → Implémentation TDD → Tests Playwright → Qualité & Sécurité → Performance & Accessibilité → Revue → Release). Le contenu a été rédigé avec l'accessibilité et la sécurité en tête, mais doit être vérifié manuellement (WCAG / OWASP / revue humaine).

## 1. Objectifs

- Standardiser la collaboration avec Copilot par phases explicites.
- Réduire le temps de cycle (idée → code testé) tout en améliorant la qualité intrinsèque (sécurité, performance, lisibilité, accessibilité).
- Rendre traçables décisions, spécifications, plans et validations (support aux rétros, audits et onboardings).

## 2. Vue d'ensemble rapide
 
### Collections & Domaines
 
- Testing & Test Automation: TDD, Vitest, Playwright (unitaire + E2E).
- Project Planning & Management: idéation, PRD, découpage, plan d'implémentation, tâches, révision.
- Technical Spike: recherche expérimentale cadrée avant engagement.
- Tasks (edge-ai): pilotage granulaire des tâches & enregistrements de progression.
- Security & Code Quality: OWASP, Accessibilité, Performance, Object Calisthenics, Commentaires auto-explicatifs.

 
### Types d'assets
 
- Chat Modes (`.chatmode.md`): Contextes de session (ex: `tdd-red`, `implementation-plan`).
- Prompts (`.prompt.md`): Demandes ciblées (ex: `breakdown-feature-prd`, `playwright-generate-test`).
- Instructions (`.instructions.md`): Standards permanents (sécurité, performance, a11y, etc.).

 
## 3. Workflow recommandé (chaîne complète)
 
1. Idéation & Contexte initial
   - Chat mode: `planner.chatmode.md` ou `prd.chatmode.md`.
   - Prompt: `breakdown-feature-prd.prompt.md` pour générer un PRD structuré.
2. Spécification détaillée
   - Chat mode: `specification.chatmode.md`.
   - Instructions: `spec-driven-workflow-v1.instructions.md` pour EARS + design.
3. Découpage & Plan d'implémentation
   - Chat mode: `implementation-plan.chatmode.md`.
   - Prompts: `create-implementation-plan.prompt.md`, puis `update-implementation-plan.prompt.md`.
4. Création des issues / tâches
   - Prompt: `create-github-issues-feature-from-implementation-plan.prompt.md`.
   - Chat mode: `task-planner.chatmode.md` / `task-researcher.chatmode.md` si besoin d'analyse supplémentaire.
5. Spike technique (optionnel)
   - Chat mode: `research-technical-spike.chatmode.md`.
   - Prompt: `create-technical-spike.prompt.md` pour cadrer hypothèses + critères de réussite.
6. Implémentation TDD
   - Chat modes séquentiels: `tdd-red` → `tdd-green` → `tdd-refactor`.
   - Prompt tests unitaires JS/TS: `javascript-typescript-vitest.prompt.md`.
7. Tests E2E / UI
   - Chat mode: `playwright-tester.chatmode.md`.
   - Prompts: `playwright-explore-website.prompt.md`, `playwright-generate-test.prompt.md`.
8. Qualité & Sécurité
   - Instructions: `security-and-owasp.instructions.md`, `self-explanatory-code-commenting.instructions.md`.
   - Prompt revue de sécurité: `ai-prompt-engineering-safety-review.prompt.md`.
9. Performance
   - Instructions: `performance-optimization.instructions.md` pour checklist & stratégies.
10. Accessibilité
    - Instructions: `a11y.instructions.md`.
11. Structuration orientée objets
    - Instructions: `object-calisthenics.instructions.md` pour maintenir faible complexité.
12. Revue & Refactor
    - Prompt: `review-and-refactor.prompt.md`.
    - Chat modes TDD refactor et standards de commentaires.
13. Rétrospective
    - Prompt: `retro-doc.prompt.md` + fichiers design/plans mis à jour.
14. Release / Changelog
    - Script: `append-links-to-changelog.cjs` + PRD & design en annexes.

## 4. Usages détaillés par asset

### Chat Modes (séances conversationnelles)
 
- `tdd-red.chatmode.md`: Focaliser sur écriture du test qui échoue (clarification exigences + edge cases).
- `tdd-green.chatmode.md`: Produire l'implémentation minimale passant les tests.
- `tdd-refactor.chatmode.md`: Améliorer structure sans casser le vert. Vérifier complexité, duplication, empreinte performance.
- `implementation-plan.chatmode.md`: Maintenir la vision macro du plan, réviser dépendances.
- `planner.chatmode.md` / `plan.chatmode.md`: Décomposer idée en livrables mesurables.
- `prd.chatmode.md`: Capturer objectifs, utilisateurs, métriques de succès.
- `playwright-tester.chatmode.md`: Générer / optimiser scénarios E2E (locators accessibles, assertions robustes).
- `research-technical-spike.chatmode.md`: Explorer solution incertaine; documenter critères d'abandon / adoption.
- `task-planner.chatmode.md` / `task-researcher.chatmode.md`: Raffiner tâches granularité vs risques.

### Prompts (déclencheurs ciblés)
 
Utilisation: Collez votre contexte (extraits code, objectifs) puis le contenu du prompt.

- `breakdown-feature-prd`: Structure PRD → Sections (Problème, Utilisateurs, Scénarios, KPIs, Risques).
- `breakdown-epic-arch` / `breakdown-epic-pm`: Architecture vs pilotage produit pour un EPIC.
- `create-implementation-plan` / `update-implementation-plan`: Initialiser puis affiner plan avec dépendances & estimation.
- `create-technical-spike`: Hypothèses, méthode test, critères succès.
- `playwright-explore-website`: Cartographier rôles ARIA & points d'ancrage locators.
- `playwright-generate-test`: Générer test robuste (getByRole, expect(...).toHaveURL()).
- `javascript-typescript-vitest`: Patron de tests unitaires (naming, arrange-act-assert, edge cases).
- `ai-prompt-engineering-safety-review`: Audit incitations potentiellement dangereuses ou ambiguës.
- `review-and-refactor`: Recherche duplication, complexité cyclomatique, violations calisthenics.
- `retro-doc`: Produire synthèse amélioration continue.

### Instructions (standards persistants)
 
Toujours considérées implicites; relire ponctuellement en cas de doute.

- Accessibilité: `a11y.instructions.md` (WCAG 2.2 AA; roles, contrastes, focus).
- Sécurité: `security-and-owasp.instructions.md` (OWASP Top 10: injection, accès, secrets).
- Performance: `performance-optimization.instructions.md` (mesurer → optimiser, caches, budgets).
- Calisthenics: `object-calisthenics.instructions.md` (small classes, no primitives obsession, no getters labyrinth).
- Commentaires: `self-explanatory-code-commenting.instructions.md` (expliquer le POURQUOI).
- Spécification: `spec-driven-workflow-v1.instructions.md` (EARS, design, tâches, validation).

## 5. Exemples pratiques

### Exemple TDD rapide
 
1. Ouvrez chat avec `tdd-red`. Fournissez: objectif fonction + cas limites.
2. Génère test Vitest (prompt `javascript-typescript-vitest`).
3. Passez à `tdd-green` avec test rouge pour implémentation.
4. Exécutez: `pnpm test` (le test doit passer).
5. Basculez `tdd-refactor` pour supprimer duplication / améliorer noms.

### Exemple Playwright
 
1. Exploration: prompt `playwright-explore-website` avec URL locale.
2. Génération scénario login: `playwright-generate-test` (ajouter contexte rôles accessibles).
3. Sauvegarde fichier test sous `tests/applications/login.spec.ts`.
4. Exécutez: `npx playwright test --project=chromium` (optionnel si config présente).

### Exemple Performance Review
 
1. Après feature: collez hot path + métriques (ms, mémoire). Demandez suggestions selon `performance-optimization.instructions.md`.
2. Implémentez micro-optimisations mesurées, reprofilez pour vérifier gain.

### Exemple Accessibilité
 
1. Indiquer snippet HTML/CSS/TS généré.
2. Demander correction focus & alternatives graphiques (référencer `a11y.instructions.md`).
3. Vérifier manuellement avec un lecteur d'écran + axe DevTools.

## 6. Intégration CI/CD (recommandations)

- Étape Lint/Test: `pnpm test` + collecte couverture (`pnpm test:coverage`).
- Gate sécurité: Script custom qui scanne prompts de PR via `ai-prompt-engineering-safety-review` (manuel ou automatisé).
- Gate accessibilité: Audits Lighthouse + tests Playwright avec assertions ARIA (snapshot si adopté).
- Performance Budget: Échec pipeline si LCP > budget défini ou temps scénario critique > X ms (outils externes).


## 7. Checklist par phase

Idée: PRD créé ✔ | KPIs définis ✔
Spécification: Requirements EARS ✔ | Design.md ✔
Plan: Dependencies ordonnées ✔ | Estimations ✔
Implémentation: Tests rouges ✔ | Code vert ✔ | Refactor ✔
Qualité: Couverture > seuil ✔ | A11y baseline ✔ | OWASP scan ✔
Performance: Profil hot path ✔ | Budget respecté ✔
Revue: Calisthenics conformes ✔ | Commentaires intentionnels ✔
Release: CHANGELOG mis à jour ✔ | Documentation synchronisée ✔
Rétro: Points d'amélioration loggés ✔

## 8. Bonnes pratiques de requêtage Copilot

- Toujours fournir CONTEXTE (fichiers clés + objectif + contraintes).
- Préciser FORMAT attendu (ex: "liste bullet", "code uniquement", "diff minimal").
- Limiter périmètre (une fonction, un module) → éviter réponses génériques.
- Réutiliser les documents (design, requirements) plutôt que les reformuler.
- Valider chaque sortie: sécurité (entrée utilisateur), a11y (focus, rôle), performance (éviter complexité inutile).

## 9. Commandes utiles (rappel)

```bash
pnpm install
pnpm build
pnpm test
pnpm test:coverage
npm run extract
npm run compile
```

## 10. Personnalisation VS Code (suggestion)

Dans `settings.json` (manuel):
 
```json
{
   "copilot.customPrompts.paths": [".github/prompts"],
   "copilot.customChatModes.paths": [".github/chatmodes"],
   "copilot.customInstructions.paths": [".github/instructions"]
}
```

## 11. Limites & Vérifications

Ce guide propose un cadre; il ne remplace pas tests manuels, revue de code humaine, audit de sécurité indépendant et évaluation accessibilité avec outils spécialisés (axe, Accessibility Insights). Toujours mesurer avant d'optimiser.

## 12. Prochaines améliorations suggérées

- Automatiser génération `requirements.md` & `design.md` à partir prompts.
- Intégrer un script de validation croisée (chemins assets vs manifest).
- Ajouter snapshots ARIA systématiques dans tests Playwright.
- Mettre en place budget performance chiffré (LCP, CLS, temps action critique).

---
Rédigé avec accessibilité & sécurité en tête; une revue manuelle reste indispensable. Utilisez des outils comme Accessibility Insights et des analyseurs SAST/DAST pour compléter.

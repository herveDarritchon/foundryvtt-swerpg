# Rapport d'installation des collections awesome-copilot

Date: 2025-11-11

## Collections installées

- Testing & Test Automation (11 items) — installée
- Project Planning & Management (17 items) — installée
- Technical Spike (2 items) — installée
- Tasks by microsoft/edge-ai (3 items) — installée
- Security & Code Quality (6 items) — installée

## Détails par fichier (emplacement : `.github/`)

### Chat modes ajoutés

- chatmodes/tdd-red.chatmode.md
- chatmodes/tdd-green.chatmode.md
- chatmodes/tdd-refactor.chatmode.md
- chatmodes/playwright-tester.chatmode.md
- chatmodes/task-planner.chatmode.md
- chatmodes/task-researcher.chatmode.md
- chatmodes/planner.chatmode.md
- chatmodes/plan.chatmode.md
- chatmodes/prd.chatmode.md
- chatmodes/implementation-plan.chatmode.md
- chatmodes/research-technical-spike.chatmode.md

### Instructions ajoutées

- instructions/playwright-typescript.instructions.md
- instructions/playwright-python.instructions.md
- instructions/task-implementation.instructions.md
- instructions/spec-driven-workflow-v1.instructions.md
- instructions/a11y.instructions.md
- instructions/object-calisthenics.instructions.md
- instructions/performance-optimization.instructions.md
- instructions/security-and-owasp.instructions.md

### Prompts ajoutés

- prompts/breakdown-test.prompt.md
- prompts/playwright-explore-website.prompt.md
- prompts/playwright-generate-test.prompt.md
- prompts/csharp-nunit.prompt.md
- prompts/java-junit.prompt.md
- prompts/ai-prompt-engineering-safety-review.prompt.md
- prompts/breakdown-feature-implementation.prompt.md
- prompts/breakdown-feature-prd.prompt.md
- prompts/breakdown-epic-arch.prompt.md
- prompts/breakdown-epic-pm.prompt.md
- prompts/create-implementation-plan.prompt.md
- prompts/update-implementation-plan.prompt.md
- prompts/create-github-issues-feature-from-implementation-plan.prompt.md
- prompts/create-technical-spike.prompt.md

## Notes

- Certains fichiers existaient déjà dans `.github/` et n'ont pas été modifiés (évite les doublons).
- Les fichiers ont été téléchargés depuis `https://raw.githubusercontent.com/github/awesome-copilot/main`.
- Vérifiez les recommandations internes des prompts (notamment `tasks` collection qui utilise `.copilot-tracking/`) avant de les exécuter.

---

## Prochaines actions proposées

1. Valider la cohérence et le format des fichiers (ex: frontmatter YAML) avec le script `node eng/validate-collections.js` (si vous voulez l’ajouter dans un `collections/` manifest).
2. Générer un fichier `collections/security-best-practices.collection.yml` si vous souhaitez lier ces items comme collection locale.
3. Rédiger le guide d'utilisation détaillé (je peux le générer automatiquement).

Si vous voulez que je crée le manifeste local de la collection Security & Code Quality et/ou que je génère le guide d'utilisation maintenant, dites "Créer manifeste et guide".

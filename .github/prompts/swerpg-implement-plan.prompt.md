---
name: 'swerpg-implémenter-plan-implémentation'
description: 'Exécuter un plan d’implémentation SWERPG existant avec l’agent `swerpg-dev-core` (JS, HBS, LESS/CSS, config).'
---

Tu agis en tant qu’agent `swerpg-dev-core` pour le système SWERPG (Foundry VTT v13+).

Ton objectif : **implémenter un plan d’implémentation existant** en appliquant les changements de code décrits dans les `TASK-XXX` du plan.

### Plan ciblé

Le plan à exécuter se trouve dans :  
`<remplacer-ici-par-le-chemin-complet-du-plan, ex. /documentation/plan/oggdude-importer/feature-progress-bar-1.md>`

### Portée de l’implémentation

- **Mode complet** (par défaut) :  
  Implémente **tous** les `TASK-XXX` du plan qui concernent :
  - JS (`.js`, `.mjs`, `.cjs`),
  - templates Handlebars (`.hbs`),
  - styles (`.less`, `.css` généré si nécessaire),
  - fichiers de configuration (JSON/YAML) explicitement listés en `FILE-XXX`.

- **Mode partiel** (si précisé) :

  > Si je fournis une liste de tâches, tu n’implémentes QUE ces tâches :  
  > `TASK-00X`, `TASK-00Y`, …

Portée choisie pour cette exécution :

- `<"complet" ou "partiel (liste de TASK-XXX)">`
- Tâches à exécuter (si partiel) : `<liste de TASK-XXX>`.

### Règles impératives

Tu dois :

1. Respecter les **SWERPG Project Instructions** : `.github/instructions/swerpg-project-instructions.instructions.md`.
2. Respecter ta spec d’agent `swerpg-dev-core.agent.md`.
3. Ne modifier **QUE** les fichiers listés en `## 5. Files` (`FILE-XXX`) dans le plan.
4. Implémenter **UNIQUEMENT** les `TASK-XXX` décrits dans le plan :
   - pas de nouvelles features,
   - pas de refactors hors scope (sauf micro-refactor local nécessaire pour intégrer proprement la feature).
5. Utiliser le tool `edit` pour modifier le code ; ne pas imprimer des patches à appliquer à la main.
6. Respecter les patterns et conventions existants (logger, nomenclature, structure des classes et hooks).

### Tests

- Lis la section `## 6. Testing` du plan.
- Lorsque c’est pertinent :
  - exécute les commandes de tests (lint / Vitest / Playwright) avec `runCommands`.
  - analyse les échecs via `testFailure` / `problems`.
- Ne crée pas de nouveaux tests automatisés, sauf si le plan ou le prompt le demande explicitement (sinon, ce sera délégué à `swerpg-dev-test`).

### Format de ta réponse

À la fin, ta réponse doit être structurée comme suit (en **français**) :

1. **Résumé des tâches effectuées**
   - Liste des `TASK-XXX` effectivement implémentées.
2. **Fichiers modifiés**
   - Pour chaque fichier : fonctions / classes / templates / blocs de styles impactés.
3. **Tests exécutés**
   - Commandes lancées, statut (succès / échec), messages d’erreur importants.
4. **Observations / items à revoir**
   - Bugs ou incohérences identifiés mais non corrigés (hors scope du plan).
   - Contradictions éventuelles entre le plan et le code existant.
   - Suggestions éventuelles pour un futur plan (`swerpg-plan`).

Tu écris toutes les explications en **français**, mais tu gardes les noms de fichiers, fonctions, hooks, classes, identifiants (`TASK-XXX`, etc.) en **anglais**.

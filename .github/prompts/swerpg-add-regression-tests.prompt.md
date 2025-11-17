---
name: 'SWERPG – Ajouter des tests de régression'
description: 'Créer ou renforcer les tests automatisés (Vitest / Playwright) pour capturer un bug ou un comportement régressif observé.'
---

Tu agis en tant qu’agent `swerpg-dev-test` pour le système SWERPG (Foundry VTT v13+).

Ton objectif : **ajouter des tests de régression** (Vitest / Playwright) pour capturer un bug ou un comportement incorrect, sans nécessairement disposer d’un plan d’implémentation complet.

### Bug ou comportement à couvrir

Décris le bug ou le comportement attendu vs observé :

> Contexte du bug :
>
> - **Scénario utilisateur** : `<décrire le chemin MJ/joueur dans Foundry>`
> - **Comportement attendu** : `<décrire>`
> - **Comportement observé** : `<décrire>`
> - **Impact** : `<mineur / majeur / bloquant / data-corruption>`

Si tu connais des fichiers ou hooks impliqués, indique-les :

> Indices techniques :
>
> - Fichiers suspects : `<liste optionnelle de fichiers>`
> - Hooks / classes concernés : `<liste optionnelle>`

### Objectif des tests

Précise ce que tu veux :

- `<"Écrire un test qui reproduit le bug actuel (red test) sans corriger le code.">`
- `<"Renforcer un test existant pour qu’il échoue dans ce cas particulier.">`
- `<"Créer une suite de tests de non-régression autour de cette fonctionnalité.">`

### Portée & types de tests

- Types visés :
  - `<"Vitest (unit/integration)" / "Playwright (e2e)" / "les deux">`

- Contrainte :
  - Ne pas modifier le code de production dans cette étape (sauf micro-changements STRICTEMENT nécessaires pour rendre le code testable – et dans ce cas, le signaler clairement).

### Règles impératives

- Respecter :
  - `.github/instructions/swerpg-project-instructions.instructions.md`
  - `.github/instructions/nodejs-javascript-vitest.instructions.md`
  - `.github/instructions/playwright-typescript.instructions.md` (ou python si applicable)
- Aligner les nouveaux tests sur les patterns et conventions de tests existants :
  - structure des suites,
  - helpers,
  - conventions de nommage.

### Résultat attendu

À la fin de ta tâche, tu dois fournir une réponse en **français**, structurée comme suit :

1. **Résumé des scénarios de régression couverts**
   - Liste des scénarios décrits, avec leur correspondance dans les tests (nom de test / fichier).

2. **Fichiers de tests créés ou modifiés**
   - Chemins des fichiers,
   - Description des ajouts (nouvelles suites, nouveaux cas de test).

3. **État des tests**
   - Quelles commandes ont été lancées (`pnpm test`, `pnpm test:unit`, `pnpm test:e2e`, etc.),
   - Quels tests échouent (si c’est volontaire parce que le bug n’est pas encore corrigé),
   - Une mention claire si le but était d’obtenir un **test rouge** qui démontre le bug.

4. **Observations / items à transformer en plan**
   - Si le bug est confirmé, proposer de créer un plan `feature` ou `bug` via `swerpg-plan` pour implémenter la correction, en citant les fichiers et tests concernés.

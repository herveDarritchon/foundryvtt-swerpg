---
name: 'swerpg-dev-feature'
description: "SWERPG Dev Feature Agent - Implémenter une feature SW Edge dans Foundry v13 (JS + LESS) à partir d'un Plan."
argument-hint: 'Développeur expert en JavaScript moderne et Foundry VTT v13, spécialisé dans le système SweRPG.'
model: 'Claude Sonnet 4'
target: 'vscode'
handoffs:
  - label: Implémenter Tests
    agent: 'swerpg-dev-test' # le champ 'agent' est ici, pas dans le header
    prompt: 'Implémente les tests nécessaires.'
    send: false # true = envoie direct le prompt
tools: ['edit', 'search', 'runCommands', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'fetch', 'githubRepo', 'todos', 'runSubagent']
# liste des outils inactifs pour cet agent --> 'runTasks', 'runNotebooks', 'extensions', 'openSimpleBrowser', 'new'
---

## Token budget policy

Do not send large context to an LLM unless reasoning is required.

For deterministic tasks:
- execute with shell, Git, npm, Vitest, Playwright or CI;
- collect only the useful output;
- call an LLM only if interpretation, decision or correction is needed.

For failures:
- send only the failing command;
- send only the relevant error block;
- send only the files directly involved;
- ask for the smallest correction.

<!-- Audit minimal: inventaire OpenCode → compatibilité Claude Code -->

# Audit — OpenCode → Claude Code

Date: 2026-05-20

## Objectif

Fournir une matrice d'inventaire initiale et des recommandations rapides pour
exposer l'organisation OpenCode au runtime Claude Code sans migration complète.

## Résumé des éléments trouvés

- `AGENTS.md` — document central existant (source de vérité pour agents)
- `opencode.jsonc` — configuration OpenCode présente à la racine
- `scripts/claude-setup.sh` — script d'exposition déjà présent et idempotent
- `.agents/` — dossier d'agents OpenCode (présumé présent dans repo)
- `scripts/` — scripts utilitaires variés (présents)

## Vérifications réalisées

1. `scripts/claude-setup.sh` présent et conçu pour créer `.claude/*` et symlinks.
2. `AGENTS.md` existe et contient des instructions agents (à garder comme source).
3. Pas de `.mcp.json` commité dans la racine (aucune configuration MCP découverte).

## Recommandations prioritaires (quick wins)

1. Créer un petit pont `CLAUDE.md` qui référence `AGENTS.md` et décrit la
   stratégie de symlink/wrapper (fait).
2. Ajouter `.claude/settings.json` minimal pour que Claude Code puisse trouver
   les chemins d'exposition (fait).
3. Préparer des répertoires `.claude/agents/` et `.claude/skills/` (gitkeep créés).
4. Fournir un script `scripts/validate-llm-config.sh` pour vérifier l'intégrité
   des fichiers (création recommandée).

## Risques et points d'attention

- Ne pas committer de secrets dans un éventuel `.mcp.json` — utiliser variables
  d'environnement et documenter.
- Eviter duplication : préférer symlinks sur wrappers sauf si transformation
  structurelle nécessaire.

## Prochaines actions (Phase 2 minimal)

1. Créer `CLAUDE.md` (pont) — fait
2. Créer `.claude/settings.json` — fait
3. Créer `.claude/agents` et `.claude/skills` — faits (gitkeep)
4. Créer `scripts/validate-llm-config.sh` — à créer
5. Exposer 2 agents prioritaires via `.claude/agents/` (symlink ou adapt)
6. Documenter la règle `symlink vs wrapper` dans `CLAUDE.md` (fait sommaire)

## Notes

Ce document est un artefact d'audit rapide servant de base au plan d'implémentation
plus détaillé. Le script `scripts/claude-setup.sh` doit être exécuté après avoir
créé les symlinks souhaités.

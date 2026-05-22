---
applyTo: '.copilot-tracking/changes/20260520-cadrage-adaptation-opencode-claude-code-changes.md'
---

# Plan: Adapter OpenCode → Claude Code (2026-05-20)

## Checklist

### Phase 1 — Audit (completed)

- [x] Lire `documentation/cadrage_adaptation_opencode_claude_code.md` (source)
- [x] Produire `documentation/plan/llm/audit-opencode-claude-code.md` (artefact)

### Phase 2 — Structure minimale (in progress)

- [x] Créer `CLAUDE.md` (pont)
- [x] Créer `.claude/settings.json` (config minimal)
- [x] Créer `.claude/agents` et `.claude/skills` (placeholders)
- [x] Ajouter `scripts/validate-llm-config.sh` (validator)
- [ ] Lister agents/skills prioritaires à exposer

### Phase 3 — Exposition (next)

- [ ] Exposer 1er agent prioritaire dans `.claude/agents/` (symlink/wrapper)
- [ ] Exposer 1er skill prioritaire dans `.claude/skills/` (symlink/wrapper)
- [ ] Ajouter tests rapides (validate patterns)

### Phase 4 — MCP & Commands

- [ ] Comparer formats MCP, créer `.mcp.json` d'adaptation si nécessaire
- [ ] Documenter gestion des secrets

### Phase 5 — Handoff

- [ ] Finaliser `.copilot-tracking/changes/*.md` avec Release Summary
- [ ] Ouvrir PR vers `develop` avec description + checklist

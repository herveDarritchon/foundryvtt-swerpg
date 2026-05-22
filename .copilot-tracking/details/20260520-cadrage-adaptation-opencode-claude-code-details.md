# Details — Implementation notes for Claude Code exposure

Date: 2026-05-20

This details file documents the concrete actions performed during the initial
implementation step and the rationale.

Actions performed:

- Created `CLAUDE.md` as a minimal bridge pointing to `AGENTS.md` and describing
  symlink vs wrapper policy.
- Added `.claude/settings.json` with minimal keys enabling a Claude runtime to
  locate agents/skills paths.
- Created placeholder directories `.claude/agents` and `.claude/skills` with
  `.gitkeep` files so they are tracked in git.
- Created `documentation/plan/llm/audit-opencode-claude-code.md` — audit summary
  and quick wins.
- Created `scripts/validate-llm-config.sh` — a small validator used locally and
  in CI to check presence and JSON validity of key config files.
- Created `.copilot-tracking/changes/20260520-cadrage-adaptation-opencode-claude-code-changes.md`
  to track the work performed.

Rationale:

- Minimise changes to OpenCode sources and avoid duplication.
- Provide a reproducible setup and validation path for other dev contributors.
- Keep the next steps small and reviewable (expose 1 agent + 1 skill first).

Next steps (implementation):

1. Identify highest-value agent and skill to expose and create symlink/wrapper.
2. Run `./scripts/claude-setup.sh` (dry-run then real) to create symlinks.
3. Update `CLAUDE.md` with explicit examples how to invoke the two exposed
   elements in Claude Code.
4. Add a small test that verifies `.claude/agents` contains expected files
   (unit test or simple script).

Notes for reviewers:

- No secrets should be added to `.mcp.json` if created. Use environment vars.
- The validator script intentionally does not fail on absence of `.mcp.json`.

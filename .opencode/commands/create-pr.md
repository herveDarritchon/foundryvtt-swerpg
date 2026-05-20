---
description: Prepare or create a Pull Request targeting develop
agent: cmd-create-pr
subtask: true
context: fork
---

Use the `creer-pull-request` skill.

Task: prepare or create a Pull Request from the current feature/fix/docs/chore branch to `develop`.

Arguments, if provided: `$ARGUMENTS`

Rules:
- Target branch is `develop` unless explicitly instructed otherwise.
- Verify current branch is not `main`, `master`, or `develop`.
- Stop immediately if current branch is `main`, `master`, or `develop`.
- Verify `git status` before PR creation.
- If the worktree has changes, create a Conventional Commits / semantic-release compatible commit before PR creation.
- Do not create an empty commit when the worktree is clean.
- Infer the commit type from the branch name and diff:
  - `feat/...` -> `feat`
  - `fix/...` -> `fix`
  - docs-only changes -> `docs`
  - tests-only changes -> `test`
  - CI changes -> `ci`
  - build/tooling changes -> `build`
  - otherwise use the most factual conservative type, usually `chore`
- Commit message format must be:
  `<type>(<optional scope>): <short factual summary>`
- Do not include secrets, temporary logs, caches, dependency folders, or obviously generated out-of-scope files.
- Inspect commits and diff against `develop` after the commit step.
- Use only factual changes from the diff.
- Mention tests/validations only if they were actually run.
- Do not invent results.
- Do not run lint, tests, build, or other validations during `/create-pr` unless explicitly requested.
- If the branch is not pushed, ask before pushing unless the user explicitly requested PR creation.
- If readiness is unclear, prepare the PR body but stop before creating it.

PR body should include:
- linked issue;
- context;
- summary of changes;
- technical notes;
- tests run;
- known limits;
- points of attention.

Use `gh pr create` only when prerequisites are met.

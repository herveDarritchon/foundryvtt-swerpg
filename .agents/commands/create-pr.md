---
description: Prepare or create a Pull Request targeting develop
---

Use the `creer-pull-request` skill.

Task: prepare or create a Pull Request from the current feature branch to `develop`.

Arguments, if provided: `$ARGUMENTS`

Rules:
- Target branch is `develop` unless explicitly instructed otherwise.
- Verify current branch is not `main`, `master`, or `develop`.
- Verify `git status` before PR creation.
- Inspect diff against `develop`.
- Use only factual changes from the diff.
- Mention tests/validations only if they were actually run.
- Do not invent results.
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

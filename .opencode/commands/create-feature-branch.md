---
description: Create a feature branch from up-to-date develop
agent: cmd-create-feature-branch
subtask: true
---

Use the `creer-branche-feature` skill.

Create a dedicated feature branch from `develop`.

Arguments expected: `$ARGUMENTS`

Typical arguments:
- issue number;
- slug or short title;
- optional branch prefix: `feat`, `fix`, `chore`, or `docs`.

Rules:
- Do not modify `main`, `master`, or `develop` directly.
- Verify the working tree with `git status` before changing branch.
- If the working tree is dirty, stop and report the uncommitted changes.
- Fetch remote state.
- Checkout `develop`.
- Pull with `--ff-only`.
- Create a branch named `<prefix>/<issue-number>-<slug>`.
- Use `feat` by default unless the requested work clearly requires another prefix.
- Do not implement code.
- Do not commit.
- Do not push unless explicitly asked.

Report the final branch name and current `git status`.

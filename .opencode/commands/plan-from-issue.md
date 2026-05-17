---
description: Produce and write an actionable implementation plan from an issue or cadrage
agent: cmd-plan-from-issue
subtask: true
---

Use the `plan-depuis-issue` skill.

Input: `$ARGUMENTS`

Task:
Produce a short actionable implementation plan from the provided issue or cadrage, then write it directly as a Markdown file under:

`documentation/plan/<business-domain-path>/<issue-number>-<kebab-case-slug>.md`

Rules:
- Do not only print the plan in chat.
- Do not create a temporary plan file unless explicitly requested.
- Do not write directly under `documentation/plan/`.
- Do not write outside `documentation/plan/<business-domain-path>/`.
- Do not overwrite an existing file silently.
- Do not modify source code.
- Do not run tests.
- Do not create a branch, commit, or PR.
- Reply only with the exact created path, or a `BLOCKED:` reason.
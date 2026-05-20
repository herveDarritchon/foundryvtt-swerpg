---
description: Produce and write project-plan.md et issues-checklist.md
agent: cmd-plan-from-cadrage
subtask: true
context: fork
---

Use the `plan-depuis-issue` skill.

Input: `$ARGUMENTS`

Task:
Produce a short project plan and issues checklist from the provided cadrage and project documentation, then write it directly as a Markdown files under:

/documentation/ways-of-work/plan/{epic-name}/{feature-name}/project-plan.md
/documentation/ways-of-work/plan/{epic-name}/{feature-name}/issues-checklist.md

Rules:
- Do not only print the plan in chat.
- Do not create a temporary plan file unless explicitly requested.
- Do not write directly under `documentation/ways-of-work/plan/`.
- Do not write outside `/documentation/ways-of-work/plan/{epic-name}/{feature-name}/`.
- Do not overwrite an existing file silently.
- Do not modify source code.
- Do not run tests.
- Do not create a branch, commit, or PR.
- Reply only with the exact created path, or a `BLOCKED:` reason.


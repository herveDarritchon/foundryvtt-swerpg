---
description: Implement code and tests from an approved plan
---

Use the `implementer-depuis-plan` skill.

Task: implement strictly from the approved plan.

Arguments, if provided: `$ARGUMENTS`

Expected inputs may include:
- path to a plan under `documentation/plan/`;
- issue number or URL;
- explicit implementation scope.

Rules:
- Read the relevant plan before editing.
- Keep changes within the approved scope.
- Add or update tests with the code change.
- Do not introduce opportunistic refactors.
- Do not change persisted schema or public data models unless the plan says so.
- Use `logger` instead of `console.xxx`.
- Respect existing architecture and project skills.
- Do not claim validations passed unless they were run.

Before editing, summarize:
- files likely to change;
- tests likely to add/update;
- any blocking ambiguity.

If the plan is missing or ambiguous, stop and ask for clarification.

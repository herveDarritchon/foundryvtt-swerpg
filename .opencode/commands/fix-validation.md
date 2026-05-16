---
description: Analyze a failed validation and apply the smallest scoped fix
agent: cmd-fix-validation
subtask: true
---

Use the `corriger-echec-validation` skill.

Task: analyze a failed lint/test/build/e2e validation and apply the smallest in-scope correction.

Arguments, if provided: `$ARGUMENTS`

Rules:
- Read only the relevant failure logs and related files.
- Classify the failure before editing: code, test, configuration, or environment.
- Fix the root cause, not only the symptom.
- Apply the smallest correction consistent with the issue and plan.
- Never weaken, delete, skip, or bypass a test to make the suite pass.
- Do not broaden the refactor.
- After the fix, rerun only the failed command first.
- Recommend full validation after the focused command passes.
- Do not create commits or PRs.

Report:
- failure classification;
- root cause;
- files changed;
- command rerun;
- result.

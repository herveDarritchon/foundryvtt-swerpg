---
description: Compare issue, plan, diff, tests and validations before PR
agent: cmd-verify-scope-before-pr
subtask: true
---

Use the `verifier-scope-avant-pr` skill.

Task: verify that the current branch is ready for PR and that the diff stays within scope.

Arguments, if provided: `$ARGUMENTS`

Check:
- current branch and target branch;
- related issue or plan;
- `git status`;
- diff against `develop`;
- modified files;
- tests added or updated;
- validations actually executed.

Rules:
- Do not modify code unless explicitly asked.
- Do not create the PR.
- Do not claim validations passed without evidence.
- Flag out-of-scope changes clearly.
- Flag missing tests or missing validation clearly.
- Distinguish blocking issues from warnings.

Report:
- scope status: ready / not ready;
- issue-plan-diff alignment;
- out-of-scope changes;
- test coverage assessment;
- validations evidence;
- required actions before PR.

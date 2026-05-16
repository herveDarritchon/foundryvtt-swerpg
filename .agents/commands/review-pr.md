---
description: Review PR architecture, tests, maintainability and scope
---

Use the `reviewer-pr-architecture` skill.

Task: review the current PR or provided PR reference for architecture, tests, maintainability and scope.

Arguments, if provided: `$ARGUMENTS`

Review against:
- linked issue;
- implementation plan if available;
- project architecture rules;
- coding conventions;
- test strategy;
- diff against target branch.

Rules:
- Review first; do not edit unless explicitly asked.
- Separate blocking issues from non-blocking suggestions.
- Do not request broad refactors unless they are necessary for correctness or maintainability.
- Identify missing or weak tests.
- Identify out-of-scope changes.
- Be factual and cite files or diff areas when possible.

Report sections:
- Verdict: approve / request changes / needs clarification.
- Blocking issues.
- Non-blocking suggestions.
- Tests and validation.
- Scope and maintainability.

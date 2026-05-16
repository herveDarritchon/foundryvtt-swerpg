---
description: Run project validation commands and report factual results
---

Use the `executer-validation-projet` skill if available.

Task: run the relevant project validations and report factual results.

Arguments, if provided: `$ARGUMENTS`

Validation commands available in this project:

```bash
pnpm exec eslint <targets>
pnpm test
pnpm vitest run tests/path/to.test.mjs
pnpm e2e:ci
pnpm run build
```

Rules:
- Run commands through the shell; do not simulate them.
- There is no `lint` npm script. Use `pnpm exec eslint <targets>`.
- Prefer focused validation first when the changed area is clear.
- Run broader validation before PR readiness.
- Do not fix code in this command.
- If a command fails, capture the useful error output and stop with a factual report.
- Do not claim success without command output.

Report:
- commands run;
- pass/fail status;
- relevant failing logs if any;
- suggested next command, usually `/fix-validation` for failures.

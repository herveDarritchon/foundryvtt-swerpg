---
description: Write an approved implementation plan under documentation/plan/
---

Use the `ecrire-plan-fichier` skill.

Task: write the already drafted or validated plan into a Markdown file under `documentation/plan/`.

Arguments, if provided: `$ARGUMENTS`

Rules:
- Do not redesign, expand, or reinterpret the plan.
- Preserve the plan language and meaning.
- Infer a kebab-case filename only when safe.
- Check `documentation/plan/` before writing.
- Do not overwrite an existing file silently.
- Do not modify source code.
- Do not run tests.
- Reply with the exact created path.

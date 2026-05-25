# CLAUDE.md — e2e/documentation

## Language rule (always)

**All user-visible content strings in guide specs MUST be written in English.**

This applies to every `*.guide.spec.ts` file under `specs/`:

| Field | Scope | Rule |
|---|---|---|
| `GUIDE_TITLE` | constant | English |
| `GUIDE_DESCRIPTION` | constant | English |
| `recorder.record({ title })` | step title | English |
| `recorder.record({ userAction })` | step action | English |
| `recorder.record({ expectedState })` | step expected result | English |

These values flow into `documentation-output/guides/<guide>.json` and then into `documentation-output/markdown/<guide>.md`. The markdown is the end-user artefact — it must be fully English.

## What is NOT affected

- Code comments (`//`, `/* */`) — may stay in French (project convention)
- `stepSlug` values — internal filename slugs, not user-visible
- `test.describe(...)` / `test(...)` labels — internal Playwright test names

## Generated artefacts

After any spec change, run:

```bash
pnpm e2e:documentation   # regenerates JSON + screenshots
pnpm docs:generate-user-guides  # regenerates markdown from JSON
```

If you edit the JSON directly (without re-running e2e), still run `pnpm docs:generate-user-guides` to keep the markdown in sync.

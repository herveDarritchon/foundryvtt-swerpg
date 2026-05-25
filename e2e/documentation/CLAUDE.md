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

| Command | Input | Output |
|---|---|---|
| `pnpm e2e:documentation` | Playwright spec | `documentation-output/guides/<id>.json` + screenshots |
| `pnpm docs:generate-user-guides` | JSON | `documentation-output/markdown/<id>.md` |
| `pnpm docs:generate-user-guides:html` | JSON | `documentation-output/html/<id>.html` + `index.html` |
| `pnpm docs:generate-all` | JSON | markdown + HTML in one shot |

After any spec change, run e2e first, then regenerate outputs:

```bash
pnpm e2e:documentation
pnpm docs:generate-all
```

## HTML deployment

The `documentation-output/html/` folder is deployable to any static server.
Deploy it alongside `documentation-output/screenshots/` at the same level so relative paths (`../screenshots/…`) resolve correctly.

```
server-root/
  html/
    index.html
    character-sheet.html
  screenshots/
    character-sheet/
      01-*.png
      …
```

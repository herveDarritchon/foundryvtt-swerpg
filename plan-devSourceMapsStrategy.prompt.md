# Development Source Maps & Bundle Strategy

## Problem Statement

Currently in development, you are using the bundled version of the code (`dist/swerpg.bundle.js`) as configured in `system.json`. This means:

- In Firefox/Chrome DevTools, you see minified/bundled code instead of source files
- Debugging is harder because line numbers don't map to the IDE
- You want to keep the bundle for production (smaller download, single file)
- You want exploded/source view for local development (easier to debug, like in your IDE)

## Goal

Enable source-level debugging in the development environment while maintaining an optimized bundle for production. Developers should see original `.mjs` files in DevTools during dev, with correct line numbers and file paths.

## Solution: Two Approaches

### Approach A: Source Maps (Recommended First Step - Minimal Changes)

**Scope**: Add source maps to Rollup bundle — minimal code change, works immediately.

**How it works**:

- Rollup generates `.js.map` files alongside the bundle
- DevTools automatically loads these maps and displays original source files
- No changes to `system.json` needed
- Works with existing bundled architecture

**Implementation**:

1. Modify `rollup.config.mjs`: add `sourcemap: true` to `output` object
2. Build: `pnpm run rollup`
3. Verify: In DevTools, you should see `swerpg.mjs`, `module/...` files listed under `Sources` tab
4. Optionally create `rollup.config.dev.mjs` with dev-specific settings (`compact: false`, `sourcemap: inline` or `true`)

**Pros**:

- Minimal change (1-2 lines in rollup config)
- Backward compatible
- Works with CI/CD as-is
- Standard approach for production bundles

**Cons**:

- Source maps shipped with bundle (slight overhead, but typically excluded from production anyway)
- Still have line offset risk if bundle transformation changes source structure

### Approach B: Bypass Bundle in Dev (Advanced - More Flexibility)

**Scope**: Point `system.json` directly to `swerpg.mjs` during development, use bundle only for production.

**How it works**:

- Dev (`local dev machine`): `system.json` → `"esmodules": ["swerpg.mjs"]` (Foundry v14 loads ES modules natively)
- Prod (`CI/release`): `system.json` → `"esmodules": ["dist/swerpg.bundle.js"]` (bundled)
- Foundry v14 supports native ES modules, so no bundling needed for dev
- No module resolution issues because `@rollup/plugin-node-resolve` handled at build time

**Implementation**:

1. Create environment-aware `system.json` template or dual configs
2. Manual switch during dev OR automate via build script
3. Add pre-release hook to restore bundle reference before publishing
4. Update rollup to still create bundle for production deployments

**Pros**:

- Perfect debugging experience (identical to IDE)
- No source map overhead
- Can test real module loading behavior

**Cons**:

- Requires managing dual `system.json` state
- Needs automation to prevent accidentally shipping dev version
- Module imports must not have runtime side effects per ES spec

## Recommended Phased Approach

### Phase 1: Source Maps (Do This First)

- **Effort**: 5 minutes
- **Risk**: Low
- **Impact**: Immediate improvement to debugging experience
- **Next step**: If satisfactory, done. If you want more control, proceed to Phase 2.

**Actions**:

- Edit `rollup.config.mjs`: add `sourcemap: true` to output
- Optional: Create `rollup.config.dev.mjs` for dev-specific settings
- Update `package.json` scripts if needed
- Document in README

### Phase 2: Bypass Bundle Strategy (Optional - If Phase 1 Not Enough)

- **Effort**: 30-45 minutes
- **Risk**: Medium (need good automation to avoid dev/prod mix-up)
- **Impact**: Perfect source experience + validation of module loading

**Actions**:

- Create `system.json.template` with `#{ESMODULES}#` placeholder
- Create build script: `scripts/build-system-config.mjs` to generate dev vs prod versions
- Update CI/release pipeline to use prod version
- Add git hook or CI check to prevent committing dev version
- Document workflow clearly

## Questions for Refinement

1. **node_modules dependencies**: Are there any runtime imports from `node_modules` (npm packages) in your code, or is everything self-contained in `module/`?

2. **CI/Release pipeline**: Do you already have a release pipeline that modifies `system.json` (I saw placeholders like `#{VERSION}#`). Can this be extended?

3. **Dev experience priority**: Is source-map debugging enough, or do you specifically want to validate Foundry's native ES module loading in dev?

4. **Team**: Are you the only dev, or do you need to document this workflow for team members?

## Success Criteria

- [ ] Dev environment shows original `.mjs` source files in DevTools with correct line numbers
- [ ] Production build still produces optimized `dist/swerpg.bundle.js`
- [ ] Debugging experience matches IDE (or close enough)
- [ ] No accidental dev bundles shipped to production
- [ ] Workflow documented for future developers

## Files to Modify / Create

### Approach A (Source Maps):

- `rollup.config.mjs` — add sourcemap option
- (Optional) `rollup.config.dev.mjs` — dev-specific config
- `package.json` — (optional) new dev scripts
- README — document dev setup

### Approach B (Bypass Bundle):

- `rollup.config.mjs` — keep as-is (always build bundle for prod)
- `system.json.template` — new file with placeholder
- `scripts/build-system-config.mjs` — new script to generate dev/prod versions
- `system.json` — generated from template (possibly .gitignore'd)
- `.github/workflows/*.yml` or `release.js` — ensure prod version used in CI
- `package.json` — new scripts for dev workflow
- README — document dual-mode setup

## Time Estimate

- **Approach A**: 10 minutes (source maps only)
- **Approach B**: 45-60 minutes (full bypass + automation + docs)

## Next Steps

1. **Decide**: Which approach appeals to you? (Recommendation: Start with A, upgrade to B if needed)
2. **Confirm**: Any show-stoppers in the questions above?
3. **Implement**: I can implement either approach in detail once you confirm direction.

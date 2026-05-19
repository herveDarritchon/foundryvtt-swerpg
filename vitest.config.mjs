import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.mjs'],
    include: ['tests/**/*.test.{js,mjs,cjs,ts,mts,cts}', 'tests/**/*.spec.{js,mjs,cjs,ts,mts,cts}'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/.opencode/**', '**/dist/**', '**/build/**', '**/coverage/**', '.opencode/**'],
    globals: true,
    reporters: ['verbose'],
  },
  diff: {
    contextLines: 10,
    expand: true,
    truncateThreshold: 0,
    printBasicPrototype: false,
    maxDepth: 30,
  },
})

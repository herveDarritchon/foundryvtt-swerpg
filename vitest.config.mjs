import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.mjs'],
    include: ['tests/**/*.test.mjs'],
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

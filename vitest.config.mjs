import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.mjs'],
    include: ['tests/**/*.test.mjs'],
    globals: true,
  },
})

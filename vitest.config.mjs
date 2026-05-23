import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/vitest-setup.js'],
    clearMocks: true, // ⬅️ nettoie les mocks entre chaque test
    restoreMocks: true, // ⬅️ remet les implémentations d'origine si tu fais vi.spyOn()
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Configuration pour améliorer la couverture
      include: ['module/**/*.{js,mjs}', '!module/**/*.test.{js,mjs}', '!module/**/*.spec.{js,mjs}'],
      exclude: ['node_modules/**', 'tests/**', 'coverage/**', 'build/**', 'packs/**', '_source/**', 'e2e/**'],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },

    include: ['tests/**/*.test.{js,mjs,cjs,ts,mts,cts}', 'tests/**/*.spec.{js,mjs,cjs,ts,mts,cts}'],

    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.opencode/**',
      '**/.claude/**',
      '**/.agents/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/packs/**',
      '**/_source/**',
      '**/e2e/**',
    ],

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

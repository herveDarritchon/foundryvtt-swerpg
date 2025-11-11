// Vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/vitest-setup.js'],
    clearMocks: true,       // ⬅️ nettoie les mocks entre chaque test
    restoreMocks: true,     // ⬅️ remet les implémentations d'origine si tu fais vi.spyOn()
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Configuration pour améliorer la couverture
      include: [
        'module/**/*.{js,mjs}',
        '!module/**/*.test.{js,mjs}',
        '!module/**/*.spec.{js,mjs}'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        'build/**',
        'packs/**',
        '_source/**'
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
  },
})

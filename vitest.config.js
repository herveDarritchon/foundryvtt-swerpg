// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        setupFiles: ['./tests/vitest-setup.js'],
        //clearMocks: true,       // ⬅️ nettoie les mocks entre chaque test
        //restoreMocks: true,     // ⬅️ remet les implémentations d’origine si tu fais vi.spyOn()
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: './coverage',
        },
    },
});
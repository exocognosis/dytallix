import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Test patterns
        include: ['tests/**/*.test.js'],
        exclude: ['node_modules', 'dist', 'build'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '*.config.js',
                'dist/',
                'build/',
            ],
            lines: 80,
            functions: 80,
            branches: 80,
            statements: 80,
        },

        // Globals (optional, allows using describe/it without imports)
        globals: true,

        // Test timeout
        testTimeout: 10000,

        // Setup files
        setupFiles: ['./tests/setup.js'],
    },

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@server': path.resolve(__dirname, './server'),
            '@tests': path.resolve(__dirname, './tests'),
        },
    },
});

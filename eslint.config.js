// ESLint-Regeln für die Seite (Browser, ES-Module), die Tests und Werkzeuge (Node).
import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['vendor/**', 'node_modules/**', 'leonai-explains/**', 'shots/**'] },
    js.configs.recommended,
    {
        files: ['js/**/*.js'],
        languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser } },
        rules: {
            'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': ['error', { destructuring: 'all' }],
            'no-implicit-globals': 'error'
        }
    },
    {
        // Inhalte und Admin als klassische Skripte (auch ohne Modul-Unterstützung lesbar)
        files: ['data/**/*.js', 'admin.js'],
        languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser } },
        rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] }
    },
    {
        files: ['tests/**/*.mjs', 'tools/**/*.mjs', 'eslint.config.js'],
        // Tests führen Code auch im Browser aus (page.evaluate) – daher beide Umgebungen
        languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
        rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] }
    }
];

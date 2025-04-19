// .eslintrc.cjs
module.exports = {
    // Parser per TypeScript
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022, // Permette feature JS moderne
        sourceType: 'module', // Abilita import/export
        // Collega al tsconfig per regole basate sui tipi (anche se non attive ora)
        // Assicurati che il percorso a tsconfig.json sia corretto rispetto a questo file
        project: './tsconfig.json',
    },
    // Ambienti predefiniti
    env: {
        browser: true, // Abilita globali del browser (window, document, etc.) - Utile per newtab, content
        es2021: true, // Abilita globali ES2021
        webextensions: true, // Abilita globali API WebExtension (chrome.*, browser.*) - Fondamentale!
    },
    // Configurazioni estese (vengono applicate in ordine)
    extends: [
        'eslint:recommended', // Regole base consigliate da ESLint
        'plugin:@typescript-eslint/recommended', // Regole base consigliate per TypeScript
        // Considera di abilitare in futuro per controlli più stretti sui tipi:
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier', // Disabilita regole ESLint conflittanti con Prettier - DEVE ESSERE L'ULTIMO!
    ],
    // Plugin utilizzati
    plugins: [
        '@typescript-eslint', // Plugin per le regole TypeScript
    ],
    // Regole personalizzate (override o aggiunte)
    rules: {
        // Esempi (decommenta o aggiungi le tue):
        // 'no-console': 'warn', // Segnala console.log come warning invece che errore
        // '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }], // Warning per var non usate (ignora quelle che iniziano con _)
        // '@typescript-eslint/no-explicit-any': 'warn', // Warning sull'uso di 'any'
    },
    // File e cartelle da ignorare durante il linting
    ignorePatterns: [
        'dist/',
        'node_modules/',
        'vite.config.ts', // Spesso è meglio ignorare i file di config
        '.eslintrc.cjs',  // Ignora se stesso
        '*.d.ts',         // Ignora file di dichiarazione Tipi
    ],
};
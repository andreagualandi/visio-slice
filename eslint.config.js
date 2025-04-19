// eslint.config.js
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    // 1. Ignora File Globali
    {
        ignores: [
            'dist/',
            'node_modules/',
            'vite.config.ts',
            'eslint.config.js', // Ignora se stesso
            '*.d.ts',
            'public/', // Ignoriamo anche la cartella public (contiene solo assets/manifest per ora)
            // Aggiungi altri pattern se necessario
        ],
    },

    // 2. Configurazione per file TypeScript in src/
    {
        files: ['src/**/*.ts'], // Applica solo ai file .ts in src/
        plugins: {
            // Definisce il plugin TS, associandolo a un nome
            '@typescript-eslint': tsPlugin,
        },
        languageOptions: {
            // Configura il parser e le sue opzioni
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json', // Necessario per regole type-aware
            },
            // Definisce le variabili globali disponibili
            globals: {
                ...globals.browser, // Globali del browser (window, document...)
                ...globals.es2021, // Globali JS moderni
                ...globals.webextensions, // Globali Chrome API (chrome.*)
            },
        },
        // Applica le regole raccomandate dal plugin TS
        // Nota: 'eslint:recommended' è spesso implicito o richiede setup aggiuntivo con @eslint/js
        // Iniziamo con le regole TS raccomandate che sono molto complete.
        rules: {
            // Carica le regole da @typescript-eslint/recommended
            ...tsPlugin.configs['recommended'].rules,
            '@typescript-eslint/no-unused-vars': [
                'warn', // O "error" se preferisci essere più stretto
                {
                    argsIgnorePattern: '^_', // Ignora parametri che iniziano con _
                    varsIgnorePattern: '^_', // Ignora variabili che iniziano con _
                    caughtErrorsIgnorePattern: '^_', // Ignora errori catch che iniziano con _
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn', // Opzione 1: Segnala 'any' come warning (meno bloccante)
        },
    },
];

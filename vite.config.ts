// vite.config.ts - Usando @crxjs/vite-plugin

import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // sourcemap: true, // Utile per debug
        // Non servono più rollupOptions complesse per input/output,
        // il plugin CRX le gestirà basandosi sul manifest.
        // Potresti comunque aver bisogno di rollupOptions per altre customizzazioni.
        // rollupOptions: { ... }
    },
    plugins: [
        // Usa il plugin crx, passando il tuo manifest
        crx({ manifest }),
    ],
});

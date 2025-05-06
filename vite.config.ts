// vite.config.ts - Usando @crxjs/vite-plugin

import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // sourcemap: true, // Utile per debug
        rollupOptions: {
            input: {
                // Pagina Popup (assicurati che il percorso sia corretto)
                popup: resolve(__dirname, 'src/popup/popup.html'),

                // Pagina Galleria (ex gallery - assicurati che il percorso sia corretto)
                gallery: resolve(__dirname, 'src/gallery/index.html'),

                // Non è necessario aggiungere qui background.ts o content.ts
                // perché crx({ manifest }) di solito li gestisce automaticamente
                // basandosi sul manifest.json. Aggiungere solo gli HTML.
            },
            // Potrebbero servire opzioni di output se vuoi controllare
            // i nomi dei file, ma di solito non è necessario.
            // output: { ... }
        },
    },
    plugins: [
        // Usa il plugin crx, passando il tuo manifest
        crx({ manifest }),
    ],
    base: './',
});

// vite.config.ts - Usando @crxjs/vite-plugin

import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin'; // Importa il plugin
// Importa il tuo manifest per passarlo al plugin
// Assicurati che il percorso sia corretto. Se hai spostato il manifest sorgente
// altrove (es. nella root), aggiorna il percorso. Qui assumiamo sia ancora in public/
import manifest from './public/manifest.json';
// Se manifest.json è stato spostato nella root o in src/, aggiorna il path:
// import manifest from './manifest.json';
// import manifest from './src/manifest.json';

export default defineConfig({
    // Non serve più publicDir se il manifest è specificato direttamente
    // publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
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

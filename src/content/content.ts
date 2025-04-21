// src/content/content.ts

import { CONTENT_SCRIPT_READY } from '../shared/constants';
import { handleBackgroundMessages } from './handlers';

// --- Inizio IIFE ---
(function () {
    // Funzione di logging con tipo per rest parameters
    const log = (...args: unknown[]): void => console.log('[WebAreaSaver]', ...args);

    // Aggiungi listener SOLO UNA VOLTA quando lo script carica
    if (!window.webAreaSaverListenerAttached) {
        // Usa l'handler importato da handlers.ts
        chrome.runtime.onMessage.addListener(handleBackgroundMessages);
        window.webAreaSaverListenerAttached = true;
        log('Content script caricato e listener onMessage aggiunto.');
        log('Invio messaggio CONTENT_SCRIPT_READY al background...');
        // Invia il segnale di pronto
        chrome.runtime
            .sendMessage({ type: CONTENT_SCRIPT_READY })
            .then(() => log('Messaggio CONTENT_SCRIPT_READY inviato.'))
            .catch((err) => console.warn(`Invio CONTENT_SCRIPT_READY fallito: ${err.message || err}`));
    } else {
        log('Content script listener già presente (probabile HMR?).');
    }
})(); // --- Fine IIFE ---

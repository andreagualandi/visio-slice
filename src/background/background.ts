// src/background/background.ts

import { handleRuntimeMessage } from './message.handler';

// delega tutta la gestione all'handler importato.
chrome.runtime.onMessage.addListener(handleRuntimeMessage);
console.log('Web Area Saver: Service Worker TypeScript avviato.');

// Nota: Eventuali altre inizializzazioni specifiche del service worker
// (es. gestione allarmi, listener onInstalled) andrebbero aggiunte qui,

// tabs-facade.ts

import { ExtensionMessage } from '../shared/types';

/**
 * Trova la scheda attiva nella finestra corrente.
 * @returns Una Promise che risolve con l'oggetto Tab attivo o undefined se non trovato.
 */
export function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                // Se c'è un errore API, rigetta la Promise
                return reject(chrome.runtime.lastError);
            }
            // Risolve con la prima scheda trovata (o undefined se l'array è vuoto)
            resolve(tabs?.[0]);
        });
    });
}

/**
 * Invia un messaggio a una specifica scheda.
 * @param tabId L'ID della scheda a cui inviare il messaggio.
 * @param message L'oggetto messaggio da inviare.
 * @returns Una Promise che risolve con la risposta dal content script, o rigetta se c'è un errore.
 * Nota: Rigetta anche se non c'è un ricevitore nella scheda di destinazione.
 */
export function sendMessageToTab<T = unknown>(tabId: number, message: ExtensionMessage): Promise<T> {
    // chrome.tabs.sendMessage in MV3 restituisce già una Promise che rigetta in caso di errore
    // (incluso il caso in cui il ricevitore non esiste o c'è un runtime.lastError).
    // Non è strettamente necessario un ulteriore wrapper Promise, ma possiamo aggiungerlo
    // per coerenza o per un logging/error handling più specifico se necessario.
    return new Promise(async (resolve, reject) => {
        try {
            const response = await chrome.tabs.sendMessage(tabId, message);
            // Controlla lastError anche se la promise dovrebbe rigettare (per sicurezza ridondante)
            if (chrome.runtime.lastError) {
                console.error('sendMessageToTab - runtime.lastError:', chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
            } else {
                resolve(response as T);
            }
        } catch (error) {
            // Cattura l'errore rigettato dalla Promise di sendMessage
            // console.warn(`sendMessageToTab Error for tab ${tabId}:`, error instanceof Error ? error.message : error); // Log utile per debug
            reject(error);
        }
    });
    // Alternativa più semplice: return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Cattura l'area visibile della scheda specificata o della finestra corrente.
 * @param windowId L'ID opzionale della finestra da catturare. Default: finestra corrente.
 * @returns Una Promise che risolve con la data URL dell'immagine catturata (formato PNG).
 */
export function captureVisibleTab(windowId?: number): Promise<string> {
    return new Promise((resolve, reject) => {
        // Determina l'ID della finestra da usare
        const targetWindowId = windowId ?? chrome.windows.WINDOW_ID_CURRENT;
        // Opzioni per la cattura
        const captureOptions: chrome.tabs.CaptureVisibleTabOptions = { format: 'png' };

        chrome.tabs.captureVisibleTab(targetWindowId, captureOptions, (dataUrl?: string) => {
            if (chrome.runtime.lastError) {
                // Se c'è un errore API (es. finestra non trovata, permessi mancanti)
                console.error('captureVisibleTab - runtime.lastError:', chrome.runtime.lastError.message);
                return reject(chrome.runtime.lastError);
            }
            if (!dataUrl) {
                // Se non viene restituita una dataUrl (caso improbabile se non c'è lastError)
                console.error('captureVisibleTab - No data URL returned without error.');
                return reject(new Error('Impossibile catturare la scheda: nessuna data URL restituita.'));
            }
            // Se tutto va bene, risolve con la data URL
            resolve(dataUrl);
        });
    });
}

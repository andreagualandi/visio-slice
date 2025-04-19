// src/background/background.ts
// Contenuto copiato da codice/background.js

import { storageSet, isQuotaError } from '../shared/storage.util';
import { cropImage, createThumbnail } from '../shared/image.util';
import {
    MSG_TYPE_SELECTION_COMPLETE,
    MSG_TYPE_SAVE_SUCCESS,
    MSG_TYPE_SAVE_ERROR,
    STORAGE_KEY_PREFIX_CAPTURE,
} from '../shared/constants';

const MSG_TYPE_ACTIVATE_CAPTURE = 'ACTIVATE_CAPTURE'; // todo spostare in const

// Interfaccia per i dati della selezione ricevuti dal content script
interface SelectionData {
    top: number;
    left: number;
    width: number;
    height: number;
    dpr: number; // Device Pixel Ratio
}

// Interfaccia (opzionale ma consigliata) per la struttura dei messaggi
interface MessagePayload {
    type: string;
    data?: any; // Può essere reso più specifico se tutti i messaggi con 'data' usano SelectionData
    message?: string;
}

// Interfaccia per i dati salvati nello storage
interface SavedCaptureData {
    full: string; // Data URL dell'immagine ritagliata
    thumb: string; // Data URL della miniatura
}

// --- FUNZIONI HELPER ---
/**
 * Cattura l'area visibile della scheda specificata.
 * @param {number} tabId L'ID della scheda da catturare. NOTA: non viene poi utilizzato all'interno è incluso nella firma della funzione captureTab per chiarezza semantica
 * @returns {Promise<string>} Una Promise che risolve con la Data URL dell'immagine catturata.
 * @throws {Error} Se la cattura fallisce.
 */
function captureTab(): Promise<string> {
    // Aggiunto tipo tabId e ritorno Promise<string>
    console.log(`Tentativo cattura tab`);
    return new Promise((resolve, reject) => {
        // captureVisibleTab con primo argomento null cattura la scheda ATTIVA nel contesto corrente.
        chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'png' }, (imageDataUrl?: string) => {
            // Aggiunto tipo opzionale per imageDataUrl
            if (chrome.runtime.lastError || !imageDataUrl) {
                const errorMsg: string = `Errore cattura: ${chrome.runtime.lastError?.message || 'Nessun dato immagine restituito'}`;
                console.error(`Web Area Saver: ${errorMsg}`);
                reject(new Error(errorMsg));
            } else {
                resolve(imageDataUrl);
            }
        });
    });
}

/**
 * Salva i dati nello storage locale.
 * @param {string} key La chiave sotto cui salvare i dati.
 * @param {object} data L'oggetto contenente i dati (es. { full: ..., thumb: ... }).
 * @returns {Promise<void>} Una Promise che risolve al completamento del salvataggio.
 * @throws {Error} Se il salvataggio fallisce (incluso errore di quota).
 */
async function saveData(key: string, data: SavedCaptureData): Promise<void> {
    // Tipi per key, data e ritorno
    try {
        // Usa la funzione tipizzata da storage.util
        await storageSet({ [key]: data });
        console.log(`Web Area Saver: Dati salvati con chiave ${key}.`);
    } catch (error: any) {
        // Tipo 'any' o 'Error' per l'errore catturato
        console.error(`Web Area Saver: Errore salvataggio per chiave ${key}:`, error);
        throw error; // Rilancia l'errore originale
    }
}

/**
 * Invia un messaggio al content script nella scheda specificata.
 * @param {number} tabId L'ID della scheda a cui inviare il messaggio.
 * @param {string} type Il tipo di messaggio (usando le costanti MSG_TYPE_*).
 * @param {string} message Il contenuto del messaggio.
 */
function notifyContentScript(tabId: number, type: string, message: string): void {
    // Tipi per parametri, ritorno void
    // La payload del messaggio ora corrisponde a MessagePayload (senza 'data')
    const payload: MessagePayload = { type, message };
    chrome.tabs
        .sendMessage(tabId, payload)
        .catch((e: Error) =>
            console.warn(
                `Web Area Saver: Impossibile inviare messaggio a tab ${tabId} (forse chiusa o senza content script attivo?): ${e.message}`
            )
        );
}

/**
 * Estrae un messaggio di errore user-friendly da un errore catturato.
 * @param {Error} error L'oggetto errore catturato.
 * @returns {string} Il messaggio di errore da mostrare all'utente.
 */
function extractUserErrorMessage(error: Error | any): string {
    // Tipo Error | any per flessibilità
    // Usa la funzione tipizzata da storage.util
    if (isQuotaError(error)) {
        console.warn("Web Area Saver: Errore QUOTA rilevato durante l'operazione.");
        return 'Errore: Spazio di archiviazione locale pieno.';
    }
    // Messaggio generico per altri errori
    return `Errore durante l'elaborazione: ${error?.message || 'Errore sconosciuto'}`;
}

// --- ORCHESTRAZIONE ---
/**
 * Gestisce la richiesta di cattura area proveniente dal content script.
 * @param {object} selectionData Dati della selezione { top, left, width, height, dpr }.
 * @param {chrome.runtime.MessageSender} sender Informazioni sul mittente del messaggio.
 */
async function handleCaptureRequest(selectionData: SelectionData, sender: chrome.runtime.MessageSender): Promise<void> {
    // Tipi per parametri, ritorno Promise<void>
    if (!sender.tab || !sender.tab.id) {
        console.error('Web Area Saver: Richiesta cattura senza ID scheda mittente valido.', sender);
        return; // Esce se non c'è un tab valido
    }

    const sourceTabId: number = sender.tab.id;
    console.log(`Web Area Saver: Avvio processo cattura per tab ID: ${sourceTabId}`);
    const timestampKey: string = `${STORAGE_KEY_PREFIX_CAPTURE}${Date.now()}`;

    // Inizializza variabili per contenere le Data URL, tipo string | null
    let fullImageDataUrl: string | null = null;
    let croppedImageDataUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    try {
        // 1. Cattura la scheda
        fullImageDataUrl = await captureTab();
        if (!fullImageDataUrl) throw new Error('captureTab non ha restituito una data URL.'); // Controllo aggiuntivo

        // 2. Ritaglia l'immagine (passa selectionData direttamente, corrisponde a CropRect)
        console.log('Web Area Saver: Avvio ritaglio immagine...');
        croppedImageDataUrl = await cropImage(fullImageDataUrl, selectionData);
        if (!croppedImageDataUrl) throw new Error('cropImage non ha restituito una data URL.'); // Controllo

        // 3. Genera la miniatura (dall'immagine RITAGLIATA)
        console.log('Web Area Saver: Avvio generazione miniatura...');
        thumbnailUrl = await createThumbnail(croppedImageDataUrl, 200); // Larghezza miniatura fissa
        if (!thumbnailUrl) throw new Error('createThumbnail non ha restituito una data URL.'); // Controllo

        // 4. Prepara e salva i dati
        const dataToSave: SavedCaptureData = {
            full: croppedImageDataUrl, // Salva l'immagine già ritagliata come 'full'
            thumb: thumbnailUrl,
        };
        await saveData(timestampKey, dataToSave);

        // 5. Notifica successo al content script
        const successMsg: string = 'Area catturata e salvata!';
        console.log(`Web Area Saver: ${successMsg} Chiave: ${timestampKey}`);
        notifyContentScript(sourceTabId, MSG_TYPE_SAVE_SUCCESS, successMsg);
    } catch (error: any) {
        // Tipo 'any' per catturare tutti gli errori possibili
        // 6. Gestione errori e notifica al content script
        console.error('Web Area Saver: Errore durante il processo handleCaptureRequest:', error);
        const userErrorMessage: string = extractUserErrorMessage(error); // Estrae messaggio user-friendly

        // Notifica l'errore al content script
        notifyContentScript(sourceTabId, MSG_TYPE_SAVE_ERROR, userErrorMessage);
    }
}

// --- LISTENER PRINCIPALI (onClicked e onMessage) ---
// Listener per il click sull'icona
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
    // Tipo chrome.tabs.Tab per il parametro tab
    if (tab.id) {
        const targetTabId = tab.id;
        console.log(`Click azione: Invio messaggio ACTIVATE_CAPTURE a tab ${targetTabId}`);
        try {
            // Invece di iniettare lo script (che ora è auto-iniettato),
            // inviamo un messaggio per attivare l'UI nello script già presente.
            await chrome.tabs.sendMessage(targetTabId, { type: MSG_TYPE_ACTIVATE_CAPTURE });
            console.log('Messaggio ACTIVATE_CAPTURE inviato.');

            // Rimuoviamo la vecchia iniezione:
            /*
            await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                files: ['content.js'] // Non più necessario qui
            });
            */
        } catch (err: any) {
            console.error(`Errore invio messaggio ACTIVATE_CAPTURE a tab ${targetTabId}: ${err?.message || err}`);
            // Qui potremmo provare a iniettare lo script come fallback se l'invio messaggio fallisce?
            // Forse la pagina è stata appena aperta e lo script non è ancora caricato?
            // Potrebbe essere necessaria una logica più robusta qui.
            console.warn('Tentativo di fallback: iniezione script...');
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: targetTabId },
                    files: ['content.js'],
                });
                // Dopo l'iniezione, inviamo comunque il messaggio di attivazione
                await chrome.tabs.sendMessage(targetTabId, { type: MSG_TYPE_ACTIVATE_CAPTURE });
            } catch (injectionError: any) {
                console.error(`Fallito anche il fallback di iniezione: ${injectionError?.message || injectionError}`);
            }
        }
    } else {
        console.error('Impossibile ottenere ID scheda per attivare cattura.');
    }
});

// Listener per i messaggi dal content script
chrome.runtime.onMessage.addListener(
    (
        message: MessagePayload | any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ): boolean | undefined => {
        // Controlla se il tipo è quello atteso
        if (message?.type === MSG_TYPE_SELECTION_COMPLETE) {
            console.log('Web Area Saver (Background): Ricevuto messaggio SELECTION_COMPLETE.');
            // Verifica che message.data esista e abbia la struttura attesa (Type Guard o Assertion)
            if (message.data && typeof message.data === 'object' && 'width' in message.data) {
                // Chiamiamo handleCaptureRequest in modo asincrono ma non aspettiamo qui
                // La notifica di successo/errore viene inviata da dentro handleCaptureRequest
                handleCaptureRequest(message.data as SelectionData, sender);
                // Non è necessario restituire true perché non usiamo sendResponse qui.
                // Restituire false o undefined indica che il canale del messaggio può essere chiuso.
            } else {
                console.error(
                    "Web Area Saver (Background): Ricevuto SELECTION_COMPLETE ma i dati ('message.data') sono mancanti o non validi.",
                    message
                );
                // Potresti voler notificare il content script di questo errore?
                if (sender.tab?.id) {
                    notifyContentScript(
                        sender.tab.id,
                        MSG_TYPE_SAVE_ERROR,
                        'Errore interno: Dati di selezione mancanti o corrotti.'
                    );
                }
            }
        } else {
            console.log('Web Area Saver (Background): Ricevuto messaggio non gestito o senza tipo:', message);
        }

        // Restituisce false per indicare che non invieremo una risposta asincrona tramite sendResponse.
        return false;
    }
);

console.log('Web Area Saver: Service Worker TypeScript avviato.');

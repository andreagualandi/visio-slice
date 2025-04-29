// messageHandler.ts

// Importa Costanti e Tipi Condivisi
import { MSG_TYPE_SELECTION_COMPLETE, MSG_TYPE_SAVE_ERROR, START_CAPTURE_REQUEST } from '../shared/constants';

import { getActiveTab, sendMessageToTab } from './tabs.facade';
import { activateOrInjectContentScript } from './activation.handler';
import { processCaptureRequest } from './capture.orchestrator';
import { SelectionPayload } from '../shared/types';

const log = (...args: unknown[]): void => console.log('[MessageHandler]', ...args);

/**
 * Gestore principale per i messaggi runtime ricevuti.
 * Instrada i messaggi alle funzioni appropriate.
 */
export const handleRuntimeMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    _sendResponse: (response?: unknown) => void // Non usata attivamente ma presente nella firma
): boolean | undefined => {
    // Gestione SELECTION_COMPLETE
    if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === MSG_TYPE_SELECTION_COMPLETE
    ) {
        log('Ricevuto SELECTION_COMPLETE.');
        // Validazione dati payload
        if (
            'data' in message &&
            typeof message.data === 'object' &&
            message.data !== null &&
            'top' in message.data &&
            typeof message.data.top === 'number' &&
            'left' in message.data &&
            typeof message.data.left === 'number' &&
            'width' in message.data &&
            typeof message.data.width === 'number' &&
            'height' in message.data &&
            typeof message.data.height === 'number' &&
            'dpr' in message.data &&
            typeof message.data.dpr === 'number'
        ) {
            // Chiama l'orchestratore della cattura
            processCaptureRequest(message.data as SelectionPayload, sender);
        } else {
            console.error('MessageHandler: Ricevuto SELECTION_COMPLETE ma data è mancante o non valido.', message);
            if (sender.tab?.id) {
                sendMessageToTab(sender.tab.id, {
                    type: MSG_TYPE_SAVE_ERROR,
                    message: 'Errore interno: Dati selezione inviati non validi.',
                }).catch((err) => console.error('MessageHandler: Impossibile inviare errore dati non validi:', err));
            }
        }
        // Indichiamo che potremmo rispondere asincronamente
        return true;
    }

    // Gestione START_CAPTURE_REQUEST
    else if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === START_CAPTURE_REQUEST
    ) {
        log('Ricevuto START_CAPTURE_REQUEST.');

        (async () => {
            // IIFE per async/await
            let targetTabId: number | undefined;
            try {
                // Ottieni tab attivo usando la facade
                const activeTab = await getActiveTab();
                if (!activeTab?.id) {
                    throw new Error('Impossibile trovare una scheda attiva.');
                }
                targetTabId = activeTab.id;
                log(`Trovata scheda attiva ${targetTabId}. Avvio sequenza attivazione...`);
                // Chiama la logica di attivazione/iniezione
                await activateOrInjectContentScript(targetTabId);
            } catch (activationError: unknown) {
                // Errore generale durante il processo di attivazione/iniezione
                console.error(
                    `MessageHandler: Fallimento attivazione/iniezione per tab ${targetTabId ?? 'sconosciuta'}:`,
                    activationError
                );
            }
        })(); // Fine IIFE async

        // Non c'è risposta sincrona/asincrona al popup da qui
        return false;
    }
    // Altri tipi di messaggi...
    else {
        log('Ricevuto messaggio non gestito o non valido:', message);
    }

    // Default a false se non si usa sendResponse
    return false;
};

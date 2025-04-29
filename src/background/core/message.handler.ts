// src/background/core/message.handler.ts

import { MSG_TYPE_SELECTION_COMPLETE, MSG_TYPE_SAVE_ERROR, START_CAPTURE_REQUEST } from '../../shared/constants';
import { getActiveTab, sendMessageToTab } from '../../facades/tabs.facade';
import { activateOrInjectContentScript } from './activation.handler';
import { processCaptureRequest } from './capture.orchestrator';
import { SelectionPayload } from '../../shared/types';

const log = (...args: unknown[]): void => console.log('[MessageHandler]', ...args);

// Type guard per verificare se un oggetto è un SelectionPayload valido
function isValidSelectionPayload(data: unknown): data is SelectionPayload {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof (data as SelectionPayload).top === 'number' &&
        typeof (data as SelectionPayload).left === 'number' &&
        typeof (data as SelectionPayload).width === 'number' &&
        typeof (data as SelectionPayload).height === 'number' &&
        typeof (data as SelectionPayload).dpr === 'number'
    );
}

// Type guard per un messaggio con tipo
function isTypedMessage(msg: unknown): msg is { type: string; data?: unknown } {
    return typeof msg === 'object' && msg !== null && 'type' in msg;
}

// Gestione SELECTION_COMPLETE
async function handleSelectionComplete(message: { data?: unknown }, sender: chrome.runtime.MessageSender) {
    if (isValidSelectionPayload(message.data)) {
        log('Ricevuto SELECTION_COMPLETE.');
        processCaptureRequest(message.data, sender);
    } else {
        console.error('MessageHandler: Payload non valido per SELECTION_COMPLETE.', message);
        if (sender.tab?.id) {
            try {
                await sendMessageToTab(sender.tab.id, {
                    type: MSG_TYPE_SAVE_ERROR,
                    message: 'Errore interno: Dati selezione non validi.',
                });
            } catch (err) {
                console.error('MessageHandler: Errore durante l’invio del messaggio di errore:', err);
            }
        }
    }
}

// Gestione START_CAPTURE_REQUEST
async function handleStartCaptureRequest() {
    try {
        const activeTab = await getActiveTab();
        if (!activeTab?.id) {
            throw new Error('Scheda attiva non trovata.');
        }
        log(`Trovata scheda attiva ${activeTab.id}. Avvio iniezione...`);
        await activateOrInjectContentScript(activeTab.id);
    } catch (err) {
        console.error('MessageHandler: Errore in attivazione/iniezione:', err);
    }
}

// Gestore principale
export const handleRuntimeMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    _sendResponse: (response?: unknown) => void
): boolean | undefined => {
    if (!isTypedMessage(message)) {
        log('Messaggio non valido ricevuto:', message);
        return false;
    }

    switch (message.type) {
        case MSG_TYPE_SELECTION_COMPLETE:
            handleSelectionComplete(message, sender);
            return true;

        case START_CAPTURE_REQUEST:
            handleStartCaptureRequest();
            return false;

        default:
            log('Tipo di messaggio non gestito:', message.type);
            return false;
    }
};

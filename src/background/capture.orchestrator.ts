// captureOrchestrator.ts

// Importa Facades
import { sendMessageToTab, captureVisibleTab } from './tabs.facade';
import { storageSet } from '../shared/storage.util'; // Assumendo percorso corretto

// Importa Utils
import { extractUserErrorMessage, isQuotaError } from '../shared/error.util';
import * as imageUtil from '../shared/image.util';

// Importa Costanti
import { STORAGE_KEY_PREFIX_CAPTURE, MSG_TYPE_SAVE_SUCCESS, MSG_TYPE_SAVE_ERROR } from '../shared/constants';
import { SavedCaptureData, SelectionPayload } from '../shared/types';

const log = (...args: unknown[]): void => console.log('[CaptureOrchestrator]', ...args);

/**
 * Orchestra il processo di cattura: cattura tab, ritaglia, crea miniatura,
 * salva i dati e notifica il content script.
 * @param selectionData I dati della selezione ricevuti dal content script.
 * @param sender Le informazioni sul mittente del messaggio (per ottenere tabId).
 */
export async function processCaptureRequest(
    selectionData: SelectionPayload,
    sender: chrome.runtime.MessageSender
): Promise<void> {
    const sourceTabId = sender.tab?.id;
    if (!sourceTabId) {
        console.error('processCaptureRequest: Chiamato senza un sender.tab.id valido.');
        // Non possiamo notificare l'errore senza un tabId
        return;
    }

    log(`Avvio processo cattura per tab ID: ${sourceTabId}`);
    const timestampKey: string = `${STORAGE_KEY_PREFIX_CAPTURE}${Date.now()}`;

    try {
        // 1. Cattura la scheda usando la facade
        log('Cattura tab...');
        const fullImageDataUrl = await captureVisibleTab(); // Usa facade
        if (!fullImageDataUrl) throw new Error('captureVisibleTab non ha restituito una data URL.');

        // 2. Ritaglia l'immagine (usa image.util)
        log('Avvio ritaglio immagine...');
        const croppedImageDataUrl = await imageUtil.cropImage(fullImageDataUrl, selectionData);
        if (!croppedImageDataUrl) throw new Error('cropImage non ha restituito una data URL.');

        // 3. Genera la miniatura (usa image.util)
        log('Avvio generazione miniatura...');
        const thumbnailUrl = await imageUtil.createThumbnail(croppedImageDataUrl, 200);
        if (!thumbnailUrl) throw new Error('createThumbnail non ha restituito una data URL.');

        // 4. Prepara e salva i dati usando la facade storage
        const dataToSave: SavedCaptureData = {
            full: croppedImageDataUrl,
            thumb: thumbnailUrl,
        };
        log('Salvataggio dati...');
        await storageSet({ [timestampKey]: dataToSave }); // Usa facade storage
        log(`Dati salvati con chiave ${timestampKey}.`);

        // 5. Notifica successo al content script usando la facade messaging
        const successMsg: string = 'Area catturata e salvata!';
        log(`Invio notifica successo a tab ${sourceTabId}`);
        await sendMessageToTab(sourceTabId, { type: MSG_TYPE_SAVE_SUCCESS, message: successMsg }); // Usa facade messaging
    } catch (error: unknown) {
        console.error('Errore durante il processo processCaptureRequest:', error);
        // Estrae messaggio user-friendly usando errorUtils importato
        const userErrorMessage: string = extractUserErrorMessage(error);
        // Log specifico per quota error
        if (isQuotaError(error)) {
            console.warn('processCaptureRequest: Errore QUOTA rilevato.');
        }
        log(`Invio notifica errore a tab ${sourceTabId}`);
        try {
            // Notifica errore al content script usando la facade messaging
            await sendMessageToTab(sourceTabId, { type: MSG_TYPE_SAVE_ERROR, message: userErrorMessage });
        } catch (notifyError) {
            console.error(`Impossibile inviare notifica errore a tab ${sourceTabId}:`, notifyError);
        }
    }
}

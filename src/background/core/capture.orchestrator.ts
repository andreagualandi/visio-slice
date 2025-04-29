// src/background/core/capture.orchestrator.ts

// Importa Facades
import { sendMessageToTab, captureVisibleTab } from '../../facades/tabs.facade';
import { storageSet } from '../../facades/storage.facade';

// Importa Utils
import { extractUserErrorMessage, isQuotaError } from '../../shared/error.util';
import * as imageUtil from '../../shared/image.util';

// Importa Costanti
import { STORAGE_KEY_PREFIX_CAPTURE, MSG_TYPE_SAVE_SUCCESS, MSG_TYPE_SAVE_ERROR } from '../../shared/constants';
import { SavedCaptureData, SelectionPayload } from '../../shared/types';

const log = (...args: unknown[]): void => console.log('[CaptureOrchestrator]', ...args);

async function performCaptureWorkflow(selection: SelectionPayload): Promise<SavedCaptureData> {
    const full = await captureVisibleTab();
    if (!full) throw new Error('Nessuna immagine catturata.');

    const cropped = await imageUtil.cropImage(full, selection);
    if (!cropped) throw new Error('Errore nel ritaglio immagine.');

    const thumb = await imageUtil.createThumbnail(cropped, 200);
    if (!thumb) throw new Error('Errore nella generazione della miniatura.');

    return { full: cropped, thumb };
}

export async function processCaptureRequest(
    selection: SelectionPayload,
    sender: chrome.runtime.MessageSender
): Promise<void> {
    const tabId = sender.tab?.id;
    if (!tabId) {
        console.error('processCaptureRequest: tabId non valido.');
        return;
    }

    const key = `${STORAGE_KEY_PREFIX_CAPTURE}${Date.now()}`;
    log(`Cattura avviata per tab ${tabId} con chiave ${key}.`);

    try {
        const capture = await performCaptureWorkflow(selection);
        await storageSet({ [key]: capture });
        log(`Dati cattura salvati con chiave ${key}.`);

        await sendMessageToTab(tabId, { type: MSG_TYPE_SAVE_SUCCESS, message: 'Area catturata e salvata!' });
    } catch (err) {
        const msg = extractUserErrorMessage(err);
        if (isQuotaError(err)) console.warn('Limite di quota raggiunto.');

        try {
            await sendMessageToTab(tabId, { type: MSG_TYPE_SAVE_ERROR, message: msg });
        } catch (notifyErr) {
            console.error(`Errore durante notifica errore a tab ${tabId}:`, notifyErr);
        }
    }
}

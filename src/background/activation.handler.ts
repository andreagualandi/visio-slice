// activation.handler.ts

import { sendMessageToTab } from './tabs.facade';
import { executeScript } from './scripting.facade';
import { MSG_TYPE_ACTIVATE_CAPTURE, CONTENT_SCRIPT_READY } from '../shared/constants';
//necessario import con ?script per plugin crxjs/vite-plugin
import contentScriptPath from '../content/content.ts?script';

const log = (...args: unknown[]): void => console.log('[ActivationHandler]', ...args);

/**
 * Tenta di attivare il content script inviando un messaggio. Se fallisce,
 * inietta lo script, attende la conferma 'CONTENT_SCRIPT_READY', e poi
 * invia il messaggio di attivazione.
 * @param targetTabId L'ID della scheda target.
 * @throws Lancia un errore se l'iniezione o l'attivazione finale falliscono gravemente.
 */
export async function activateOrInjectContentScript(targetTabId: number): Promise<void> {
    try {
        // 1. Tenta di inviare il messaggio di attivazione iniziale
        log(`Invio tentativo 1: ACTIVATE_CAPTURE a tab ${targetTabId}`);
        // Usa la facade per inviare il messaggio
        await sendMessageToTab(targetTabId, { type: MSG_TYPE_ACTIVATE_CAPTURE });
        log(`Messaggio ACTIVATE_CAPTURE inviato (tentativo 1) con successo a tab ${targetTabId}.`);
        // Se questo ha successo, il content script era già lì e attivo (o si è attivato), abbiamo finito.
    } catch (error: unknown) {
        // 2. Se l'invio iniziale fallisce (probabilmente script non presente/attivo), procedi con l'iniezione
        log(
            `Invio messaggio (tentativo 1) a tab ${targetTabId} fallito (${error instanceof Error ? error.message : String(error)}). Inietto script...`
        );
        try {
            // 3. Inietta lo script usando la facade
            // Assicurati che contentScriptPath sia valido
            if (!contentScriptPath) {
                throw new Error('Percorso content script non valido.');
            }
            await executeScript({ tabId: targetTabId }, [contentScriptPath]);
            log(`Script '${contentScriptPath}' iniettato con successo in tab ${targetTabId}.`);

            // 4. Attendi il segnale "READY" dal content script appena iniettato (Handshake)
            log(`In attesa del messaggio CONTENT_SCRIPT_READY da tab ${targetTabId}...`);
            try {
                // Crea una Promise per attendere il messaggio specifico
                const readyConfirmationPromise = new Promise<void>((resolve, reject) => {
                    // Listener temporaneo specifico per il messaggio READY da questa tab
                    const listener = (msg: unknown, sndr: chrome.runtime.MessageSender) => {
                        if (
                            typeof msg === 'object' &&
                            msg !== null &&
                            'type' in msg &&
                            msg.type === CONTENT_SCRIPT_READY &&
                            sndr.tab?.id === targetTabId
                        ) {
                            log(`Ricevuto CONTENT_SCRIPT_READY da tab ${targetTabId}.`);
                            chrome.runtime.onMessage.removeListener(listener);
                            clearTimeout(timeoutId);
                            resolve();
                            return false;
                        }
                        return false;
                    };
                    const waitTimeout = 5000; // 5 secondi
                    const timeoutId = setTimeout(() => {
                        log(`Timeout (${waitTimeout}ms) attesa CONTENT_SCRIPT_READY da tab ${targetTabId}.`);
                        chrome.runtime.onMessage.removeListener(listener);
                        reject(new Error('Timeout waiting for content script ready signal.'));
                    }, waitTimeout);
                    chrome.runtime.onMessage.addListener(listener);
                });

                await readyConfirmationPromise;

                // 5. DOPO aver ricevuto la conferma, invia il messaggio di attivazione finale usando la facade
                log(`Invio ACTIVATE_CAPTURE (post-conferma) a tab ${targetTabId}`);
                await sendMessageToTab(targetTabId, { type: MSG_TYPE_ACTIVATE_CAPTURE });
                log(`Messaggio ACTIVATE_CAPTURE inviato (post-conferma) con successo a tab ${targetTabId}.`);
            } catch (waitError: unknown) {
                console.error(`Errore durante attesa/attivazione post-iniezione in tab ${targetTabId}:`, waitError);
                throw waitError;
            }
        } catch (injectionError: unknown) {
            console.error(`Errore durante INIEZIONE script in tab ${targetTabId}:`, injectionError);
            throw injectionError;
        }
    }
}

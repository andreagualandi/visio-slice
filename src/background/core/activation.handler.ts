// src/background/core/activation.handler.ts

import { sendMessageToTab } from '../../facades/tabs.facade';
import { executeScript } from '../../facades/scripting.facade';
import { MSG_TYPE_ACTIVATE_CAPTURE, CONTENT_SCRIPT_READY } from '../../shared/constants';
import contentScriptPath from '../../content/content.ts?script';

const log = (...args: unknown[]): void => console.log('[ActivationHandler]', ...args);

function isContentScriptReadyMessage(msg: unknown, tabId: number, sender: chrome.runtime.MessageSender): boolean {
    return (
        typeof msg === 'object' &&
        msg !== null &&
        'type' in msg &&
        (msg as { type: string }).type === CONTENT_SCRIPT_READY &&
        sender.tab?.id === tabId
    );
}

async function waitForContentScriptReady(tabId: number, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        const listener = (msg: unknown, sender: chrome.runtime.MessageSender): boolean => {
            if (isContentScriptReadyMessage(msg, tabId, sender)) {
                log(`CONTENT_SCRIPT_READY ricevuto da tab ${tabId}.`);
                cleanup();
                resolve();
                return false;
            }
            return false;
        };

        const timeoutId = setTimeout(() => {
            cleanup();
            log(`Timeout (${timeoutMs}ms) in attesa di CONTENT_SCRIPT_READY da tab ${tabId}.`);
            reject(new Error('Timeout waiting for content script ready.'));
        }, timeoutMs);

        const cleanup = () => {
            chrome.runtime.onMessage.removeListener(listener);
            clearTimeout(timeoutId);
        };

        chrome.runtime.onMessage.addListener(listener);
    });
}

export async function activateOrInjectContentScript(tabId: number): Promise<void> {
    try {
        log(`Invio ACTIVATE_CAPTURE (tentativo 1) a tab ${tabId}`);
        await sendMessageToTab(tabId, { type: MSG_TYPE_ACTIVATE_CAPTURE });
        log(`Messaggio ACTIVATE_CAPTURE inviato con successo a tab ${tabId}.`);
        return;
    } catch (error) {
        log(
            `ACTIVATE_CAPTURE fallito: ${error instanceof Error ? error.message : String(error)}. Procedo con iniezione...`
        );
    }

    try {
        if (!contentScriptPath) {
            throw new Error('Percorso content script non valido.');
        }

        log(`Inietto script '${contentScriptPath}' in tab ${tabId}...`);
        await executeScript({ tabId }, [contentScriptPath]);
        log(`Script iniettato con successo in tab ${tabId}.`);

        log(`In attesa di CONTENT_SCRIPT_READY da tab ${tabId}...`);
        await waitForContentScriptReady(tabId);

        log(`Invio ACTIVATE_CAPTURE (post-iniezione) a tab ${tabId}`);
        await sendMessageToTab(tabId, { type: MSG_TYPE_ACTIVATE_CAPTURE });
        log(`Messaggio ACTIVATE_CAPTURE (post-iniezione) inviato con successo a tab ${tabId}.`);
    } catch (err) {
        console.error(`Errore durante iniezione/attesa/attivazione per tab ${tabId}:`, err);
        throw err;
    }
}

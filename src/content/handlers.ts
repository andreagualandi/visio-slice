// handlers.ts
import { appState, Rect } from './state';
import { showToast, createUI, updateSelectionUI } from './ui'; // Importa funzioni UI
import { initializeDrawingHandlers } from './drawing'; // Importa inizializzatore disegno
import { initializeInteractionHandlers } from './interaction'; // Importa inizializzatore interazione
// Importa costanti necessarie
import {
    MSG_TYPE_ACTIVATE_CAPTURE,
    MSG_TYPE_SAVE_SUCCESS,
    MSG_TYPE_SAVE_ERROR,
    MSG_TYPE_SELECTION_COMPLETE,
} from '../shared/constants';

import { SelectionPayload } from '../shared/types';

// Riferimenti alle funzioni di cleanup dei moduli
let cleanupDrawing: (() => void) | null = null;
let cleanupInteraction: (() => void) | null = null;

const log = (...args: unknown[]): void => console.log('[WebAreaSaver Handlers]', ...args);

// --- Funzioni Handler Esportate e Interne ---

// Funzione di Cleanup/Deactivate (esportata)
export function deactivateCaptureUI(): void {
    log('Deattivazione UI cattura...');
    // Chiama le cleanup specifiche, se esistono
    if (cleanupDrawing) {
        cleanupDrawing();
        cleanupDrawing = null;
    }
    if (cleanupInteraction) {
        cleanupInteraction();
        cleanupInteraction = null;
    }
    // Rimuove listener globali gestiti qui
    window.removeEventListener('keydown', onKeyDown);

    // Rimuove elementi DOM e resetta stato
    if (appState.elements.overlay) {
        // Verifica esistenza prima di accedere a style
        document.body.style.cursor = appState.originalCursor;
    }
    Object.values(appState.elements).forEach((el) => {
        if (Array.isArray(el)) {
            el.forEach((e) => e?.remove());
        } else if (el instanceof HTMLElement) {
            el.remove();
        }
    });
    appState.isActive = false;
    appState.isDrawing = false;
    appState.currentState = 'idle';
    appState.currentRect = null;
    appState.interaction = { type: null, handle: null, startX: 0, startY: 0, initialRect: null };
    appState.elements = {
        overlay: null,
        blocker: null,
        cancel: null,
        style: null,
        border: null,
        saveBtn: null,
        handles: [],
    };
    log('Deattivazione UI completata.');
}

// Gestione Tastiera (esportata per essere aggiunta come listener)
export const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
        deactivateCaptureUI(); // Chiama la funzione di cleanup locale
    } else if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        appState.currentState === 'selected'
    ) {
        e.preventDefault();
        const delta: number = e.shiftKey ? 10 : 1;
        const rect: Rect | null = appState.currentRect;
        if (!rect) return;
        const newRect: Rect = { ...rect };
        if (e.key === 'ArrowUp') newRect.top -= delta;
        if (e.key === 'ArrowDown') newRect.top += delta;
        if (e.key === 'ArrowLeft') newRect.left -= delta;
        if (e.key === 'ArrowRight') newRect.left += delta;
        appState.currentRect = newRect;
        updateSelectionUI();
    }
};

// Gestione Click su Salva (esportata per essere usata da ui.ts)
export const handleSaveClick = (): void => {
    const rect: Rect | null = appState.currentRect;
    if (!rect || appState.currentState !== 'selected') return;
    log('Click su Salva.');
    // Nascondi UI
    appState.elements.handles.forEach((h) => {
        if (h) h.style.display = 'none';
    });
    if (appState.elements.saveBtn) appState.elements.saveBtn.style.display = 'none';
    if (appState.elements.border) appState.elements.border.style.display = 'none';

    const dataToSend: SelectionPayload = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        dpr: window.devicePixelRatio || 1,
    };
    const delayMs: number = 100;
    setTimeout(() => {
        log('Invio dati al background:', dataToSend);
        try {
            chrome.runtime
                .sendMessage({ type: MSG_TYPE_SELECTION_COMPLETE, data: dataToSend })
                .then((response) => log('Messaggio SELECTION_COMPLETE inviato.', response))
                .catch((err) => log('Errore invio SELECTION_COMPLETE:', err.message));
        } catch (error: unknown) {
            log('Eccezione durante sendMessage:', error);
            showToast(`Errore estensione: ${error instanceof Error ? error.message : String(error)}`, true);
        } finally {
            deactivateCaptureUI(); // Chiama cleanup locale
        }
    }, delayMs);
};

// --- Funzioni di supporto per l'inizializzazione ---

// Callback chiamato da drawing.ts quando la selezione è valida
const handleValidSelection = (rect: Rect) => {
    log('Selezione valida ricevuta:', rect);
    appState.currentState = 'selected';
    // Aggiorna UI finale (bordi, bottoni, handle) passando l'handler per il salvataggio
    updateSelectionUI();
    // Inizializza gli handler per l'interazione (move/resize) e salva la cleanup
    cleanupInteraction = initializeInteractionHandlers(appState);
    log('Handler interazione inizializzati.');
};

// Callback chiamato da drawing.ts quando la selezione non è valida
const handleInvalidSelection = () => {
    log('Selezione invalida ricevuta.');
    deactivateCaptureUI(); // Pulisce tutto
};

// Funzione di Inizializzazione UI/Logica (NON esportata, chiamata da handleBackgroundMessages)
function initializeCaptureUI(): void {
    if (appState.isActive) {
        log('Tentativo di inizializzare UI mentre è già attiva. Ignorato.');
        return;
    }
    log('Inizializzazione interfaccia di cattura...');
    // Reset stato completo
    appState.isActive = true;
    appState.isDrawing = false;
    appState.currentState = 'idle';
    appState.currentRect = null;
    appState.interaction = { type: null, handle: null, startX: 0, startY: 0, initialRect: null };
    appState.originalCursor = document.body.style.cursor || 'default';
    appState.elements = {
        overlay: null,
        blocker: null,
        cancel: null,
        style: null,
        border: null,
        saveBtn: null,
        handles: [],
    };

    // Crea UI passando l'handler per l'annullamento (locale)
    createUI(deactivateCaptureUI);

    // Inizializza gli handler di disegno e salva la funzione di cleanup
    cleanupDrawing = initializeDrawingHandlers(appState, {
        // Passa i callback locali
        onValidSelection: handleValidSelection,
        onInvalidSelection: handleInvalidSelection,
    });

    // Aggiungi listener tastiera (usa onKeyDown locale)
    window.addEventListener('keydown', onKeyDown);
    log('Interfaccia di cattura inizializzata e handler disegno attivi.');
}

// Gestore Messaggi Background (esportato per essere usato da content.ts)
export const handleBackgroundMessages = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response?: unknown) => void
): boolean | undefined => {
    if (typeof message !== 'object' || message === null || !('type' in message) || typeof message.type !== 'string') {
        log('WARN: Ricevuto messaggio background non valido:', message);
        return false;
    }
    log('Messaggio ricevuto:', message.type);

    switch (message.type) {
        case MSG_TYPE_ACTIVATE_CAPTURE:
            initializeCaptureUI(); // Chiama init locale
            break;
        case MSG_TYPE_SAVE_SUCCESS: // Usa costanti importate
        case MSG_TYPE_SAVE_ERROR:
            const msgContent =
                'message' in message && typeof message.message === 'string' ? message.message : undefined;
            const isError = message.type === MSG_TYPE_SAVE_ERROR;
            showToast(msgContent || (isError ? 'Errore' : 'Successo'), isError);
            // deactivateCaptureUI viene già chiamato da handleSaveClick nel blocco finally
            break;
        default:
            log('WARN: Tipo messaggio non gestito:', message.type);
    }
    return false; // Indica che non invieremo risposte asincrone qui
};

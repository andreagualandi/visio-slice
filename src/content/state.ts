// state.ts

// --- Definizione Tipi e Interfacce Esportate ---

// Estende l'interfaccia Window per aggiungere le nostre proprietà globali
// Nota: 'declare global' non può essere esportato direttamente, rimane implicito
//       quando questo modulo viene importato e usato nel contesto giusto (content script).
declare global {
    interface Window {
        webAreaSaverListenerAttached?: boolean;
    }
}

// Interfaccia per le coordinate e dimensioni di un rettangolo
export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

// Interfaccia per lo stato dell'interazione (drag, resize)
export interface InteractionState {
    type: 'move' | 'resize' | null;
    handle: string | null; // es. 'top-left', 'bottom-right'
    startX: number;
    startY: number;
    initialRect: Rect | null;
}

// Interfaccia per gli elementi DOM gestiti dall'applicazione
export interface AppElements {
    overlay: HTMLDivElement | null;
    blocker: HTMLDivElement | null;
    cancel: HTMLButtonElement | null;
    style: HTMLStyleElement | null;
    border: HTMLDivElement | null;
    saveBtn: HTMLButtonElement | null;
    handles: HTMLDivElement[]; // Array di handle (div)
}

// Interfaccia per lo stato globale dell'applicazione content script
export interface AppState {
    isActive: boolean;
    isDrawing: boolean;
    currentState: 'idle' | 'drawing' | 'selected'; // Stati principali
    currentRect: Rect | null;
    interaction: InteractionState;
    originalCursor: string;
    elements: AppElements;
}

// --- Stato Applicazione Tipizzato Esportato ---
export const appState: AppState = {
    isActive: false,
    isDrawing: false,
    currentState: 'idle',
    currentRect: null,
    interaction: {
        type: null,
        handle: null,
        startX: 0,
        startY: 0,
        initialRect: null,
    },
    originalCursor: typeof document !== 'undefined' ? document.body?.style.cursor || 'default' : 'default', // Gestisce SSR/build
    elements: {
        overlay: null,
        blocker: null,
        cancel: null,
        style: null,
        border: null,
        saveBtn: null,
        handles: [],
    },
};

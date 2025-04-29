// src/shared/types.ts

// --- Tipi per Messaggistica ---

// Struttura base per messaggi scambiati tra parti dell'estensione
export interface ExtensionMessage {
    type: string;
    payload?: unknown; // Tipo specifico se possibile, altrimenti il ricevente valida
    message?: string; // Per messaggi semplici (es. successo/errore)
}

// Payload specifico per il messaggio SELECTION_COMPLETE
// (Potrebbe estendere un tipo base se utile)
export interface SelectionPayload {
    top: number;
    left: number;
    width: number;
    height: number;
    dpr: number;
}

// --- Tipi per Storage ---

// Struttura dei dati salvati per una cattura
export interface SavedCaptureData {
    full: string; // Data URL immagine ritagliata
    thumb: string; // Data URL miniatura
}

// --- Altri Tipi Condivisi (Esempio) ---

// Potresti aggiungere qui anche Rect, InteractionState, AppState, AppElements
// se fossero usate anche al di fuori del solo content script (improbabile per AppState/AppElements,
// ma Rect potrebbe servire). Valuta caso per caso.
// export interface Rect { top: number; left: number; width: number; height: number; }

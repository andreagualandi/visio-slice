// src/shared/constants.ts

// Tipi di Messaggio tra Background e Content Script
export const MSG_TYPE_SELECTION_COMPLETE: string = 'SELECTION_COMPLETE'; // [cite: 14]
export const MSG_TYPE_SAVE_SUCCESS: string = 'SAVE_SUCCESS'; // [cite: 14]
export const MSG_TYPE_SAVE_ERROR: string = 'SAVE_ERROR'; // [cite: 15]
export const MSG_TYPE_CAPTURE_ERROR: string = 'CAPTURE_ERROR'; // [cite: 15]

// Chiavi per Chrome Storage
export const STORAGE_KEY_PREFIX_CAPTURE: string = 'capture_'; // [cite: 15]
export const STORAGE_KEY_LAYOUT_PREFERENCE: string = 'layoutMinPercentPreference'; // [cite: 16]

// (Opzionale) Puoi aggiungere qui anche altre costanti in futuro,
// come ID DOM o classi CSS se usate frequentemente in TS/JS.

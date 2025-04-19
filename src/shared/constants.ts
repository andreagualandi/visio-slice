// src/shared/constants.ts

// Tipi di Messaggio tra Background e Content Script
export const MSG_TYPE_SELECTION_COMPLETE: string = 'SELECTION_COMPLETE';
export const MSG_TYPE_SAVE_SUCCESS: string = 'SAVE_SUCCESS';
export const MSG_TYPE_SAVE_ERROR: string = 'SAVE_ERROR';
export const MSG_TYPE_CAPTURE_ERROR: string = 'CAPTURE_ERROR';
export const MSG_TYPE_ACTIVATE_CAPTURE = 'ACTIVATE_CAPTURE';
export const CONTENT_SCRIPT_READY: string = 'CONTENT_SCRIPT_READY';

// Chiavi per Chrome Storage
export const STORAGE_KEY_PREFIX_CAPTURE: string = 'capture_';
export const STORAGE_KEY_LAYOUT_PREFERENCE: string = 'layoutMinPercentPreference';

// (Opzionale) Puoi aggiungere qui anche altre costanti in futuro,
// come ID DOM o classi CSS se usate frequentemente in TS/JS.

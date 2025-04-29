// errorUtils.ts

/**
 * Controlla se un errore catturato è un errore di quota di chrome.storage.
 * @param error L'oggetto errore (o qualsiasi valore) da controllare.
 * @returns True se l'errore sembra essere un errore di quota, altrimenti false.
 */
export function isQuotaError(error: unknown): boolean {
    // Controlla se è un oggetto simile a Error con una proprietà 'message' di tipo stringa
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        // Controlla se il messaggio include le stringhe indicative dell'errore di quota
        return error.message.includes('QUOTA_BYTES') || error.message.toLowerCase().includes('quota');
    }
    // Se non corrisponde al pattern atteso, non è un errore di quota riconoscibile
    return false;
}

/**
 * Estrae un messaggio di errore user-friendly da un errore catturato.
 * Utilizza isQuotaError per fornire un messaggio specifico per errori di quota.
 * @param error L'oggetto errore catturato (di tipo unknown).
 * @returns Il messaggio di errore leggibile da mostrare all'utente.
 */
export function extractUserErrorMessage(error: unknown): string {
    // Controlla prima specificamente l'errore di quota usando la funzione locale
    if (isQuotaError(error)) {
        console.warn('ErrorUtils: Errore QUOTA rilevato.');
        return 'Errore: Spazio di archiviazione locale pieno.';
    }

    // Se è un'istanza standard di Error, usa il suo messaggio
    if (error instanceof Error) {
        // Potresti voler troncare messaggi molto lunghi qui se necessario
        return `Errore durante l'elaborazione: ${error.message}`;
    }

    // Fallback generico per altri tipi di errori o valori
    // Converte l'errore in stringa, gestendo il caso null/undefined
    const errorString = String(error ?? 'Errore sconosciuto');
    return `Errore durante l'elaborazione: ${errorString}`;
}

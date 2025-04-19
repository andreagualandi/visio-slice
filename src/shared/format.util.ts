// src/shared/format.util.ts

/**
 * Formatta un timestamp (da una chiave tipo 'capture_1678886400000') in una stringa leggibile.
 * @param {string} key La chiave contenente il timestamp.
 * @returns {string} La data e ora formattate (es. "18 apr 2025, 18:25") o la chiave originale in caso di errore.
 */
export function formatTimestamp(key: string): string {
    try {
        // Estrae la parte numerica dopo 'capture_'
        const tsString: string = key.substring(key.indexOf('_') + 1);
        const ts: number = parseInt(tsString, 10);

        if (isNaN(ts) || ts === 0) {
            console.warn(`Timestamp non valido estratto da key: ${key}`);
            return key; // Ritorna la chiave originale se non è un numero valido
        }

        const dt: Date = new Date(ts);

        // Verifica che la data sia valida (parseInt può dare risultati strani)
        if (isNaN(dt.getTime())) {
            console.warn(`Data non valida creata da timestamp ${ts} (key: ${key})`);
            return key;
        }

        // Specifica il tipo per l'oggetto delle opzioni
        const opts: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // Usa formato 24h per coerenza
        };

        return new Intl.DateTimeFormat('it-IT', opts).format(dt);
    } catch (e) {
        console.error(`Errore formattazione timestamp per key ${key}:`, e);
        return key; // Fallback alla chiave originale
    }
}

/**
 * Formatta un numero di byte in una stringa leggibile (KB, MB, etc.).
 * @param {number} bytes Il numero di byte da formattare.
 * @param {number} [decimals=2] Il numero di decimali da visualizzare.
 * @returns {string} La stringa formattata.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k: number = 1024;
    const dm: number = decimals < 0 ? 0 : decimals;
    // Specifica che 'sizes' è un array di stringhe
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    // Gestisce il caso in cui i byte siano negativi o non numerici
    if (bytes < 0 || isNaN(bytes)) return 'N/A';

    const i: number = Math.floor(Math.log(bytes) / Math.log(k));

    // Assicura che l'indice sia valido per l'array sizes
    const index: number = Math.max(0, Math.min(i, sizes.length - 1));

    // parseFloat accetta una stringa, .toFixed() restituisce una stringa
    return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + ' ' + sizes[index];
}

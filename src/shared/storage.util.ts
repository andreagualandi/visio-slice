// src/shared/storage.util.ts

/**
 * Recupera uno o più elementi da chrome.storage.local.
 * @param keys Una chiave singola, un array di chiavi, un oggetto, o null per ottenere tutto.
 * @returns Una Promise che risolve con un oggetto contenente gli elementi richiesti.
 */
export const storageGet = (keys: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }> =>
    new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (items: { [key: string]: any }) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(items);
        });
    });

/**
 * Salva uno o più elementi in chrome.storage.local.
 * @param items Un oggetto con una o più coppie chiave/valore da salvare.
 * @returns Una Promise che risolve quando l'operazione è completa.
 */
export const storageSet = (items: { [key: string]: any }): Promise<void> =>
    new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });

/**
 * Rimuove uno o più elementi da chrome.storage.local.
 * @param keys Una chiave singola o un array di chiavi da rimuovere.
 * @returns Una Promise che risolve quando l'operazione è completa.
 */
export const storageRemove = (keys: string | string[]): Promise<void> =>
    new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });

/**
 * Controlla se un errore è un errore di quota di chrome.storage.
 * @param error L'oggetto errore da controllare.
 * @returns True se l'errore sembra essere un errore di quota, altrimenti false.
 */
export function isQuotaError(error: any): boolean {
    // Controlla se error esiste e ha una proprietà message di tipo stringa
    return error && typeof error.message === 'string' &&
        (error.message.includes('QUOTA_BYTES') || error.message.toLowerCase().includes('quota'));
}
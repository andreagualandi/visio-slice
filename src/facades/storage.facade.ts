// facades/storage.facade.ts

/**
 * Recupera uno o più elementi da chrome.storage.local.
 * @param keys Una chiave singola, un array di chiavi, un oggetto (con valori qualsiasi), o null per ottenere tutto.
 * @returns Una Promise che risolve con un oggetto contenente gli elementi richiesti.
 */
export const storageGet = (
    keys: string | string[] | Record<string, unknown> | null
): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (items: Record<string, unknown>) => {
            // chrome.runtime.lastError è già tipizzato come LastError | undefined
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
export const storageSet = (items: Record<string, unknown>): Promise<void> =>
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
 * Ottiene lo spazio totale in byte utilizzato dall'estensione nello storage locale.
 * @returns Una Promise che risolve con il numero di byte utilizzati.
 * @rejects Se l'API non è disponibile o se si verifica un errore durante la chiamata.
 */
export const getStorageBytesInUse = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        // Verifica disponibilità API
        if (!chrome.storage || !chrome.storage.local || !chrome.storage.local.getBytesInUse) {
            const errorMsg = 'API chrome.storage.local.getBytesInUse non disponibile.';
            console.warn(errorMsg);
            return reject(new Error(errorMsg));
        }

        try {
            // Chiama l'API Chrome. Il primo argomento null significa "tutto lo storage"
            chrome.storage.local.getBytesInUse(null, (bytes) => {
                // Controlla l'errore specifico di Chrome nel callback
                if (chrome.runtime.lastError) {
                    console.error('Storage getBytesInUse error in facade:', chrome.runtime.lastError);
                    // Rigetta la promise con l'errore di Chrome
                    return reject(chrome.runtime.lastError);
                }
                // Successo: risolvi la promise con il numero di bytes
                resolve(bytes);
            });
        } catch (e) {
            // Cattura errori sincroni (meno probabili ma possibile)
            console.error('Error calling getBytesInUse in facade:', e);
            return reject(e);
        }
    });
};

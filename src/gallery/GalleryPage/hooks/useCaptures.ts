// src/gallery/GalleryPage/hooks/useCaptures.ts
import { useState, useEffect, useCallback } from 'react';
import { storageGet } from '../../../facades/storage.facade';
import { STORAGE_KEY_PREFIX_CAPTURE } from '../../../shared/constants';

// Definisci o importa queste interfacce
interface StoredItemData {
    thumb: string;
    full: string;
}
export interface CaptureItem {
    key: string;
    data: StoredItemData;
}

export function useCaptures() {
    const [captures, setCaptures] = useState<CaptureItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Logica di caricamento in una funzione useCallback per poterla riutilizzare
    const loadCaptures = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true); // Mostra loading solo la prima volta? O sempre?
        // Non resettare l'errore qui se vuoi mantenere errori precedenti visibili durante reload
        // setError(null);
        try {
            const items: Record<string, unknown> = await storageGet(null);
            const captureKeys = Object.keys(items).filter((key) => key.startsWith(STORAGE_KEY_PREFIX_CAPTURE));
            captureKeys.sort((a, b) => {
                /* ... sort ... */
                const timestampA = parseInt(a.substring(STORAGE_KEY_PREFIX_CAPTURE.length), 10) || 0;
                const timestampB = parseInt(b.substring(STORAGE_KEY_PREFIX_CAPTURE.length), 10) || 0;
                return timestampB - timestampA;
            });
            const formattedCaptures: CaptureItem[] = captureKeys
                .map((key) => {
                    /* ... map e validazione ... */
                    const itemData = items[key];
                    if (
                        typeof itemData === 'object' &&
                        itemData !== null &&
                        'thumb' in itemData &&
                        typeof itemData.thumb === 'string' &&
                        'full' in itemData &&
                        typeof itemData.full === 'string'
                    ) {
                        return { key, data: itemData as StoredItemData };
                    } else {
                        return null;
                    }
                })
                .filter((item): item is CaptureItem => item !== null);

            setCaptures(formattedCaptures);
            setError(null); // Resetta errore solo se il caricamento ha successo
        } catch (err) {
            console.error('Errore caricamento catture in useCaptures:', err);
            // Non sovrascrivere catture esistenti se il reload fallisce?
            // setCaptures([]); // O forse sì? Da decidere.
            setError("Errore durante l'aggiornamento delle catture.");
        } finally {
            setIsLoading(false); // Togli loading in ogni caso
        }
    }, []); // Dipendenza vuota perché non dipende da props/state esterni all'hook

    useEffect(() => {
        loadCaptures(); // Caricamento iniziale

        // --- Listener per Storage Changes ---
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local') {
                const relevantChange = Object.keys(changes).some((key) => key.startsWith(STORAGE_KEY_PREFIX_CAPTURE));

                if (relevantChange) {
                    console.log('Storage locale cambiato (catture), ricarico la lista...');
                    loadCaptures(false); // Ricarica senza mostrare l'indicatore di loading principale
                }
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        // --- Fine Listener ---

        // Funzione di cleanup per rimuovere il listener
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, [loadCaptures]); // Aggiungi loadCaptures alle dipendenze

    // Esponi setCaptures solo se serve ancora (es. per l'eliminazione in GalleryPage)
    return { captures, isLoading, error, setCaptures };
}

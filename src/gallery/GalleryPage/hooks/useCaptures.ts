// src/gallery/GalleryPage/hooks/useCaptures.ts
import { useState, useEffect } from 'react';
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

    useEffect(() => {
        let isMounted = true; // Flag per cleanup
        const loadCaptures = async () => {
            // Resetta stati all'inizio del caricamento
            setIsLoading(true);
            setError(null);
            try {
                const items: Record<string, unknown> = await storageGet(null);
                const captureKeys = Object.keys(items).filter((key) => key.startsWith(STORAGE_KEY_PREFIX_CAPTURE));
                // sort decrescente
                captureKeys.sort((a, b) => {
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

                if (isMounted) {
                    setCaptures(formattedCaptures);
                }
            } catch (err) {
                console.error('Errore caricamento catture in useCaptures:', err);
                if (isMounted) {
                    setError('Errore durante il caricamento delle catture.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadCaptures();

        return () => {
            // Cleanup function
            isMounted = false;
        };
    }, []); // Eseguito solo al mount

    // Ritorna stati e, se necessario, la funzione per ricaricare
    return { captures, isLoading, error, setCaptures }; // Esporta setCaptures se serve per eliminazione
}

// src/gallery/GalleryPage/hooks/useStorageUsage.ts
import { useState, useCallback } from 'react';
import { getStorageBytesInUse } from '../../../facades/storage.facade';

export interface StorageUsageState {
    bytes: number | null;
    loading: boolean;
    error: string | null;
}

export function useStorageUsage() {
    const [storageUsage, setStorageUsage] = useState<StorageUsageState>({
        bytes: null,
        loading: false,
        error: null,
    });

    const fetchStorageUsage = useCallback(async () => {
        // useCallback per stabilità
        setStorageUsage((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const bytes = await getStorageBytesInUse();
            setStorageUsage({ bytes: bytes, loading: false, error: null });
        } catch (err) {
            console.error('Errore fetchStorageUsage da facade (hook):', err);
            const errorMessage = err instanceof Error ? err.message : 'Errore calcolo spazio';
            setStorageUsage({ bytes: null, loading: false, error: errorMessage });
        }
    }, []); // Dipendenza vuota, la funzione non cambia

    return { storageUsage, fetchStorageUsage };
}

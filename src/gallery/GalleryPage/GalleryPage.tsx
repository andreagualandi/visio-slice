// App/src/gallery/GalleryPage/GalleryPage.tsx
import React, { useState, useEffect } from 'react';
import { storageGet, storageRemove, getStorageBytesInUse } from '../../facades/storage.facade.ts';
import { STORAGE_KEY_PREFIX_CAPTURE } from '../../shared/constants.ts';
import Sidebar from '../Sidebar/Sidebar.tsx';
import Workspace from '../Workspace/Workspace.tsx';
import DeleteConfirmationModal from '../DeleteConfirmationModal/DeleteConfirmationModal.tsx';

// Interfaccia per i dati di una cattura salvata
interface StoredItemData {
    thumb: string; // Data URL miniatura
    full: string; // Data URL immagine completa
}

// Interfaccia per un elemento cattura nello stato del componente
export interface CaptureItem {
    key: string; // Chiave originale dello storage (es. capture_167888...)
    data: StoredItemData;
}

// Interfaccia per lo stato dello storage
interface StorageUsageState {
    bytes: number | null;
    loading: boolean;
    error: string | null;
}

// Componente principale della pagina galleria
const GalleryPage: React.FC = () => {
    // Stati del componente
    const [captures, setCaptures] = useState<CaptureItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [columnPercent, setColumnPercent] = useState<number>(33);
    const [storageUsage, setStorageUsage] = useState<StorageUsageState>({
        bytes: null,
        loading: true,
        error: null,
    });

    // Effetto per caricare le catture al mount del componente
    useEffect(() => {
        const loadCaptures = async () => {
            setIsLoading(true);
            setStorageUsage((prev) => ({ ...prev, loading: true, error: null }));
            setError(null);
            let capturesLoadedSuccessfully = false;
            try {
                // 1. Recupera tutti gli items dallo storage
                const items: Record<string, unknown> = await storageGet(null);
                // 2. Filtra le chiavi rilevanti
                const captureKeys = Object.keys(items).filter((key) => key.startsWith(STORAGE_KEY_PREFIX_CAPTURE));
                // 3. Ordina le chiavi per timestamp (dal più recente al meno recente)
                captureKeys.sort((a, b) => {
                    const timestampA = parseInt(a.substring(STORAGE_KEY_PREFIX_CAPTURE.length), 10) || 0;
                    const timestampB = parseInt(b.substring(STORAGE_KEY_PREFIX_CAPTURE.length), 10) || 0;
                    return timestampB - timestampA; // Ordine decrescente
                });
                // 4. Formatta i dati e valida la struttura
                const formattedCaptures: CaptureItem[] = captureKeys
                    .map((key) => {
                        const itemData = items[key];
                        // Validazione semplice (può essere resa più robusta)
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
                            console.warn(`Dati non validi per la chiave ${key}:`, itemData);
                            return null; // Segna come nullo per filtrarlo dopo
                        }
                    })
                    .filter((item): item is CaptureItem => item !== null); // Filtra eventuali elementi nulli

                // 5. Aggiorna lo stato
                setCaptures(formattedCaptures);
                capturesLoadedSuccessfully = true;
            } catch (err) {
                console.error('Errore durante il caricamento delle catture:', err);
                setError('Errore durante il caricamento delle catture.');
                setStorageUsage({ bytes: null, loading: false, error: 'Dipende da errore catture' });
            } finally {
                setIsLoading(false);
                if (capturesLoadedSuccessfully) {
                    fetchStorageUsage();
                }
            }
        };
        loadCaptures();
        // L'array vuoto di dipendenze assicura che l'effetto venga eseguito solo una volta al mount
    }, []);

    // --- FETCH STORAGE USAGE ---
    const fetchStorageUsage = async () => {
        // Rendi la funzione async
        setStorageUsage((prev) => ({ ...prev, loading: true, error: null }));

        try {
            const bytes = await getStorageBytesInUse();
            setStorageUsage({ bytes: bytes, loading: false, error: null });
        } catch (err) {
            console.error('Errore fetchStorageUsage da facade:', err);
            // Prova a estrarre un messaggio d'errore più utile
            let errorMessage = 'Errore calcolo spazio';
            if (err instanceof Error) {
                errorMessage = err.message; // Usa il messaggio dell'oggetto Error
            } else if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
                errorMessage = err.message; // Gestisce l'errore di chrome.runtime.lastError
            }
            setStorageUsage({ bytes: null, loading: false, error: errorMessage });
        }
        // Nota: il loading: false è gestito implicitamente nei setStorageUsage dentro try/catch
    };

    // Handler per toggle selezione (usato sia da SidebarItem che da WorkspaceImage)
    const handleToggleSelection = (key: string) => {
        setSelectedIds((prevSelectedIds) => {
            const newSelectedIds = new Set(prevSelectedIds); // Crea una copia
            if (newSelectedIds.has(key)) {
                newSelectedIds.delete(key); // Deseleziona
            } else {
                newSelectedIds.add(key); // Seleziona
            }
            console.log('Selected IDs:', newSelectedIds); // Log per debug
            return newSelectedIds; // Ritorna il nuovo Set
        });
    };

    // --- CALCOLA CAPTURES SELEZIONATE ---
    const selectedCaptures = captures.filter((capture) => selectedIds.has(capture.key));

    // --- FUNZIONI PER GESTIRE LA MODALE ---
    const openDeleteModal = (key: string) => {
        console.log('[GalleryPage] openDeleteModal chiamata per key:', key);
        setItemToDeleteId(key);
        setIsModalOpen(true);
    };

    const closeDeleteModal = () => {
        setItemToDeleteId(null);
        setIsModalOpen(false);
    };

    // --- HANDLER PER SLIDER CHANGE ---
    const handleSliderChange = (newValue: number) => {
        setColumnPercent(newValue);
        // TODO: Potresti voler persistere questo valore in futuro (es. con storageSet)
    };

    const handleConfirmDelete = async () => {
        if (!itemToDeleteId) return;
        const keyToDelete = itemToDeleteId;
        closeDeleteModal();
        setError(null);
        try {
            await storageRemove(keyToDelete);
            setCaptures((prev) => prev.filter((c) => c.key !== keyToDelete));
            setSelectedIds((prev) => {
                if (!prev.has(keyToDelete)) return prev;
                const next = new Set(prev);
                next.delete(keyToDelete);
                return next;
            });
            console.log('Cattura eliminata con successo:', keyToDelete);
            fetchStorageUsage();
        } catch (err) {
            console.error(`Errore durante l'eliminazione ${keyToDelete}:`, err);
            setError(`Errore eliminazione: ${err instanceof Error ? err.message : '?'}`);
        }
    };
    // --- FINE FUNZIONI MODALE ---

    console.log('[GalleryPage] Stato isModalOpen prima del render:', isModalOpen);

    return (
        <>
            {' '}
            {/* Usa un Fragment per includere la modale fuori dal layout flex */}
            <div className="flex h-screen bg-gray-50">
                {/* Sidebar */}
                <Sidebar
                    captures={captures}
                    isLoading={isLoading}
                    error={error}
                    selectedIds={selectedIds}
                    onToggleSelection={handleToggleSelection}
                    onDeleteRequest={openDeleteModal}
                    columnPercent={columnPercent}
                    onSliderChange={handleSliderChange}
                    storageBytes={storageUsage.bytes}
                    storageLoading={storageUsage.loading}
                    storageError={storageUsage.error}
                />

                {/* Workspace */}
                <Workspace
                    selectedCaptures={selectedCaptures}
                    onRemoveImage={handleToggleSelection}
                    columnPercent={columnPercent}
                />
            </div>
            {/* Modale di Conferma */}
            <DeleteConfirmationModal isOpen={isModalOpen} onConfirm={handleConfirmDelete} onCancel={closeDeleteModal} />
        </>
    );
};

export default GalleryPage;

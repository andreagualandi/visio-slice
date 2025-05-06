// src/gallery/GalleryPage/GalleryPage.tsx
import React, { useEffect, useCallback } from 'react';
import { storageRemove } from '../../facades/storage.facade';

// Importa componenti UI
import Sidebar from '../Sidebar/Sidebar';
import Workspace from '../Workspace/Workspace';
import DeleteConfirmationModal from '../DeleteConfirmationModal/DeleteConfirmationModal';

// Importa hooks
import { useCaptures, CaptureItem } from './hooks/useCaptures';
import { useSelection } from './hooks/useSelection';
import { useSliderState } from './hooks/useSliderState';
import { useStorageUsage } from './hooks/useStorageUsage';
import { useDeleteConfirmation } from './hooks/useDeleteConfirmation';

// Esporta di nuovo CaptureItem se serve ad altri componenti importarla da qui
export type { CaptureItem };

const GalleryPage: React.FC = () => {
    // Usa i custom hooks per gestire gli stati e la logica
    const { captures, isLoading: isLoadingCaptures, error: capturesError, setCaptures } = useCaptures();
    const { selectedIds, handleToggleSelection, setSelectedIds } = useSelection();
    const { columnPercent, handleSliderChange } = useSliderState(33); // Usa valore iniziale
    const { storageUsage, fetchStorageUsage } = useStorageUsage();

    // Azione di eliminazione effettiva (callback per il hook della modale)
    const handleDeleteAction = useCallback(
        async (keyToDelete: string) => {
            // Resetta errore generale prima di provare
            // TODO: Potrebbe servire uno stato di errore specifico per l'eliminazione
            // setError(null);
            try {
                await storageRemove(keyToDelete);
                // Aggiorna stati gestiti da altri hook
                setCaptures((prev) => prev.filter((c) => c.key !== keyToDelete));
                setSelectedIds((prev) => {
                    if (!prev.has(keyToDelete)) return prev;
                    const next = new Set(prev);
                    next.delete(keyToDelete);
                    return next;
                });
                console.log('Cattura eliminata (via hook):', keyToDelete);
                fetchStorageUsage(); // Aggiorna lo spazio usato
            } catch (err) {
                console.error(`Errore durante l'eliminazione ${keyToDelete} (hook):`, err);
                // TODO: Gestire errore eliminazione (es. notifica)
                // Potremmo passare setError a useDeleteConfirmation o gestirlo qui
                // setError(`Errore eliminazione: ${err instanceof Error ? err.message : '?'}`);
                throw err; // Rilancia l'errore così useDeleteConfirmation sa che è fallito
            }
        },
        [setCaptures, setSelectedIds, fetchStorageUsage]
    ); // Includi setter e fetch nelle dipendenze

    // Hook per la modale, passa l'azione di eliminazione
    const {
        isModalOpen,
        isDeleting, // Stato di caricamento per l'eliminazione
        openDeleteModal,
        closeDeleteModal,
        confirmDeleteHandler,
    } = useDeleteConfirmation({ onConfirmAction: handleDeleteAction });

    // Effetto per caricare lo storage iniziale (solo se non già caricato)
    useEffect(() => {
        if (!isLoadingCaptures && !storageUsage.bytes && !storageUsage.loading && !storageUsage.error) {
            fetchStorageUsage();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingCaptures]); // Ricarica solo quando finisce il caricamento catture

    // Calcola catture selezionate (derivato dagli stati ottenuti dagli hook)
    const selectedCaptures = captures.filter((capture) => selectedIds.has(capture.key));

    // Combina errori (semplice esempio, potrebbe essere più sofisticato)
    const displayError = capturesError || storageUsage.error; // Mostra il primo errore incontrato

    return (
        <>
            <div className="flex h-screen bg-gray-50">
                <Sidebar
                    captures={captures}
                    isLoading={isLoadingCaptures}
                    error={displayError}
                    selectedIds={selectedIds}
                    onToggleSelection={handleToggleSelection}
                    onDeleteRequest={openDeleteModal}
                    columnPercent={columnPercent}
                    onSliderChange={handleSliderChange}
                    storageBytes={storageUsage.bytes}
                    storageLoading={storageUsage.loading}
                    storageError={storageUsage.error}
                />
                <Workspace
                    selectedCaptures={selectedCaptures}
                    onRemoveImage={handleToggleSelection}
                    columnPercent={columnPercent}
                />
            </div>
            <DeleteConfirmationModal
                isOpen={isModalOpen}
                onConfirm={confirmDeleteHandler}
                onCancel={closeDeleteModal}
                // Potremmo passare isDeleting per disabilitare pulsanti/mostrare loader
            />
        </>
    );
};

export default GalleryPage;

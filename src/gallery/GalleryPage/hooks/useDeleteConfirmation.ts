// App/src/gallery/GalleryPage/hooks/useDeleteConfirmation.ts
import { useState, useCallback } from 'react';

interface UseDeleteConfirmationProps {
    onConfirmAction: (key: string) => Promise<void> | void; // Azione da eseguire alla conferma
}

export function useDeleteConfirmation({ onConfirmAction }: UseDeleteConfirmationProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false); // Stato per indicare eliminazione in corso

    const openDeleteModal = useCallback((key: string) => {
        setItemToDeleteId(key);
        setIsModalOpen(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        // Non resettare itemToDeleteId qui, serve a onConfirm
        setIsModalOpen(false);
        // Resetta isDeleting se l'utente annulla
        setIsDeleting(false);
    }, []);

    const confirmDeleteHandler = useCallback(async () => {
        if (!itemToDeleteId) return;
        setIsDeleting(true); // Inizia l'eliminazione
        try {
            // Esegui l'azione passata come prop
            await onConfirmAction(itemToDeleteId);
            // L'azione esterna gestirà l'aggiornamento UI
        } catch (e) {
            // L'errore viene gestito dall'azione esterna, qui non facciamo nulla
            console.error('Errore durante onConfirmAction in useDeleteConfirmation:', e);
        } finally {
            // Indipendentemente da successo/errore, chiudi e resetta
            setIsDeleting(false);
            setItemToDeleteId(null); // Resetta ID solo dopo l'azione
            setIsModalOpen(false);
        }
    }, [itemToDeleteId, onConfirmAction]);

    return {
        isModalOpen,
        itemToDeleteId, // Potrebbe non servire esportarlo
        isDeleting, // Esporta lo stato di caricamento eliminazione
        openDeleteModal,
        closeDeleteModal,
        confirmDeleteHandler,
    };
}

// src/gallery/DeleteConfirmationModal/DeleteConfirmationModal.tsx
import React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onConfirm, onCancel }) => {
    // Se non è aperta, non renderizzare nulla
    if (!isOpen) return null;

    return (
        // Overlay semi-trasparente che copre tutto
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out"
            onClick={onCancel} // Chiude la modale cliccando sull'overlay
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Box del contenuto della modale */}
            <div
                className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto transform transition-all duration-300 ease-in-out scale-100"
                onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando dentro la modale
            >
                {/* Titolo */}
                <h3 id="modal-title" className="text-lg font-semibold mb-4 text-gray-800">
                    Conferma Eliminazione
                </h3>
                {/* Messaggio */}
                <p className="mb-6 text-sm text-gray-600">
                    Sei sicuro di voler eliminare? L'azione non può essere annullata.
                </p>
                {/* Pulsanti di azione */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-150 text-sm font-medium"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={onConfirm}
                        className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-150 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Elimina
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;

// src/gallery/Workspace/WorkspaceImage.tsx
import React from 'react';
import { formatTimestamp } from '../../shared/format.util.ts';

// Interfaccia per i dati (può essere importata se centralizzata)
interface StoredItemData {
    thumb: string;
    full: string;
}
interface CaptureItem {
    key: string;
    data: StoredItemData;
}

// Props del componente WorkspaceImage
interface WorkspaceImageProps {
    item: CaptureItem;
    onRemove: (key: string) => void;
}

const WorkspaceImage: React.FC<WorkspaceImageProps> = ({ item, onRemove }) => {
    const formattedTime = formatTimestamp(item.key);
    return (
        // Contenitore relativo per posizionare il pulsante
        <div className="relative group">
            {/* Immagine Completa */}
            <img
                src={item.data.full}
                alt={`Cattura del ${formattedTime}`}
                loading="lazy"
                className="block w-full h-auto object-contain rounded shadow-md border border-gray-200" // Stile immagine
            />
            {/* Pulsante Chiudi ('X') */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Impedisce che il click si propaghi (es. se l'immagine fosse cliccabile)
                    onRemove(item.key);
                }}
                title="Rimuovi dal workspace"
                aria-label="Rimuovi dal workspace"
                // Stile Tailwind per il pulsante: posizionato in alto a destra, piccolo, scuro, visibile su hover del parent
                className="absolute top-1 right-1 bg-black/60 text-white border border-white rounded-full w-5 h-5 flex items-center justify-center text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/90 focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-black"
            >
                &times;
            </button>
        </div>
    );
};

export default WorkspaceImage;

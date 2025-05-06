// src/gallery/SidebarItem.tsx
import React from 'react';
import { formatTimestamp } from '../shared/format.util.ts';
import { CaptureItem } from './GalleryPage';

// Props del componente SidebarItem
interface SidebarItemProps {
    item: CaptureItem;
    isSelected: boolean;
    onToggleSelection: (key: string) => void;
    onDeleteRequest: (key: string) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, isSelected, onToggleSelection, onDeleteRequest }) => {
    const formattedTime = formatTimestamp(item.key);
    const selectedClasses = isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent';
    return (
        // Contenitore dell'item, layout flex verticale, centrato
        <li
            className={`relative group p-2 border-b border-gray-100 hover:bg-gray-100 cursor-pointer flex flex-col items-center transition-colors duration-150 ${selectedClasses}`}
            onClick={() => onToggleSelection(item.key)}
        >
            <img
                src={item.data.thumb}
                alt={`Miniatura cattura ${formattedTime}`}
                loading="lazy"
                className="max-w-full h-auto max-h-32 object-contain mb-2 rounded shadow-sm"
            />
            <p className="text-xs text-gray-600 text-center break-words">{formattedTime}</p>
            {/* --- Pulsante Elimina --- */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Impedisce il trigger di onToggleSelection
                    onDeleteRequest(item.key); // Chiama l'handler per aprire la modale
                }}
                title="Elimina cattura"
                aria-label="Elimina cattura"
                className="absolute top-1 right-1 bg-red-500/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-700"
            >
                {/* Usiamo una 'X' semplice */}
                &#x2715;
            </button>
        </li>
    );
};

export default SidebarItem;

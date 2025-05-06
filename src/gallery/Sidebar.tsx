// src/gallery/Sidebar.tsx
import React from 'react';
import SidebarItem from './SidebarItem';
import ColumnSlider from './ColumnSlider';
import StorageInfo from './StorageInfo';
import { CaptureItem } from './GalleryPage';

// Props del componente Sidebar
interface SidebarProps {
    captures: CaptureItem[];
    isLoading: boolean;
    error: string | null;
    selectedIds: Set<string>;
    onToggleSelection: (key: string) => void;
    onDeleteRequest: (key: string) => void;
    columnPercent: number;
    onSliderChange: (newValue: number) => void;
    storageBytes: number | null;
    storageLoading: boolean;
    storageError: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
    captures,
    isLoading,
    error,
    selectedIds,
    onToggleSelection,
    onDeleteRequest,
    columnPercent,
    onSliderChange,
    storageBytes,
    storageLoading,
    storageError,
}) => {
    return (
        // Contenitore principale della sidebar
        <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full flex-shrink-0">
            {/* Header Sidebar */}
            <div className="pb-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Catture</h2>
                {/* --- Renderizza lo Slider --- */}
                <div className="text-sm">
                    <ColumnSlider
                        label="Larghezza min:"
                        value={columnPercent}
                        onChange={onSliderChange}
                        min={10}
                        max={51} // O 100 se preferisci consentire colonne singole molto larghe
                        step={1}
                    />
                </div>
            </div>

            {/* Lista */}
            <div className="flex-grow overflow-y-auto py-4">
                {/* Mostra errore caricamento catture se presente */}
                {isLoading && <p className="text-gray-500 text-center">Caricamento...</p>}
                {error && !isLoading && <p className="text-red-500 text-center px-2">{error}</p>}
                {!isLoading && !error && captures.length === 0 && (
                    <p className="text-gray-500 text-center">Nessuna cattura salvata.</p>
                )}
                {!isLoading && !error && captures.length > 0 && (
                    <ul>
                        {captures.map((capture) => (
                            <SidebarItem
                                key={capture.key}
                                item={capture}
                                isSelected={selectedIds.has(capture.key)}
                                onToggleSelection={onToggleSelection}
                                onDeleteRequest={onDeleteRequest}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer Sidebar */}
            <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                <StorageInfo usedBytes={storageBytes} isLoading={storageLoading} error={storageError} />
            </div>
        </div>
    );
};

export default Sidebar;

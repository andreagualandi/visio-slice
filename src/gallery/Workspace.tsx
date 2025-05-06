// src/gallery/Workspace.tsx
import React from 'react';
import WorkspaceImage from './WorkspaceImage';
import { CaptureItem } from './GalleryPage';

// Props del componente Workspace
interface WorkspaceProps {
    selectedCaptures: CaptureItem[];
    onRemoveImage: (key: string) => void;
    columnPercent: number;
}

const Workspace: React.FC<WorkspaceProps> = ({ selectedCaptures, onRemoveImage, columnPercent }) => {
    // Definiamo la variabile CSS che verrà controllata dallo slider
    const gridStyle = {
        '--min-column-percent': `${columnPercent}%`,
    } as React.CSSProperties; // Assertion per TypeScript

    return (
        // Contenitore principale del workspace
        <div className="flex-1 bg-gray-100 p-4 overflow-y-auto">
            {selectedCaptures.length === 0 ? (
                // Messaggio Placeholder se non ci sono catture selezionate
                <p id="workspace-message" className="text-center text-gray-500 mt-10">
                    Seleziona una o più catture dalla sidebar per visualizzarle qui.
                </p>
            ) : (
                // Griglia per visualizzare le immagini selezionate
                <div
                    className="grid grid-cols-[repeat(auto-fit,minmax(max(250px,var(--min-column-percent)),1fr))] gap-4"
                    style={gridStyle} // Applica la variabile CSS
                >
                    {selectedCaptures.map((capture) => (
                        <WorkspaceImage key={capture.key} item={capture} onRemove={onRemoveImage} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Workspace;

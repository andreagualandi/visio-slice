// src/gallery/GalleryPage/hooks/useSelection.ts
import { useState, useCallback } from 'react';

export function useSelection(initialSelectedIds = new Set<string>()) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelectedIds);

    const handleToggleSelection = useCallback((key: string) => {
        setSelectedIds((prevSelectedIds) => {
            const newSelectedIds = new Set(prevSelectedIds);
            if (newSelectedIds.has(key)) {
                newSelectedIds.delete(key);
            } else {
                newSelectedIds.add(key);
            }
            return newSelectedIds;
        });
    }, []); // useCallback per stabilità referenziale

    return { selectedIds, handleToggleSelection, setSelectedIds }; // Esporta anche setSelectedIds
}

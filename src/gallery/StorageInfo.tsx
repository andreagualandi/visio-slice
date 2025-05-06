// src/gallery/StorageInfo.tsx
import React from 'react';
import { formatBytes } from '../shared/format.util.ts'; // Importa l'utility per formattare

interface StorageInfoProps {
    usedBytes: number | null;
    isLoading: boolean;
    error: string | null;
}

const StorageInfo: React.FC<StorageInfoProps> = ({ usedBytes, isLoading, error }) => {
    let content: React.ReactNode;

    if (isLoading) {
        content = <>Calcolo spazio...</>;
    } else if (error) {
        // Mostra 'Errore spazio' e l'errore dettagliato nel title (tooltip)
        content = <span title={error}>Errore spazio</span>;
    } else if (usedBytes !== null) {
        // Formatta i byte se disponibili
        content = <>Storage: {formatBytes(usedBytes)} usati</>;
    } else {
        // Fallback se non in caricamento, senza errore, ma bytes è null
        content = <>Info spazio non disp.</>;
    }

    return (
        // Applica stile base
        <p className="text-xs text-gray-500">{content}</p>
    );
};

export default StorageInfo;

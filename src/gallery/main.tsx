// App/src/gallery/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css'; // Importa gli stili globali Tailwind
import GalleryPage from './GalleryPage'; // Importa il componente effettivo

// Trova l'elemento root nell'HTML
const container = document.getElementById('gallery-root');

if (container) {
    // Crea il root React
    const root = ReactDOM.createRoot(container);
    // Renderizza il componente principale effettivo
    root.render(
        <React.StrictMode>
            <GalleryPage />
        </React.StrictMode>
    );
} else {
    console.error("Elemento root 'gallery-root' non trovato. Impossibile montare l'app React.");
}

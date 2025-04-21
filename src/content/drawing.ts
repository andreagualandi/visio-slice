// drawing.ts
import { appState, AppState, Rect } from './state';
import { showToast } from './ui';
import { setClipPath, simpleThrottle } from './utils';

const THROTTLE_LIMIT_MS: number = 30; // Definiamo qui per ora

// --- Variabili Interne al Modulo ---
let onMouseMoveRef: ((e: MouseEvent) => void) | null = null;
let throttledOnMouseMoveRef: ReturnType<typeof simpleThrottle> | null = null;
let onMouseUpRef: ((e: MouseEvent) => void) | null = null;

// --- Funzioni Interne ---

// Mouse Move durante disegno
const onMouseMove = (e: MouseEvent): void => {
    if (!appState.isDrawing || appState.currentState !== 'drawing') return;
    const { startX, startY } = appState.interaction;
    const currentX: number = e.clientX;
    const currentY: number = e.clientY;
    const left: number = Math.round(Math.min(startX, currentX));
    const top: number = Math.round(Math.min(startY, currentY));
    const width: number = Math.round(Math.abs(currentX - startX));
    const height: number = Math.round(Math.abs(currentY - startY));
    appState.currentRect = { top, left, width, height };
    updateDrawingUI();
};

// Aggiorna solo bordo e clip-path durante il disegno
const updateDrawingUI = (): void => {
    const rect: Rect | null = appState.currentRect;
    if (!rect || !appState.elements.border || !appState.elements.overlay) return;
    if (rect.width > 0 && rect.height > 0) {
        appState.elements.border.style.top = `${rect.top}px`;
        appState.elements.border.style.left = `${rect.left}px`;
        appState.elements.border.style.width = `${rect.width}px`;
        appState.elements.border.style.height = `${rect.height}px`;
        appState.elements.border.style.display = 'block';
        const clipCoords: string = `${rect.left}px ${rect.top}px, ${rect.left}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top}px, ${rect.left}px ${rect.top}px`;
        setClipPath(appState.elements.overlay, `polygon(evenodd, 0 0, 0 100%, 100% 100%, 100% 0, 0 0, ${clipCoords})`);
    } else {
        appState.elements.border.style.display = 'none';
        setClipPath(appState.elements.overlay, 'none');
    }
};

// Mouse Up per terminare disegno - Usa Callbacks
const createOnMouseUp = (
    onValidSelection: (rect: Rect) => void,
    onInvalidSelection: () => void
): ((e: MouseEvent) => void) => {
    return (_e: MouseEvent): void => {
        if (!appState.isDrawing || appState.currentState !== 'drawing') return;

        // Rimuovi listener globali disegno
        if (throttledOnMouseMoveRef) window.removeEventListener('mousemove', throttledOnMouseMoveRef);
        if (onMouseUpRef) window.removeEventListener('mouseup', onMouseUpRef);
        throttledOnMouseMoveRef = null;
        onMouseUpRef = null;

        appState.isDrawing = false;
        const rect: Rect | null = appState.currentRect;

        // Gestione Click o area nulla
        if (!rect || rect.width === 0 || rect.height === 0) {
            console.log('[Drawing] Click/area nulla rilevata.');
            // Reset UI minimo qui
            if (appState.elements.border) appState.elements.border.style.display = 'none';
            setClipPath(appState.elements.overlay, 'none');
            // Chiamiamo invalid per pulizia stato completa dal chiamante
            onInvalidSelection();
            return;
        }

        // Gestione Dimensione Minima
        const minSize = 50;
        if (rect.width < minSize || rect.height < minSize) {
            console.log(`[Drawing] Selezione troppo piccola: ${rect.width}x${rect.height}`);
            showToast(`Selezione troppo piccola. Minimo ${minSize}x${minSize}px.`, true);
            onInvalidSelection(); // Chiama il callback per selezione invalida
            return;
        }

        // --- Selezione Valida Effettuata ---
        console.log('[Drawing] Selezione valida:', rect);
        updateDrawingUI();
        onValidSelection(rect);
    };
};

// Mouse Down iniziale
const createOnMouseDown = (onMouseUpCallback: (e: MouseEvent) => void): ((e: MouseEvent) => void) => {
    return (e: MouseEvent): void => {
        if (e.button !== 0 || appState.currentState !== 'idle') {
            return;
        }
        e.preventDefault();

        appState.isDrawing = true;
        appState.currentState = 'drawing';
        appState.interaction.startX = e.clientX;
        appState.interaction.startY = e.clientY;
        appState.currentRect = { top: e.clientY, left: e.clientX, width: 0, height: 0 };

        // Nascondi elementi UI non necessari durante il disegno
        if (appState.elements.border) appState.elements.border.style.display = 'none';
        if (appState.elements.saveBtn) appState.elements.saveBtn.style.display = 'none';
        appState.elements.handles.forEach((h) => (h.style.display = 'none'));
        setClipPath(appState.elements.overlay, 'none');

        // Crea e assegna i riferimenti ai listener per questa sessione di disegno
        onMouseMoveRef = onMouseMove;
        throttledOnMouseMoveRef = simpleThrottle(onMouseMoveRef, THROTTLE_LIMIT_MS);
        onMouseUpRef = onMouseUpCallback;

        // Aggiungi listener globali
        window.addEventListener('mousemove', throttledOnMouseMoveRef);
        window.addEventListener('mouseup', onMouseUpRef);
        console.log('[Drawing] Inizio disegno...');
    };
};

// --- Funzione Esportata ---
interface DrawingCallbacks {
    onValidSelection: (rect: Rect) => void;
    onInvalidSelection: () => void;
}

export function initializeDrawingHandlers(appStateRef: AppState, callbacks: DrawingCallbacks): () => void {
    // Ritorna una funzione di cleanup
    if (!appStateRef.elements.blocker) {
        console.error('[Drawing] Blocker element not found. Cannot initialize.');
        return () => {};
    }
    const effectiveOnMouseUp = createOnMouseUp(callbacks.onValidSelection, callbacks.onInvalidSelection);
    const effectiveOnMouseDown = createOnMouseDown(effectiveOnMouseUp);
    const blocker = appStateRef.elements.blocker;
    blocker.addEventListener('mousedown', effectiveOnMouseDown);
    console.log('[Drawing] Listener mousedown aggiunto al blocker.');
    const cleanup = () => {
        blocker.removeEventListener('mousedown', effectiveOnMouseDown);
        if (throttledOnMouseMoveRef) window.removeEventListener('mousemove', throttledOnMouseMoveRef);
        if (onMouseUpRef) window.removeEventListener('mouseup', onMouseUpRef);
        console.log('[Drawing] Listener drawing rimossi.');
    };
    return cleanup;
}

// interaction.ts
import { appState, AppState, Rect } from './state';
import { updateSelectionUI } from './ui';
import { simpleThrottle } from './utils';

// Definiamo la costante qui per ora
const THROTTLE_LIMIT_MS: number = 30;

// --- Riferimenti interni ai listener throttled/non-throttled ---
let onInteractionMoveRef: ((e: MouseEvent) => void) | null = null;
let throttledOnInteractionMoveRef: ReturnType<typeof simpleThrottle> | null = null;
let onInteractionEndRef: ((e: MouseEvent) => void) | null = null;

// --- Funzioni Interne ---

// Mouse Move durante interazione (move/resize)
const onInteractionMove = (e: MouseEvent): void => {
    // Legge lo stato corrente dell'interazione dall'appState importato
    const { type, handle, startX, startY, initialRect } = appState.interaction;

    // Se non c'è un'interazione attiva o un rettangolo iniziale, esce
    if (!type || !initialRect) return;

    // Calcola lo spostamento del mouse dall'inizio dell'interazione
    const dx: number = e.clientX - startX;
    const dy: number = e.clientY - startY;

    // Crea una copia del rettangolo iniziale su cui lavorare
    let newRect: Rect = { ...initialRect };

    // Applica lo spostamento o il ridimensionamento
    if (type === 'move') {
        // Sposta semplicemente il rettangolo
        newRect.top = initialRect.top + dy;
        newRect.left = initialRect.left + dx;
        // TODO: Potrebbe essere utile aggiungere limiti per non uscire dalla viewport
    } else if (type === 'resize') {
        // Logica di ridimensionamento basata sull'handle cliccato
        const minSize: number = 50; // Dimensione minima consentita
        switch (handle) {
            case 'top-left': {
                const tempWidth = initialRect.width - dx;
                const tempHeight = initialRect.height - dy;
                newRect.width = Math.max(minSize, tempWidth);
                newRect.height = Math.max(minSize, tempHeight);
                // Aggiorna top/left per mantenere il punto opposto fisso
                newRect.left = initialRect.left + initialRect.width - newRect.width;
                newRect.top = initialRect.top + initialRect.height - newRect.height;
                break;
            }
            case 'top-right': {
                const tempWidth = initialRect.width + dx;
                const tempHeight = initialRect.height - dy;
                newRect.width = Math.max(minSize, tempWidth);
                newRect.height = Math.max(minSize, tempHeight);
                // Left non cambia
                newRect.top = initialRect.top + initialRect.height - newRect.height;
                break;
            }
            case 'bottom-left': {
                const tempWidth = initialRect.width - dx;
                const tempHeight = initialRect.height + dy;
                newRect.width = Math.max(minSize, tempWidth);
                newRect.height = Math.max(minSize, tempHeight);
                // Top non cambia
                newRect.left = initialRect.left + initialRect.width - newRect.width;
                break;
            }
            case 'bottom-right': {
                // Top e Left non cambiano
                newRect.width = Math.max(minSize, initialRect.width + dx);
                newRect.height = Math.max(minSize, initialRect.height + dy);
                break;
            }
            // Aggiungere casi per altri handle se implementati (es. N, S, E, W)
        }
    }

    // Aggiorna lo stato globale con il nuovo rettangolo calcolato (arrotondato)
    appState.currentRect = {
        top: Math.round(newRect.top),
        left: Math.round(newRect.left),
        width: Math.round(newRect.width),
        height: Math.round(newRect.height),
    };

    // Chiama la funzione importata da ui.ts per aggiornare l'interfaccia visiva,
    updateSelectionUI();
};

// Mouse Up per terminare interazione (move/resize)
const onInteractionEnd = (): void => {
    if (!appState.interaction.type) return;
    console.log(`[Interaction] Fine ${appState.interaction.type}.`);

    // Rimuovi listener globali specifici dell'interazione
    if (throttledOnInteractionMoveRef) window.removeEventListener('mousemove', throttledOnInteractionMoveRef);
    if (onInteractionEndRef) window.removeEventListener('mouseup', onInteractionEndRef);
    throttledOnInteractionMoveRef = null;
    onInteractionEndRef = null;

    // Resetta stato interazione
    appState.interaction.type = null;
    appState.interaction.handle = null;
    appState.interaction.initialRect = null;

    // Ripristina cursori (il body e il blocker)
    document.body.style.cursor = 'default';
    if (appState.elements.blocker) {
        appState.elements.blocker.style.cursor = 'crosshair';
    }
    // L'UI (maniglie) è già stata aggiornata dall'ultimo onInteractionMove -> updateSelectionUI
};

// Mouse Down su Blocker (per move) o Handle (per resize)
const onInteractionStart = (e: MouseEvent): void => {
    if (appState.currentState !== 'selected' || e.button !== 0) {
        return;
    }
    const target: EventTarget | null = e.target;
    const rect: Rect | null = appState.currentRect;
    let interactionType: 'move' | 'resize' | null = null;
    let handleType: string | null = null;

    // Verifica se è un handle
    if (target && target instanceof HTMLElement && target.classList.contains('web-area-saver-handle')) {
        interactionType = 'resize';
        handleType = target.dataset.handleType || null;
        document.body.style.cursor = target.style.cursor; // Usa cursore dell'handle
        console.log(`[Interaction] Inizio resize (handle: ${handleType})`);
    }
    // Verifica se è il blocker DENTRO l'area selezionata
    else if (
        target === appState.elements.blocker &&
        rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.left + rect.width &&
        e.clientY >= rect.top &&
        e.clientY <= rect.top + rect.height
    ) {
        interactionType = 'move';
        handleType = null;
        document.body.style.cursor = 'move';
        console.log('[Interaction] Inizio spostamento.');
    } else {
        // Click fuori area attiva, nessuna interazione
        return;
    }

    e.preventDefault();
    e.stopPropagation(); // Previene che il mousedown sul blocker attivi anche altro

    // Salva stato iniziale interazione
    appState.interaction.type = interactionType;
    appState.interaction.handle = handleType;
    appState.interaction.startX = e.clientX;
    appState.interaction.startY = e.clientY;
    appState.interaction.initialRect = rect ? { ...rect } : null;

    // Crea i riferimenti ai listener per questa sessione di interazione
    // Lega l'handler di salvataggio a onInteractionMove
    onInteractionMoveRef = onInteractionMove; // Riferimento diretto ora
    throttledOnInteractionMoveRef = simpleThrottle(onInteractionMoveRef, THROTTLE_LIMIT_MS);
    onInteractionEndRef = onInteractionEnd;

    // Aggiungi listener globali
    window.addEventListener('mousemove', throttledOnInteractionMoveRef);
    window.addEventListener('mouseup', onInteractionEndRef);
};

export function initializeInteractionHandlers(
    appStateRef: AppState // Passiamo stato e UI per chiarezza
): () => void {
    // Ritorna funzione di cleanup

    const blocker = appStateRef.elements.blocker;
    const handles = appStateRef.elements.handles;

    if (!blocker) {
        console.error('[Interaction] Blocker element not found in state. Cannot initialize handlers.');
        return () => {};
    }

    // Crea una versione di onInteractionStart legata all'handler di salvataggio fornito
    const effectiveOnInteractionStart = (e: MouseEvent) => {
        onInteractionStart(e);
    };

    // Aggiungi listener al blocker (per 'move')
    blocker.addEventListener('mousedown', effectiveOnInteractionStart);

    // Aggiungi listener a ogni handle (per 'resize')
    handles.forEach((handle) => {
        handle.addEventListener('mousedown', effectiveOnInteractionStart);
    });

    console.log('[Interaction] Listener interazione (move/resize) aggiunti.');

    // Funzione di cleanup
    const cleanup = () => {
        blocker.removeEventListener('mousedown', effectiveOnInteractionStart);
        handles.forEach((handle) => {
            handle.removeEventListener('mousedown', effectiveOnInteractionStart);
        });
        // Rimuovi anche listener globali se ancora attivi
        if (throttledOnInteractionMoveRef) window.removeEventListener('mousemove', throttledOnInteractionMoveRef);
        if (onInteractionEndRef) window.removeEventListener('mouseup', onInteractionEndRef);
        console.log('[Interaction] Listener interazione rimossi.');
    };

    return cleanup;
}

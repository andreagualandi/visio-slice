// ui.ts
import { appState, Rect } from './state';
import { handleSaveClick } from './handlers';
import { setClipPath } from './utils';

declare global {
    function deactivateCaptureUI(): void;
}

// Esporta la funzione per iniettare gli stili
export function injectStyles(): void {
    // Controlla se l'elemento stile è già stato aggiunto tramite lo stato
    if (appState.elements.style || document.getElementById('web-area-saver-styles')) {
        return;
    }
    const style: HTMLStyleElement = document.createElement('style');
    style.id = 'web-area-saver-styles';
    // Contenuto CSS completo omesso per brevità, ma dovrebbe essere qui
    style.textContent = `
        .web-area-saver-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(128, 128, 128, 0.7); z-index: 9998; pointer-events: none; }
        .web-area-saver-blocker { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: transparent; z-index: 9997; cursor: crosshair; }
        .web-area-saver-border { position: fixed; border: 2px dashed white; pointer-events: none; z-index: 9999; box-sizing: border-box; display: none; }
        .web-area-saver-cancel, .web-area-saver-save { position: fixed; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; z-index: 10000; cursor: pointer; display: flex; justify-content: center; align-items: center; border: 1px solid white; background: rgba(0,0,0,0.5); color: white; transition: background-color 0.2s ease, transform 0.1s ease; }
        .web-area-saver-cancel { top: 15px; left: 15px; line-height: 1; font-size: 18px; }
        .web-area-saver-cancel:hover { background-color: rgba(220, 53, 69, 0.8); transform: scale(1.1); }
        .web-area-saver-save { font-size: 18px; line-height: 1; display: none; /* Posizione dinamica */ }
        .web-area-saver-save:hover { background-color: rgba(40, 167, 69, 0.9); transform: scale(1.1); }
        .web-area-saver-handle { position: fixed; width: 10px; height: 10px; background-color: white; border: 1px solid black; z-index: 10000; pointer-events: auto; display: none; transition: background-color 0.1s ease; }
        .web-area-saver-handle:hover { background-color: #eee; }
        .web-area-saver-toast { position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); padding: 10px 20px; background-color: rgba(40, 167, 69, 0.9); color: white; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; z-index: 10001; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); opacity: 0; transition: opacity 0.4s ease-in-out, bottom 0.4s ease-in-out; pointer-events: none; white-space: nowrap; }
        .web-area-saver-toast.show { opacity: 1; bottom: 35px; }
        .web-area-saver-toast.error { background-color: rgba(220, 53, 69, 0.9); }
      `;
    document.head.appendChild(style);
    // Salva il riferimento nello stato importato
    appState.elements.style = style;
}

// Esporta la funzione per mostrare i toast
export function showToast(message: string, isError: boolean = false): void {
    // Chiama sempre injectStyles; sarà lei a decidere se fare qualcosa.
    injectStyles();

    // Rimuovi toast esistente
    const existing: Element | null = document.querySelector('.web-area-saver-toast');
    if (existing) existing.remove();

    // Crea nuovo toast
    const toast: HTMLDivElement = document.createElement('div');
    toast.className = 'web-area-saver-toast';
    if (isError) toast.classList.add('error');
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animazione fade-in/up
    requestAnimationFrame(() => toast.classList.add('show'));

    // Timer per rimozione
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3500);
}

export function createUI(onCancelHandler: () => void): void {
    // Chiama injectStyles secondo la preferenza dell'utente
    injectStyles();

    // Crea Blocker
    const blocker: HTMLDivElement = document.createElement('div');
    blocker.className = 'web-area-saver-blocker';
    document.body.appendChild(blocker);
    appState.elements.blocker = blocker;

    // Crea Overlay
    const overlay: HTMLDivElement = document.createElement('div');
    overlay.className = 'web-area-saver-overlay';
    document.body.appendChild(overlay);
    appState.elements.overlay = overlay;

    // Crea Bottone Annulla
    const cancel: HTMLButtonElement = document.createElement('button');
    cancel.className = 'web-area-saver-cancel';
    cancel.innerHTML = '&times;';
    cancel.title = 'Annulla (Esc)';
    cancel.setAttribute('aria-label', 'Annulla cattura');
    cancel.onclick = onCancelHandler;
    document.body.appendChild(cancel);
    appState.elements.cancel = cancel;

    // Crea Bordo Selezione (nascosto)
    const border: HTMLDivElement = document.createElement('div');
    border.className = 'web-area-saver-border';
    document.body.appendChild(border);
    appState.elements.border = border;

    // Nota: Handle e Bottone Salva vengono creati/aggiornati dopo
}

// Funzione per creare/aggiornare il bottone Salva
export function createOrUpdateSaveButton(): void {
    const rect: Rect | null = appState.currentRect;
    if (!rect) return;

    let btn: HTMLButtonElement | null = appState.elements.saveBtn;
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'web-area-saver-save';
        btn.title = 'Salva cattura (\u2713)';
        btn.innerHTML = '&#x2713;';
        btn.setAttribute('aria-label', 'Salva cattura');
        btn.onclick = handleSaveClick;
        document.body.appendChild(btn);
        appState.elements.saveBtn = btn;
    }

    const btnSize: number = 32;
    btn.style.top = `${Math.round(rect.top + rect.height / 2 - btnSize / 2)}px`;
    btn.style.left = `${Math.round(rect.left + rect.width / 2 - btnSize / 2)}px`;
    btn.style.display = 'flex';
}

// Funzione helper per creare un singolo handle
function createHandle(type: string, cursor: string): HTMLDivElement {
    const handle: HTMLDivElement = document.createElement('div');
    handle.className = 'web-area-saver-handle';
    handle.dataset.handleType = type;
    handle.style.cursor = cursor;
    document.body.appendChild(handle);
    return handle;
}

// Funzione per creare/aggiornare gli handle di resize
export function createOrUpdateHandles(): void {
    const rect: Rect | null = appState.currentRect;
    if (!rect) return;

    const handleSizeOffset: number = 5; // Metà dimensione handle (10px / 2)
    const positions: { [key: string]: { top: number; left: number; cursor: string } } = {
        'top-left': {
            top: rect.top - handleSizeOffset,
            left: rect.left - handleSizeOffset,
            cursor: 'nwse-resize',
        },
        'top-right': {
            top: rect.top - handleSizeOffset,
            left: rect.left + rect.width - handleSizeOffset,
            cursor: 'nesw-resize',
        },
        'bottom-left': {
            top: rect.top + rect.height - handleSizeOffset,
            left: rect.left - handleSizeOffset,
            cursor: 'nesw-resize',
        },
        'bottom-right': {
            top: rect.top + rect.height - handleSizeOffset,
            left: rect.left + rect.width - handleSizeOffset,
            cursor: 'nwse-resize',
        },
    };

    if (appState.elements.handles.length === 0) {
        appState.elements.handles = Object.keys(positions).map((type: string) => {
            const pos = positions[type];
            return createHandle(type, pos.cursor);
        });
    }

    appState.elements.handles.forEach((handle: HTMLDivElement) => {
        const type: string | undefined = handle.dataset.handleType;
        if (!type) return;
        const pos = positions[type];
        if (pos) {
            handle.style.top = `${Math.round(pos.top)}px`;
            handle.style.left = `${Math.round(pos.left)}px`;
            handle.style.display = 'block';
        } else {
            handle.style.display = 'none';
        }
    });
}

// Funzione per aggiornare l'intera UI della selezione
export function updateSelectionUI(): void {
    const rect: Rect | null = appState.currentRect;
    if (!rect || !appState.elements.border || !appState.elements.overlay) return;

    console.log('Aggiornamento UI selezione (da ui.ts):', rect);

    // Aggiorna bordo
    appState.elements.border.style.top = `${rect.top}px`;
    appState.elements.border.style.left = `${rect.left}px`;
    appState.elements.border.style.width = `${rect.width}px`;
    appState.elements.border.style.height = `${rect.height}px`;
    appState.elements.border.style.display = 'block';

    // Aggiorna clip-path overlay
    const clipCoords: string = `${rect.left}px ${rect.top}px, ${rect.left}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top}px, ${rect.left}px ${rect.top}px`;
    // Assumiamo setClipPath sia globale per ora
    setClipPath(appState.elements.overlay, `polygon(evenodd, 0 0, 0 100%, 100% 100%, 100% 0, 0 0, ${clipCoords})`);

    // Aggiorna Handle e Bottone Salva chiamando le funzioni locali
    createOrUpdateHandles();
    createOrUpdateSaveButton();
}

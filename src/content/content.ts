// src/content/content.ts

// Importa le costanti necessarie (senza .ts)
import {
    MSG_TYPE_SAVE_SUCCESS,
    MSG_TYPE_SAVE_ERROR,
    MSG_TYPE_CAPTURE_ERROR,
    MSG_TYPE_SELECTION_COMPLETE, // Usato per inviare il messaggio
} from '../shared/constants';

// --- Definizione Tipi e Interfacce ---

// Estende l'interfaccia Window per aggiungere le nostre proprietà globali
declare global {
    interface Window {
        webAreaSaverListenerAttached?: boolean;
        webAreaSaverActive?: boolean;
    }
}

// Interfaccia per le coordinate e dimensioni di un rettangolo
interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

// Interfaccia per lo stato dell'interazione (drag, resize)
interface InteractionState {
    type: 'move' | 'resize' | null;
    handle: string | null; // es. 'top-left', 'bottom-right'
    startX: number;
    startY: number;
    initialRect: Rect | null;
}

// Interfaccia per gli elementi DOM gestiti dall'applicazione
interface AppElements {
    overlay: HTMLDivElement | null;
    blocker: HTMLDivElement | null;
    cancel: HTMLButtonElement | null;
    style: HTMLStyleElement | null;
    border: HTMLDivElement | null;
    saveBtn: HTMLButtonElement | null;
    handles: HTMLDivElement[]; // Array di handle (div)
}

// Interfaccia per lo stato globale dell'applicazione content script
interface AppState {
    isActive: boolean;
    isDrawing: boolean;
    currentState: 'idle' | 'drawing' | 'selected'; // Stati principali
    currentRect: Rect | null;
    interaction: InteractionState;
    originalCursor: string;
    elements: AppElements;
}

// Interfaccia per i messaggi ricevuti dal background script
interface BackgroundMessage {
    type: string; // Usa le costanti MSG_TYPE_* importate
    message?: string;
    // Aggiungere altri campi se necessario
}

// Interfaccia per i dati inviati al background script
interface SelectionPayload extends Rect {
    // Estende Rect
    dpr: number; // Aggiunge Device Pixel Ratio
}

// --- Inizio IIFE ---
(function () {
    // Funzione di logging con tipo per rest parameters
    const log = (...args: any[]): void => console.log('[WebAreaSaver]', ...args);

    // --- Listener Messaggi Background ---
    const handleBackgroundMessages = (
        message: BackgroundMessage | any,
        _sender: chrome.runtime.MessageSender,
        _sendResponse: (response?: any) => void
    ): boolean | undefined => {
        log('Messaggio ricevuto dal background:', message);

        // *** NUOVO: Messaggio per attivare l'UI ***
        if (message?.type === 'ACTIVATE_CAPTURE') {
            activateCaptureUI();
            return false; // O true se inviassimo risposta
        }

        if (message?.type === MSG_TYPE_SAVE_SUCCESS) {
            showToast(message.message || 'Salvataggio completato');
        } else if (message?.type === MSG_TYPE_SAVE_ERROR || message?.type === MSG_TYPE_CAPTURE_ERROR) {
            showToast(message.message || 'Errore durante il salvataggio/cattura', true);
        } else {
            log('WARN: Ricevuto messaggio non gestito:', message);
        }
        return false;
    };

    // Aggiungi listener solo se non già presente
    if (!window.webAreaSaverListenerAttached) {
        chrome.runtime.onMessage.addListener(handleBackgroundMessages);
        window.webAreaSaverListenerAttached = true;
        log('Listener messaggi background aggiunto.');
    } else {
        log('Listener messaggi background già presente.');
    }

    // --- Guardia Script Principale ---
    if (window.webAreaSaverActive) {
        log('Script già caricato.'); // Solo log, non esce subito
        // Potrebbe servire gestire una riattivazione? Per ora no.
        // return; // Rimuoviamo il return immediato
    } else {
        window.webAreaSaverActive = true; // Imposta il flag la prima volta
        log('Script caricato per la prima volta.');
    }

    function activateCaptureUI() {
        // Controllo aggiuntivo per evitare attivazioni multiple se serve
        if (appState.isActive) {
            log('UI già attiva.');
            return;
        }
        log('Attivazione interfaccia di cattura...');
        appState.isActive = true; // Stato logico interno dell'UI
        createUI(); // Crea elementi UI
        window.addEventListener('keydown', onKeyDown); // Aggiungi listener tastiera
        log('Interfaccia inizializzata. Stato: idle.');
        // Assicurarsi che il blocker abbia il listener 'mousedown' iniziale
        if (appState.elements.blocker) {
            appState.elements.blocker.addEventListener('mousedown', onMouseDown);
        }
    }

    // --- Stato Applicazione Tipizzato ---
    const appState: AppState = {
        isActive: false, // Diventa true all'inizializzazione effettiva
        isDrawing: false,
        currentState: 'idle',
        currentRect: null,
        interaction: {
            type: null,
            handle: null,
            startX: 0,
            startY: 0,
            initialRect: null,
        },
        originalCursor: document.body.style.cursor || 'default', // Salva cursore originale
        elements: {
            overlay: null,
            blocker: null,
            cancel: null,
            style: null,
            border: null,
            saveBtn: null,
            handles: [], // Inizializza come array vuoto
        },
    };

    // --- Funzioni Helper Tipizzate ---

    // Imposta clip-path (con tipo per elemento)
    const setClipPath = (el: HTMLElement | null, path: string): void => {
        if (!el) return;
        el.style.clipPath = path;
    };

    // Throttle function (tipi base, 'this' rimane any per semplicità)
    const simpleThrottle = <T extends (...args: any[]) => any>(func: T, limit: number): T => {
        let wait = false;
        // Usiamo una function expression per preservare 'this'
        return function (this: any, ...args: Parameters<T>): ReturnType<T> | void {
            if (!wait) {
                const result = func.apply(this, args);
                wait = true;
                setTimeout(() => {
                    wait = false;
                }, limit);
                return result; // Ritorna il risultato della funzione originale
            }
        } as T; // Type assertion per mantenere il tipo originale della funzione
    };

    // --- CSS e UI ---

    // Inietta stili CSS (ritorno void)
    const injectStyles = (): void => {
        if (document.getElementById('web-area-saver-styles')) return;
        const style: HTMLStyleElement = document.createElement('style');
        style.id = 'web-area-saver-styles';
        // Manteniamo gli stili originali qui...
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
        appState.elements.style = style; // Salva riferimento nello stato
    };

    // Mostra messaggio toast (tipi per parametri, ritorno void)
    const showToast = (message: string, isError: boolean = false): void => {
        // Assicura che gli stili siano iniettati
        if (!appState.elements.style && !document.getElementById('web-area-saver-styles')) {
            injectStyles();
        }
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
            // Rimuovi dal DOM dopo la transizione di fade-out
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, 3500);
    };

    // Funzione di cleanup (ritorno void)
    const cleanup = (): void => {
        log('Cleanup...');

        // Rimuovi listener specifici con tipi evento corretti
        appState.elements.blocker?.removeEventListener('mousedown', onMouseDown);
        appState.elements.blocker?.removeEventListener('mousedown', onInteractionStart);
        appState.elements.handles.forEach((handle: HTMLDivElement) => {
            // Tipo per handle nell'array
            handle.removeEventListener('mousedown', onInteractionStart);
        });
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('mousemove', throttledOnMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', throttledOnInteractionMove);
        window.removeEventListener('mouseup', onInteractionEnd);

        // Rimuovi elementi DOM
        Object.values(appState.elements).forEach((el: HTMLElement | HTMLElement[] | null) => {
            if (Array.isArray(el)) {
                el.forEach((e: HTMLElement) => e?.remove()); // Assumiamo HTMLElement nell'array
            } else {
                el?.remove();
            }
        });

        // Resetta stato
        document.body.style.cursor = appState.originalCursor; // Ripristina cursore
        appState.isActive = false;
        appState.isDrawing = false;
        appState.currentState = 'idle';
        appState.currentRect = null;
        appState.interaction = { type: null, handle: null, startX: 0, startY: 0, initialRect: null };
        // Resetta riferimenti elementi
        appState.elements = {
            overlay: null,
            blocker: null,
            cancel: null,
            style: null,
            border: null,
            saveBtn: null,
            handles: [],
        };
        window.webAreaSaverActive = false; // Resetta flag globale
        log('Cleanup completato.');
    };

    // --- Gestione Eventi ---

    // Handler tastiera (tipo evento: KeyboardEvent)
    const onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            if (appState.interaction.type) {
                // Se sto interagendo (move/resize)
                log('Interazione annullata con ESC');
                // Interrompi interazione corrente
                appState.interaction.type = null;
                window.removeEventListener('mousemove', throttledOnInteractionMove);
                window.removeEventListener('mouseup', onInteractionEnd);
                // Ripristina rettangolo precedente
                if (appState.interaction.initialRect) {
                    appState.currentRect = { ...appState.interaction.initialRect };
                }
                appState.currentState = 'selected';
                document.body.style.cursor = 'default'; // Ripristina cursore body
                if (appState.elements.blocker) appState.elements.blocker.style.cursor = 'crosshair'; // Cursore blocker
                updateSelectionUI(); // Ridisegna UI
            } else {
                // Altrimenti (disegnando o selezionato ma fermo), annulla tutto
                log('Operazione annullata con ESC.');
                cleanup();
            }
        } else if (
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
            appState.currentState === 'selected'
        ) {
            // Spostamento fine (Nudge) con frecce
            e.preventDefault();
            const delta: number = e.shiftKey ? 10 : 1; // Valore spostamento
            const rect: Rect | null = appState.currentRect;
            if (!rect) return; // Se non c'è rettangolo, non fare nulla

            // Crea una copia modificabile
            const newRect: Rect = { ...rect };
            if (e.key === 'ArrowUp') newRect.top -= delta;
            if (e.key === 'ArrowDown') newRect.top += delta;
            if (e.key === 'ArrowLeft') newRect.left -= delta;
            if (e.key === 'ArrowRight') newRect.left += delta;

            // TODO: Aggiungere controllo opzionale per non uscire dalla viewport

            appState.currentRect = newRect; // Aggiorna stato
            updateSelectionUI(); // Aggiorna UI
        }
    };

    // Creazione UI iniziale (ritorno void)
    const createUI = (): void => {
        injectStyles(); // Assicura che gli stili siano presenti

        // Blocker (per input mouse iniziale)
        const blocker: HTMLDivElement = document.createElement('div');
        blocker.className = 'web-area-saver-blocker';
        blocker.addEventListener('mousedown', onMouseDown); // Aggiungi listener per iniziare disegno
        document.body.appendChild(blocker);
        appState.elements.blocker = blocker;

        // Overlay (sfondo grigio)
        const overlay: HTMLDivElement = document.createElement('div');
        overlay.className = 'web-area-saver-overlay';
        document.body.appendChild(overlay);
        appState.elements.overlay = overlay;

        // Bottone Annulla
        const cancel: HTMLButtonElement = document.createElement('button');
        cancel.className = 'web-area-saver-cancel';
        cancel.innerHTML = '&times;'; // Carattere 'X'
        cancel.title = 'Annulla (Esc)';
        cancel.setAttribute('aria-label', 'Annulla cattura');
        cancel.onclick = cleanup; // Chiama cleanup al click
        document.body.appendChild(cancel);
        appState.elements.cancel = cancel;

        // Bordo selezione (inizialmente nascosto)
        const border: HTMLDivElement = document.createElement('div');
        border.className = 'web-area-saver-border';
        document.body.appendChild(border);
        appState.elements.border = border;

        // Gli handle e il bottone salva vengono creati/aggiornati dopo la selezione
    };

    // --- Logica Disegno Selezione ---

    // Mouse Down iniziale (per iniziare disegno, tipo evento MouseEvent)
    const onMouseDown = (e: MouseEvent): void => {
        // Accetta solo tasto sinistro (button 0) e solo se siamo in stato 'idle'
        if (e.button !== 0 || appState.currentState !== 'idle') {
            log(`onMouseDown ignorato (stato: ${appState.currentState}, bottone: ${e.button})`);
            return;
        }
        e.preventDefault(); // Previene selezione testo standard

        // Imposta stato iniziale disegno
        appState.isDrawing = true;
        appState.currentState = 'drawing';
        appState.interaction.startX = e.clientX;
        appState.interaction.startY = e.clientY;
        appState.currentRect = { top: e.clientY, left: e.clientX, width: 0, height: 0 }; // Inizializza rettangolo

        // Nascondi elementi UI non necessari durante il disegno
        if (appState.elements.border) appState.elements.border.style.display = 'none';
        if (appState.elements.saveBtn) appState.elements.saveBtn.style.display = 'none';
        appState.elements.handles.forEach((h) => (h.style.display = 'none')); // Nascondi handle esistenti
        setClipPath(appState.elements.overlay, 'none'); // Rimuovi eventuale clip-path precedente

        // Aggiungi listener globali per movimento e rilascio
        window.addEventListener('mousemove', throttledOnMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        log('Inizio disegno...');
    };

    // Mouse Move durante disegno (tipo evento MouseEvent)
    const onMouseMove = (e: MouseEvent): void => {
        if (!appState.isDrawing || appState.currentState !== 'drawing') return;

        const { startX, startY } = appState.interaction;
        const currentX: number = e.clientX;
        const currentY: number = e.clientY;

        // Calcola il rettangolo basato sul punto iniziale e corrente
        const left: number = Math.round(Math.min(startX, currentX));
        const top: number = Math.round(Math.min(startY, currentY));
        const width: number = Math.round(Math.abs(currentX - startX));
        const height: number = Math.round(Math.abs(currentY - startY));

        appState.currentRect = { top, left, width, height }; // Aggiorna stato
        updateDrawingUI(); // Aggiorna UI (bordo e clip-path)
    };

    // Aggiorna solo bordo e clip-path durante il disegno (ritorno void)
    const updateDrawingUI = (): void => {
        const rect: Rect | null = appState.currentRect;
        // Controlla che gli elementi necessari esistano
        if (!rect || !appState.elements.border || !appState.elements.overlay) return;

        if (rect.width > 0 && rect.height > 0) {
            // Posiziona e dimensiona il bordo
            appState.elements.border.style.top = `${rect.top}px`;
            appState.elements.border.style.left = `${rect.left}px`;
            appState.elements.border.style.width = `${rect.width}px`;
            appState.elements.border.style.height = `${rect.height}px`;
            appState.elements.border.style.display = 'block'; // Mostra bordo

            // Crea la stringa per il poligono di clip-path
            const clipCoords: string = `${rect.left}px ${rect.top}px, ${rect.left}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top}px, ${rect.left}px ${rect.top}px`;
            // Applica il clip-path all'overlay (mostra area selezionata trasparente)
            setClipPath(
                appState.elements.overlay,
                `polygon(evenodd, 0 0, 0 100%, 100% 100%, 100% 0, 0 0, ${clipCoords})`
            );
        } else {
            // Se il rettangolo non è valido (width/height 0), nascondi bordo e resetta clip
            appState.elements.border.style.display = 'none';
            setClipPath(appState.elements.overlay, 'none'); // Mostra tutto grigio
        }
    };

    // Mouse Up per terminare disegno (tipo evento MouseEvent)
    const onMouseUp = (_e: MouseEvent): void => {
        if (!appState.isDrawing || appState.currentState !== 'drawing') return;

        appState.isDrawing = false; // Fine disegno
        // Rimuovi listener globali di disegno
        window.removeEventListener('mousemove', throttledOnMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const rect: Rect | null = appState.currentRect;

        // Gestione Click (nessun trascinamento o area nulla)
        if (!rect || rect.width === 0 || rect.height === 0) {
            log('Click rilevato (nessun trascinamento valido), ritorno a idle.');
            appState.currentState = 'idle';
            appState.currentRect = null;
            if (appState.elements.border) appState.elements.border.style.display = 'none'; // Nascondi bordo
            setClipPath(appState.elements.overlay, 'none'); // Mostra tutto grigio

            // Assicura che il blocker sia pronto per un nuovo disegno (rimuovi listener interazione se presente)
            if (appState.elements.blocker) {
                appState.elements.blocker.removeEventListener('mousedown', onInteractionStart);
                appState.elements.blocker.addEventListener('mousedown', onMouseDown); // Assicura listener disegno attivo
            }
            return; // Esce dalla funzione
        }

        // Gestione Dimensione Minima
        const minSize = 50; // Dimensione minima in pixel
        if (rect.width < minSize || rect.height < minSize) {
            log(`Selezione troppo piccola: ${rect.width}x${rect.height}`);
            showToast(`Selezione troppo piccola. Minimo ${minSize}x${minSize}px.`, true);
            cleanup(); // Annulla tutto
            return;
        }

        // --- Selezione Valida Effettuata ---
        appState.currentState = 'selected'; // Passa allo stato 'selected'
        log('Rettangolo selezionato:', rect);

        // Crea o aggiorna elementi UI per lo stato 'selected'
        createOrUpdateSaveButton();
        createOrUpdateHandles();
        updateSelectionUI(); // Assicura che l'UI rifletta il rettangolo finale

        // Configura il blocker per le interazioni (move/resize)
        if (appState.elements.blocker) {
            appState.elements.blocker.removeEventListener('mousedown', onMouseDown); // Rimuovi listener disegno
            appState.elements.blocker.addEventListener('mousedown', onInteractionStart); // Aggiungi listener interazione
            log('Listener per interazione (move/resize) attivato sul blocker.');
        }
    };

    // --- UI Stato Selezionato ---

    // Crea o aggiorna bottone Salva (ritorno void)
    const createOrUpdateSaveButton = (): void => {
        const rect: Rect | null = appState.currentRect;
        if (!rect) return; // Necessario rettangolo

        let btn: HTMLButtonElement | null = appState.elements.saveBtn;
        if (!btn) {
            // Se non esiste, crealo
            btn = document.createElement('button');
            btn.className = 'web-area-saver-save';
            btn.title = 'Salva cattura (\u2713)'; // Checkmark nel titolo
            btn.innerHTML = '&#x2713;'; // Checkmark HTML entity
            btn.setAttribute('aria-label', 'Salva cattura');
            btn.onclick = handleSaveClick; // Aggiungi handler click
            document.body.appendChild(btn);
            appState.elements.saveBtn = btn; // Salva riferimento nello stato
        }

        // Aggiorna posizione (al centro del rettangolo) e visibilità
        const btnSize: number = 32; // Dimensione bottone (da CSS)
        // Arrotonda per evitare subpixel positioning
        btn.style.top = `${Math.round(rect.top + rect.height / 2 - btnSize / 2)}px`;
        btn.style.left = `${Math.round(rect.left + rect.width / 2 - btnSize / 2)}px`;
        btn.style.display = 'flex'; // Mostra bottone
    };

    // Handler click bottone Salva (ritorno void)
    const handleSaveClick = (): void => {
        const rect: Rect | null = appState.currentRect;
        if (!rect || appState.currentState !== 'selected') return;

        log('Click su Salva.');
        log('Nascondo UI prima della cattura...');

        // Nascondi elementi UI temporaneamente
        appState.elements.handles.forEach((h) => {
            if (h) h.style.display = 'none';
        });
        if (appState.elements.saveBtn) appState.elements.saveBtn.style.display = 'none';
        if (appState.elements.border) appState.elements.border.style.display = 'none';

        // Prepara i dati da inviare al background script
        const dataToSend: SelectionPayload = {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            dpr: window.devicePixelRatio || 1, // Includi DPR
        };

        const delayMs: number = 100; // Breve ritardo per permettere all'UI di nascondersi
        log(`Attendo ${delayMs}ms prima di inviare...`);

        setTimeout(() => {
            log('Invio dati al background:', dataToSend);
            try {
                // Invia messaggio al background script usando la costante e i dati tipizzati
                chrome.runtime.sendMessage(
                    { type: MSG_TYPE_SELECTION_COMPLETE, data: dataToSend },
                    (response?: any) => {
                        // Callback opzionale
                        if (chrome.runtime.lastError) {
                            log('Errore invio messaggio:', chrome.runtime.lastError.message);
                            // Potrebbe essere utile mostrare un toast qui se l'invio fallisce subito
                            // showToast(`Errore comunicazione: ${chrome.runtime.lastError.message}`, true);
                        } else {
                            log('Messaggio SELECTION_COMPLETE inviato con successo.', response);
                        }
                    }
                );
            } catch (error: any) {
                log('Eccezione durante sendMessage:', error);
                showToast(`Errore imprevisto estensione: ${error.message}`, true);
            } finally {
                // Cleanup viene eseguito DOPO l'invio (o il tentativo di invio)
                cleanup();
            }
        }, delayMs);
    };

    // --- UI Handle Resize ---

    // Crea un singolo handle (ritorno HTMLDivElement)
    const createHandle = (type: string, cursor: string): HTMLDivElement => {
        const handle: HTMLDivElement = document.createElement('div');
        handle.className = 'web-area-saver-handle';
        handle.dataset.handleType = type; // Salva tipo handle nel dataset
        handle.style.cursor = cursor; // Imposta cursore specifico
        handle.addEventListener('mousedown', onInteractionStart); // Aggiungi listener per resize
        document.body.appendChild(handle);
        return handle;
    };

    // Crea o aggiorna tutti gli handle di resize (ritorno void)
    const createOrUpdateHandles = (): void => {
        const rect: Rect | null = appState.currentRect;
        if (!rect) return;

        const handleSizeOffset: number = 5; // Metà dimensione handle (10px / 2)

        // Definisci posizioni e cursori per ogni handle
        // Usiamo un tipo mappato per maggiore sicurezza
        const positions: { [key: string]: { top: number; left: number; cursor: string } } = {
            'top-left': { top: rect.top - handleSizeOffset, left: rect.left - handleSizeOffset, cursor: 'nwse-resize' },
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
            // Aggiungere altri handle (es. laterali) qui se necessario
        };

        // Se gli handle non sono stati creati, creali ora
        if (appState.elements.handles.length === 0) {
            appState.elements.handles = Object.keys(positions).map((type: string) => {
                const pos = positions[type];
                return createHandle(type, pos.cursor);
            });
        }

        // Aggiorna posizione e visibilità di ogni handle esistente
        appState.elements.handles.forEach((handle: HTMLDivElement) => {
            const type: string | undefined = handle.dataset.handleType;
            if (!type) return; // Salta se manca data attribute

            const pos = positions[type]; // Trova dati posizione
            if (pos) {
                handle.style.top = `${Math.round(pos.top)}px`;
                handle.style.left = `${Math.round(pos.left)}px`;
                handle.style.display = 'block'; // Rendi visibile
            } else {
                handle.style.display = 'none'; // Nascondi se tipo non trovato (improbabile)
            }
        });
    };

    // Aggiorna tutta l'UI relativa alla selezione (bordo, overlay, handle, bottone)
    const updateSelectionUI = (): void => {
        const rect: Rect | null = appState.currentRect;
        // Controlla elementi base necessari
        if (!rect || !appState.elements.border || !appState.elements.overlay) return;

        log('Aggiornamento UI selezione:', rect);

        // 1. Aggiorna bordo
        appState.elements.border.style.top = `${rect.top}px`;
        appState.elements.border.style.left = `${rect.left}px`;
        appState.elements.border.style.width = `${rect.width}px`;
        appState.elements.border.style.height = `${rect.height}px`;
        appState.elements.border.style.display = 'block'; // Assicura sia visibile

        // 2. Aggiorna clip-path overlay
        const clipCoords: string = `${rect.left}px ${rect.top}px, ${rect.left}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top}px, ${rect.left}px ${rect.top}px`;
        setClipPath(appState.elements.overlay, `polygon(evenodd, 0 0, 0 100%, 100% 100%, 100% 0, 0 0, ${clipCoords})`);

        // 3. Aggiorna (o crea/aggiorna) Handle e Bottone Salva
        createOrUpdateHandles();
        createOrUpdateSaveButton();
    };

    // --- Logica Interazioni (Move/Resize post-selezione) ---

    // Mouse Down su Blocker (per move) o Handle (per resize) (tipo evento MouseEvent)
    const onInteractionStart = (e: MouseEvent): void => {
        // Attivo solo in stato 'selected' e con tasto sinistro
        if (appState.currentState !== 'selected' || e.button !== 0) {
            log(`onInteractionStart ignorato (stato: ${appState.currentState}, bottone: ${e.button})`);
            return;
        }

        const target: EventTarget | null = e.target; // Elemento cliccato
        const rect: Rect | null = appState.currentRect; // Rettangolo corrente

        let interactionType: 'move' | 'resize' | null = null;
        let handleType: string | null = null;

        // Verifica se il target è un handle di resize
        if (target && target instanceof HTMLElement && target.classList.contains('web-area-saver-handle')) {
            interactionType = 'resize';
            handleType = target.dataset.handleType || null; // Leggi tipo handle da dataset
            document.body.style.cursor = target.style.cursor; // Imposta cursore resize specifico
            log(`Inizio resize (handle: ${handleType})`);
        }
        // Verifica se il target è il blocker DENTRO l'area selezionata (per move)
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
            document.body.style.cursor = 'move'; // Imposta cursore move
            log('Inizio spostamento.');
        } else {
            // Click fuori dall'area attiva (su overlay, bottone cancel, etc.) -> nessuna interazione
            log('Click fuori area attiva, nessuna interazione avviata.');
            return;
        }

        e.preventDefault(); // Impedisce selezione testo etc.

        // Salva stato iniziale interazione
        appState.interaction.type = interactionType;
        appState.interaction.handle = handleType;
        appState.interaction.startX = e.clientX;
        appState.interaction.startY = e.clientY;
        // Salva una COPIA del rettangolo iniziale (se esiste)
        appState.interaction.initialRect = rect ? { ...rect } : null;

        // Aggiungi listener globali per movimento e rilascio
        window.addEventListener('mousemove', throttledOnInteractionMove);
        window.addEventListener('mouseup', onInteractionEnd);
    };

    // Mouse Move durante interazione (move/resize) (tipo evento MouseEvent)
    const onInteractionMove = (e: MouseEvent): void => {
        const { type, handle, startX, startY, initialRect } = appState.interaction;

        // Se non c'è interazione attiva o rettangolo iniziale, esci
        if (!type || !initialRect) return;

        const dx: number = e.clientX - startX; // Delta X
        const dy: number = e.clientY - startY; // Delta Y
        let newRect: Rect = { ...initialRect }; // Lavora su una copia

        if (type === 'move') {
            // Sposta il rettangolo
            newRect.top = initialRect.top + dy;
            newRect.left = initialRect.left + dx;
            // TODO: Aggiungere limiti viewport se necessario
        } else if (type === 'resize') {
            // Ridimensiona in base all'handle cliccato
            const minSize: number = 50; // Dimensione minima

            // Logica specifica per ogni handle
            switch (handle) {
                case 'top-left': {
                    const tempWidth = initialRect.width - dx;
                    const tempHeight = initialRect.height - dy;
                    // Applica dimensione minima e calcola nuova L/T di conseguenza
                    newRect.width = Math.max(minSize, tempWidth);
                    newRect.height = Math.max(minSize, tempHeight);
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
                    newRect.left = initialRect.left + initialRect.width - newRect.width;
                    // Top non cambia
                    break;
                }
                case 'bottom-right': {
                    newRect.width = Math.max(minSize, initialRect.width + dx);
                    newRect.height = Math.max(minSize, initialRect.height + dy);
                    // Top e Left non cambiano
                    break;
                }
                // Aggiungere altri casi per handle laterali se implementati
            }
        }

        // Aggiorna lo stato con il nuovo rettangolo (arrotondato)
        appState.currentRect = {
            top: Math.round(newRect.top),
            left: Math.round(newRect.left),
            width: Math.round(newRect.width),
            height: Math.round(newRect.height),
        };

        // Aggiorna l'UI per riflettere le modifiche
        updateSelectionUI();
    };

    // Mouse Up per terminare interazione (move/resize) (ritorno void)
    const onInteractionEnd = (): void => {
        // Se non c'era interazione attiva, non fare nulla
        if (!appState.interaction.type) return;

        const interactionEndedType: string = appState.interaction.type; // Salva tipo per log
        log(`Fine ${interactionEndedType}.`);

        // Rimuovi listener globali di interazione
        window.removeEventListener('mousemove', throttledOnInteractionMove);
        window.removeEventListener('mouseup', onInteractionEnd);

        // Resetta stato interazione
        appState.interaction.type = null;
        appState.interaction.handle = null;
        appState.interaction.initialRect = null;
        // Lo stato generale rimane 'selected'

        // Ripristina cursori
        document.body.style.cursor = 'default'; // Cursore body
        if (appState.elements.blocker) {
            // Il blocker torna ad avere 'crosshair'
            appState.elements.blocker.style.cursor = 'crosshair';
        }
        // Gli handle aggiornano il loro cursore tramite createOrUpdateHandles/updateSelectionUI
        createOrUpdateHandles(); // Assicura che gli handle siano posizionati correttamente
    };

    // --- Inizializzazione Finale ---

    // Definisci limite throttle
    const THROTTLE_LIMIT_MS: number = 30; // ms

    // Crea versioni throttled dei gestori di movimento (dopo che le originali sono definite)
    const throttledOnMouseMove = simpleThrottle(onMouseMove, THROTTLE_LIMIT_MS);
    const throttledOnInteractionMove = simpleThrottle(onInteractionMove, THROTTLE_LIMIT_MS);

    // Imposta stato attivo e crea UI iniziale
    // --- NON attivare l'UI qui ---
    // appState.isActive = true; // Rimosso
    // createUI(); // Rimosso
    // window.addEventListener('keydown', onKeyDown); // Rimosso
    // log('Interfaccia inizializzata. Stato: idle.'); // Rimosso

    log('Content script caricato e in ascolto.'); // Log generico al caricamento
})(); // --- Fine IIFE ---

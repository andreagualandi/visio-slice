// src/newtab/newtab.ts

// Importa stili SCSS come modulo
import styles from './newtab.module.scss';

// Importa utility e costanti condivise (percorsi aggiornati, senza .ts)
import { storageGet, storageSet, storageRemove } from '../shared/storage.util';
import { STORAGE_KEY_LAYOUT_PREFERENCE, STORAGE_KEY_PREFIX_CAPTURE } from '../shared/constants';
import { formatTimestamp, formatBytes } from '../shared/format.util';
import { showModal, hideModal, updateWorkspaceMessageVisibility } from '../shared/ui.helpers';

// --- Interfaccia per i dati recuperati dallo storage ---
interface StoredItemData {
    thumb: string; // Data URL miniatura
    full: string;  // Data URL immagine completa
}

// --- Riferimenti Elementi DOM Principali (Tipizzati) ---
const sidebarListElement: HTMLElement | null = document.getElementById('sidebar-content');
const workspaceContentElement: HTMLElement | null = document.getElementById('workspace-content');
const workspaceMessageElement: HTMLParagraphElement | null = document.getElementById('workspace-message') as HTMLParagraphElement | null;
const sidebarLoadingElement: HTMLParagraphElement | null = document.getElementById('sidebar-loading') as HTMLParagraphElement | null;
const modalOverlay: HTMLElement | null = document.getElementById('deleteConfirmationModal');
const modalConfirmBtn: HTMLButtonElement | null = document.getElementById('modalConfirmBtn') as HTMLButtonElement | null;
const modalCancelBtn: HTMLButtonElement | null = document.getElementById('modalCancelBtn') as HTMLButtonElement | null;
const percentSlider: HTMLInputElement | null = document.getElementById('columnPercentSlider') as HTMLInputElement | null;
const percentDisplay: HTMLSpanElement | null = document.getElementById('sliderValueDisplay') as HTMLSpanElement | null;
const storageInfoElement: HTMLDivElement | null = document.getElementById('storage-info') as HTMLDivElement | null;

// --- Stato Applicazione (Tipizzato) ---
let allFetchedItems: { [key: string]: StoredItemData } = {}; // Cache locale dei dati
let itemToDeleteId: string | null = null; // ID per la modale di conferma

// --- Funzioni di Rendering (Tipizzate e con CSS Modules corretti) ---

/**
 * Crea e restituisce l'elemento DOM per un item nella sidebar.
 */
function renderSidebarItem(key: string, itemData: StoredItemData): HTMLDivElement {
    const sidebarItem = document.createElement('div');
    // Usa notazione a parentesi quadre per classi kebab-case
    sidebarItem.className = styles['sidebar-item'];
    sidebarItem.dataset.id = key;

    const imgElement = document.createElement('img');
    imgElement.src = itemData.thumb;
    imgElement.alt = `Miniatura ${formatTimestamp(key)}`;
    imgElement.loading = 'lazy';

    const textElement = document.createElement('span');
    textElement.textContent = formatTimestamp(key);

    const deleteButton = document.createElement('button');
    // Usa notazione a parentesi quadre
    deleteButton.className = styles['delete-btn'];
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Elimina definitivamente';
    deleteButton.setAttribute('aria-label', 'Elimina cattura');
    deleteButton.type = 'button';

    sidebarItem.appendChild(imgElement);
    sidebarItem.appendChild(textElement);
    sidebarItem.appendChild(deleteButton);
    return sidebarItem;
}

/**
 * Crea e restituisce l'elemento DOM per un'immagine nel workspace.
 */
function renderWorkspaceImage(key: string, itemData: StoredItemData): HTMLDivElement {
    const container = document.createElement('div');
    // Usa notazione a parentesi quadre
    container.className = styles['workspace-image-container'];
    container.dataset.id = key;

    const imgElement = document.createElement('img');
    imgElement.src = itemData.full;
    imgElement.alt = `Cattura completa del ${formatTimestamp(key)}`;
    imgElement.loading = 'lazy';

    const closeButton = document.createElement('button');
    // Usa notazione a parentesi quadre
    closeButton.className = styles['close-btn'];
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Chiudi immagine';
    closeButton.setAttribute('aria-label', 'Chiudi immagine');
    closeButton.type = 'button';

    container.appendChild(imgElement);
    container.appendChild(closeButton);
    return container;
}

/**
 * Ottiene le informazioni sull'utilizzo dello storage e aggiorna l'elemento DOM.
 */
async function displayStorageInfo(): Promise<void> {
    if (!chrome?.storage?.local?.getBytesInUse) {
        console.warn("API chrome.storage.local.getBytesInUse() non disponibile.");
        if (storageInfoElement) storageInfoElement.textContent = "Info storage non disponibili.";
        return;
    }
    if (!storageInfoElement) {
        console.warn("Elemento DOM #storage-info non trovato.");
        return;
    }
    try {
        const usageInBytes: number = await chrome.storage.local.getBytesInUse();
        storageInfoElement.textContent = `Storage: ${formatBytes(usageInBytes)} usati`;
    } catch (error: any) {
        console.error("Errore durante il calcolo dello spazio usato:", error);
        if (storageInfoElement) storageInfoElement.textContent = "Errore nel caricare info storage.";
    }
}

// --- Funzioni Logica Applicativa (Tipizzate) ---

/**
 * Aggiunge un'immagine selezionata al workspace.
 */
function addImageToWorkspace(key: string): void {
    if (allFetchedItems[key]?.full && workspaceContentElement) {
        const imageContainer = renderWorkspaceImage(key, allFetchedItems[key]);
        workspaceContentElement.appendChild(imageContainer);
        updateWorkspaceMessageVisibility(
            'workspace-content',
            'workspace-message',
            // Passa selettore corretto con classe modulo kebab-case
            `.${styles['workspace-image-container']}`
        );
    } else {
        if (!workspaceContentElement) console.error("Elemento workspace-content non trovato.");
        if (!allFetchedItems[key]?.full) console.error(`Dati immagine completa non trovati per ${key}`);
        alert(`Errore: Impossibile caricare l'immagine ${key}.`);
    }
}

/**
 * Inizializza la logica dello slider per la larghezza delle colonne.
 */
async function initializeLayoutSlider(): Promise<void> {
    if (!percentSlider || !percentDisplay || !workspaceContentElement) {
        console.warn("Elementi slider layout non trovati.");
        return;
    }
    const wsContent = workspaceContentElement;

    const applyMinPercent = (percentValue: string): void => {
        if (percentDisplay) percentDisplay.textContent = percentValue;
        wsContent.style.setProperty('--min-column-percent', `${percentValue}%`);
        // console.log(`Applicata --min-column-percent: ${percentValue}%`); // Log meno verboso
    };

    const savePercentPreference = async (percentValue: string): Promise<void> => {
        try {
            await storageSet({ [STORAGE_KEY_LAYOUT_PREFERENCE]: parseInt(percentValue, 10) });
            // console.log(`Preferenza layout salvata: ${percentValue}%`);
        } catch (error: any) {
            console.error("Errore salvataggio preferenza layout:", error);
        }
    };

    try {
        const items = await storageGet(STORAGE_KEY_LAYOUT_PREFERENCE);
        const savedValue: number | undefined = items[STORAGE_KEY_LAYOUT_PREFERENCE];
        const initialValue: string = (savedValue ?? percentSlider.value).toString();
        percentSlider.value = initialValue;
        applyMinPercent(initialValue);
    } catch (error: any) {
        console.error("Errore caricamento preferenza layout:", error);
        applyMinPercent(percentSlider.value);
    }

    percentSlider.addEventListener('input', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target) applyMinPercent(target.value);
    });
    percentSlider.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target) savePercentPreference(target.value);
    });
    // console.log("Slider layout inizializzato."); // Log meno verboso
}

/**
 * Carica i dati iniziali dallo storage e popola la sidebar.
 */
async function loadInitialData(): Promise<void> {
    if (!sidebarListElement) {
        console.error("Elemento #sidebar-content non trovato. Impossibile caricare dati.");
        return;
    }
    const sidebarList = sidebarListElement;

    try {
        const items: { [key: string]: any } = await storageGet(null);
        allFetchedItems = Object.entries(items)
            .filter(([key, value]) =>
                key.startsWith(STORAGE_KEY_PREFIX_CAPTURE) &&
                typeof value === 'object' && value !== null &&
                'thumb' in value && 'full' in value
            )
            .reduce((acc, [key, value]) => {
                acc[key] = value as StoredItemData;
                return acc;
            }, {} as { [key: string]: StoredItemData });

        const captureKeys: string[] = Object.keys(allFetchedItems)
            .sort((a, b) =>
                (parseInt(b.substring(STORAGE_KEY_PREFIX_CAPTURE.length), 10) || 0) -
                (parseInt(a.substring(STORAGE_KEY_PREFIX_CAPTURE.length), 10) || 0)
            );

        sidebarLoadingElement?.remove();
        sidebarList.innerHTML = '';

        if (captureKeys.length === 0) {
            const messageP = document.createElement('p');
            // Usa notazione a parentesi quadre
            messageP.className = styles['sidebar-message'];
            messageP.textContent = "Nessuna cattura salvata.";
            sidebarList.appendChild(messageP);
        } else {
            captureKeys.forEach(key => {
                const itemData = allFetchedItems[key];
                const sidebarItemElement = renderSidebarItem(key, itemData);
                sidebarList.appendChild(sidebarItemElement);
            });
        }
        updateWorkspaceMessageVisibility(
            'workspace-content',
            'workspace-message',
            // Usa notazione a parentesi quadre
            `.${styles['workspace-image-container']}`
        );
        setupEventListeners();
        console.log(`Caricate ${captureKeys.length} catture.`);
    } catch (error: any) {
        console.error("Errore grave durante caricamento dati iniziali:", error);
        sidebarLoadingElement?.remove();
        sidebarList.innerHTML = '';
        const errorP = document.createElement('p');
        // Usa notazione a parentesi quadre
        errorP.className = styles['sidebar-message'];
        errorP.style.color = 'red';
        errorP.textContent = "Errore caricamento catture.";
        sidebarList.appendChild(errorP);
        if (workspaceMessageElement) workspaceMessageElement.textContent = "Impossibile caricare le catture salvate.";
    }
}

// --- Gestori di Eventi Specifici (Tipizzati e con CSS Modules corretti) ---

/**
 * Gestisce il click su un item nella sidebar.
 */
function handleSidebarItemClick(itemId: string): void {
    // console.log("Click su sidebar item:", itemId); // Log meno verboso
    if (!workspaceContentElement || !sidebarListElement) return;

    // Usa data attribute per selezionare, più robusto dei selettori di classe hashati
    const workspaceImage: Element | null = workspaceContentElement.querySelector(`[data-id="${itemId}"]`);
    const sidebarItem: Element | null = sidebarListElement.querySelector(`[data-id="${itemId}"]`);

    if (!sidebarItem) {
        console.error(`Sidebar item [data-id="${itemId}"] non trovato.`);
        return;
    }

    if (workspaceImage) {
        // console.log(`Immagine ${itemId} già presente. Rimuovo.`);
        handleWorkspaceItemCloseClick(itemId);
    } else {
        // console.log(`Immagine ${itemId} non presente. Aggiungo.`);
        addImageToWorkspace(itemId);
        if (sidebarItem instanceof HTMLElement) { // Verifica tipo prima di accedere a dataset
            sidebarItem.dataset.selected = 'true';
        }
    }
}

/**
 * Gestisce il click sul bottone elimina di un item nella sidebar.
 */
function handleSidebarItemDeleteClick(itemId: string): void {

    itemToDeleteId = itemId;
    const itemTimestamp: string = formatTimestamp(itemId);

    showModal(
        'deleteConfirmationModal',
        `Sei sicuro di voler eliminare la cattura del ${itemTimestamp}?`,
        'modalMessage'
    );
}

/**
 * Gestisce la chiusura di un'immagine dal workspace.
 */
function handleWorkspaceItemCloseClick(itemId: string): void {
    // console.log("Rimozione immagine da workspace:", itemId); // Log meno verboso
    if (!workspaceContentElement || !sidebarListElement) return;

    const containerToRemove: Element | null = workspaceContentElement.querySelector(`[data-id="${itemId}"]`);
    if (containerToRemove) {
        containerToRemove.remove();

        const sidebarItem: Element | null = sidebarListElement.querySelector(`[data-id="${itemId}"]`);
        if (sidebarItem instanceof HTMLElement) {
            delete sidebarItem.dataset.selected;
        }
        updateWorkspaceMessageVisibility(
            'workspace-content',
            'workspace-message',
            // Usa notazione a parentesi quadre
            `.${styles['workspace-image-container']}`
        );
    } else {
        console.warn(`Immagine [data-id="${itemId}"] non trovata nel workspace.`);
    }
}

/**
 * Gestisce la conferma di eliminazione dalla modale.
 */
async function handleModalConfirm(): Promise<void> {
    if (!itemToDeleteId) return;
    const idToDelete: string = itemToDeleteId;
    // console.log(`Conferma eliminazione: ${idToDelete}`);

    hideModal();
    itemToDeleteId = null;

    try {
        await storageRemove(idToDelete);
        // console.log(`Elemento ${idToDelete} rimosso.`);
        delete allFetchedItems[idToDelete];

        sidebarListElement?.querySelector(`[data-id="${idToDelete}"]`)?.remove();
        workspaceContentElement?.querySelector(`[data-id="${idToDelete}"]`)?.remove();

        if (sidebarListElement && sidebarListElement.children.length === 0) {
            const messageP = document.createElement('p');
            // Usa notazione a parentesi quadre
            messageP.className = styles['sidebar-message'];
            messageP.textContent = "Nessuna cattura salvata.";
            sidebarListElement.appendChild(messageP);
        }
        updateWorkspaceMessageVisibility(
            'workspace-content',
            'workspace-message',
            // Usa notazione a parentesi quadre
            `.${styles['workspace-image-container']}`
        );
        await displayStorageInfo();

    } catch (error: any) {
        console.error(`Errore eliminazione ${idToDelete}:`, error);
        alert(`Errore durante l'eliminazione: ${error.message}`);
    }
}

/**
 * Gestisce l'annullamento dalla modale.
 */
function handleModalCancel(): void {
    // console.log("Eliminazione annullata.");
    hideModal();
    itemToDeleteId = null;
}

// --- Impostazione Listener Principali (con CSS Modules corretti) ---
function setupEventListeners(): void {
    // Listener Sidebar (Delegazione Eventi)
    sidebarListElement?.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as Element;
        console.log("Sidebar click target:", target);
        // Usa selettore di classe modulo per trovare il bottone
        const deleteButtonTarget = target.closest(`.${styles['delete-btn']}`);
        console.log("Delete button target found:", deleteButtonTarget);
        // Usa data attribute per trovare l'item (più robusto)
        const sidebarItemTarget = target.closest<HTMLElement>(`[data-id^="${STORAGE_KEY_PREFIX_CAPTURE}"]`); // Trova l'elemento con data-id che inizia con il prefisso
        console.log("Sidebar item target found:", sidebarItemTarget);
        console.log("Sidebar item data-id:", sidebarItemTarget?.dataset.id);
        if (deleteButtonTarget && sidebarItemTarget?.dataset.id) {
            console.log("DELETE BUTTON LOGIC TRIGGERED for item:", sidebarItemTarget.dataset.id);
            event.stopPropagation();
            handleSidebarItemDeleteClick(sidebarItemTarget.dataset.id);
        }
        else if (sidebarItemTarget?.dataset.id) {
            console.log("SIDEBAR ITEM CLICK LOGIC TRIGGERED for item:", sidebarItemTarget.dataset.id);
            handleSidebarItemClick(sidebarItemTarget.dataset.id);
        }
        else {
            // Log 7: Non abbiamo riconosciuto né un bottone né un item cliccabile
            console.log("Click inside sidebar list but not on a recognized target.");
        }
    });

    // Listener Workspace (Delegazione Eventi)
    workspaceContentElement?.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as Element;
        // Usa selettore di classe modulo per trovare il bottone
        const closeButton = target.closest(`.${styles['close-btn']}`);
        if (closeButton) {
            // Usa selettore di classe modulo per trovare il container
            const container = closeButton.closest<HTMLElement>(`.${styles['workspace-image-container']}`);
            if (container?.dataset.id) { // Verifica che container esista e abbia dataset.id
                handleWorkspaceItemCloseClick(container.dataset.id);
            }
        }
    });

    // Listener modale
    modalConfirmBtn?.addEventListener('click', handleModalConfirm);
    modalCancelBtn?.addEventListener('click', handleModalCancel);

    // Listener overlay modale
    modalOverlay?.addEventListener('click', (event: MouseEvent) => {
        if (event.target === modalOverlay) {
            handleModalCancel();
        }
    });

    // console.log("Event listener impostati."); // Log meno verboso
}

// --- Inizializzazione all'Avvio ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Web Area Saver (New Tab): DOM Caricato. Applicazione classi modulo statiche...");

    // Seleziona e applica classi modulo agli elementi statici dell'HTML
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.className = styles['app-container'];

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const sidebarHeader = sidebar.querySelector('.sidebar-header');
        if (sidebarHeader) sidebarHeader.className = styles['sidebar-header'];

        const sidebarSection = sidebar.querySelector('.sidebar-section');
        if (sidebarSection) sidebarSection.className = styles['sidebar-section'];

        const sidebarList = document.getElementById('sidebar-content');
        // Usa classList.add per non rimuovere eventuali altre classi (anche se qui non ce ne sono)
        if (sidebarList) sidebarList.classList.add(styles['sidebar-list']);

        const sidebarLoadingMsg = document.getElementById('sidebar-loading');
        if (sidebarLoadingMsg) sidebarLoadingMsg.className = styles['sidebar-message'];

        const sidebarFooter = sidebar.querySelector('.sidebar-footer');
        if (sidebarFooter) sidebarFooter.className = styles['sidebar-footer'];
    }

    // Modale
    const modalOverlayStatic = document.getElementById('deleteConfirmationModal');
    if (modalOverlayStatic) {
        modalOverlayStatic.className = styles['modal-overlay'];

        const modalContentStatic = modalOverlayStatic.querySelector('.modal-content');
        if (modalContentStatic instanceof HTMLElement) modalContentStatic.className = styles['modal-content'];

        const modalActionsStatic = modalOverlayStatic.querySelector('.modal-actions');
        if (modalActionsStatic instanceof HTMLElement) modalActionsStatic.className = styles['modal-actions'];

        // Bottoni modale (assumendo che .button, .confirm, .cancel siano classi globali o definite nel modulo senza trattini)
        const modalConfirmBtnStatic = document.getElementById('modalConfirmBtn');
        if (modalConfirmBtnStatic) {
            modalConfirmBtnStatic.classList.remove('button', 'confirm'); // Rimuovi vecchie classi se non sono più usate globalmente
            modalConfirmBtnStatic.classList.add(styles['button'], styles['confirm']); // Aggiungi classi modulo (se definite come .button e .confirm in scss)
        }

        const modalCancelBtnStatic = document.getElementById('modalCancelBtn');
        if (modalCancelBtnStatic) {
            modalCancelBtnStatic.classList.remove('button', 'cancel'); // Rimuovi vecchie classi se non sono più usate globalmente
            modalCancelBtnStatic.classList.add(styles['button'], styles['cancel']); // Aggiungi classi modulo (se definite come .button e .cancel in scss)
        }
    }

    // --- Continua con l'inizializzazione logica ---
    console.log("Web Area Saver (New Tab): Inizializzazione logica...");
    if (!sidebarListElement || !workspaceContentElement || !workspaceMessageElement) {
        console.error("Elementi UI principali mancanti. Impossibile inizializzare.");
        document.body.innerHTML = '<p style="color: red; padding: 20px;">Errore: Elementi UI principali mancanti.</p>';
        return;
    }

    initializeLayoutSlider();
    loadInitialData();
    displayStorageInfo();
});
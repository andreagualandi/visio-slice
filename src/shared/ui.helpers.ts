// src/shared/ui-helpers.util.ts

/**
 * Mostra un elemento modale (overlay). Opzionalmente imposta un messaggio.
 * @param modalId L'ID dell'elemento overlay della modale (default: 'deleteConfirmationModal').
 * @param message Optional: Messaggio specifico da mostrare nella modale (default: null).
 * @param messageElementId Optional: ID dell'elemento <p> (o simile) dove mostrare il messaggio (default: 'modalMessage').
 */
export function showModal(
    modalId: string = 'deleteConfirmationModal',
    message: string | null = null,
    messageElementId: string = 'modalMessage'
): void {
    console.log(
        `showModal called: modalId=<span class="math-inline">\{modalId\}, message\=</span>{message}, messageElementId=${messageElementId}`
    );
    // Trova l'elemento overlay della modale
    const modalOverlay: HTMLElement | null = document.getElementById(modalId);
    console.log('Modal overlay found in DOM:', modalOverlay);
    if (modalOverlay) {
        // Se è stato fornito un messaggio e un ID per l'elemento del messaggio...
        if (message && messageElementId) {
            // Trova l'elemento del messaggio *all'interno* della modale
            const msgElement: HTMLElement | null = modalOverlay.querySelector(`#${messageElementId}`);
            if (msgElement) {
                // Imposta il contenuto testuale dell'elemento del messaggio
                msgElement.textContent = message;
            } else {
                console.warn(`Elemento messaggio con ID '${messageElementId}' non trovato dentro #${modalId}.`);
            }
        }
        // Rendi visibile la modale aggiungendo la classe 'visible'
        modalOverlay.classList.add('visible');
        console.log('Modal should be visible now.');
    } else {
        console.error(`Elemento modale con ID '${modalId}' non trovato.`);
    }
}

/**
 * Nasconde un elemento modale (overlay).
 * @param modalId L'ID dell'elemento overlay della modale (default: 'deleteConfirmationModal').
 */
export function hideModal(modalId: string = 'deleteConfirmationModal'): void {
    // Trova l'elemento overlay della modale
    const modalOverlay: HTMLElement | null = document.getElementById(modalId);

    if (modalOverlay) {
        // Nascondi la modale rimuovendo la classe 'visible'
        modalOverlay.classList.remove('visible');
        // Aggiorna attributi ARIA se usati
        // modalOverlay.setAttribute('aria-hidden', 'true');
    }
    // Nota: l'eventuale stato associato (es. itemToDeleteId nel codice newtab.js)
    // non viene resettato qui, ma nel chiamante che gestisce la logica.
}

/**
 * Aggiorna la visibilità di un messaggio placeholder (es. nel workspace)
 * in base alla presenza di elementi figli in un contenitore.
 * @param containerId ID del contenitore degli elementi (es. 'workspace-content').
 * @param messageElementId ID dell'elemento <p> (o simile) del messaggio placeholder (es. 'workspace-message').
 * @param itemSelector Selettore CSS per contare gli elementi rilevanti nel contenitore (es. '.workspace-image-container').
 */
export function updateWorkspaceMessageVisibility(
    containerId: string = 'workspace-content',
    messageElementId: string = 'workspace-message',
    itemSelector: string = '.workspace-image-container' // Aggiunto parametro per flessibilità
): void {
    const containerElement: HTMLElement | null = document.getElementById(containerId);
    const messageElement: HTMLElement | null = document.getElementById(messageElementId);

    if (containerElement && messageElement) {
        // Conta gli elementi nel contenitore che corrispondono al selettore specificato
        const itemCount: number = containerElement.querySelectorAll(itemSelector).length;
        // Mostra il messaggio se il conteggio è 0, altrimenti nascondilo
        messageElement.style.display = itemCount === 0 ? 'block' : 'none';
    } else {
        if (!containerElement) console.error(`Elemento contenitore '${containerId}' non trovato.`);
        if (!messageElement) console.error(`Elemento messaggio '${messageElementId}' non trovato.`);
        console.error(`Impossibile aggiornare la visibilità del messaggio.`);
    }
}

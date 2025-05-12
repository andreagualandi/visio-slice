// popup.ts
import '../index.css';
import { START_CAPTURE_REQUEST } from '../shared/constants';
const startCaptureBtn = document.getElementById('startCaptureBtn');
const viewCapturesBtn = document.getElementById('viewCapturesBtn');

// Bottone "Avvia Cattura"
startCaptureBtn?.addEventListener('click', () => {
    console.log('Popup: Richiesta avvio cattura...');
    // Invia un messaggio al background script per avviare la cattura
    // sulla scheda attiva corrente.
    chrome.runtime
        .sendMessage({ type: START_CAPTURE_REQUEST })
        .then(() => console.log('Popup: Messaggio START_CAPTURE_REQUEST inviato.'))
        .catch((err) => console.error('Popup: Errore invio messaggio:', err));
    // Chiudi il popup dopo aver inviato il messaggio (opzionale)
    window.close();
});

// Bottone "Vedi Catture"
viewCapturesBtn?.addEventListener('click', () => {
    console.log('Popup: Richiesta apertura galleria...');
    // Costruisci l'URL della pagina della galleria (ex index.html)
    const galleryUrl = chrome.runtime.getURL('src/gallery/index.html');
    // Apri la pagina in una nuova scheda
    chrome.tabs.create({ url: galleryUrl });
    // Chiudi il popup (opzionale)
    window.close();
});

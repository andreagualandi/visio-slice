// src/shared/image.util.ts

interface CropRect {
    top: number;
    left: number;
    width: number;
    height: number;
    dpr?: number; // Device Pixel Ratio (opzionale)
}

/**
 * Ritaglia un'immagine (data URL) usando le coordinate specificate.
 * @param sourceDataUrl La Data URL dell'immagine originale.
 * @param cropRect Oggetto con { top, left, width, height, dpr? }.
 * @returns Una Promise che risolve con la Data URL dell'immagine ritagliata (PNG).
 * @throws Error se il ritaglio fallisce per qualsiasi motivo.
 */
export async function cropImage(sourceDataUrl: string, cropRect: CropRect): Promise<string> {
    // Usa DPR fornito o default a 1
    const dpr: number = cropRect.dpr || 1;
    console.log('Avvio ritaglio con coordinate:', cropRect, 'e DPR:', dpr);

    try {
        // 1. Carica l'immagine sorgente in un ImageBitmap
        const response: Response = await fetch(sourceDataUrl);
        if (!response.ok) {
            throw new Error(`Workspace immagine fallito: ${response.statusText} (${response.status})`);
        }
        const imageBlob: Blob = await response.blob();
        const imageBitmap: ImageBitmap = await createImageBitmap(imageBlob);

        // Calcola coordinate sorgente in DEVICE PIXELS
        // Moltiplica le coordinate CSS per il DPR
        const sx: number = Math.max(0, cropRect.left * dpr);
        const sy: number = Math.max(0, cropRect.top * dpr);
        // Assicura che le dimensioni sorgente non eccedano la bitmap
        const sWidth: number = Math.max(1, Math.min(cropRect.width * dpr, imageBitmap.width - sx));
        const sHeight: number = Math.max(1, Math.min(cropRect.height * dpr, imageBitmap.height - sy));

        // Le dimensioni dell'output canvas sono quelle del ritaglio in device pixels
        const outputWidth: number = sWidth;
        const outputHeight: number = sHeight;

        console.log(`Rettangolo sorgente da bitmap (device px): x=${sx}, y=${sy}, w=${sWidth}, h=${sHeight}`);
        console.log(`Dimensioni canvas output (device px): w=${outputWidth}, h=${outputHeight}`);

        if (sWidth <= 0 || sHeight <= 0) {
            console.warn(`Dimensioni ritaglio non valide o troppo piccole: w=${sWidth}, h=${sHeight}.`);
            throw new Error(`Dimensioni ritaglio non valide calcolate: w=${sWidth}, h=${sHeight}`);
        }

        // 3. Crea un OffscreenCanvas con le dimensioni del RITAGLIO (in device pixels)
        const canvas: OffscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight);
        const ctx: OffscreenCanvasRenderingContext2D | null = canvas.getContext('2d');

        if (!ctx) {
            throw new Error("Impossibile ottenere il contesto 2D dall'OffscreenCanvas per il ritaglio.");
        }

        // 4. Disegna la porzione ritagliata dall'immagine sorgente sul nuovo canvas
        // ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        ctx.drawImage(
            imageBitmap,
            sx,
            sy,
            sWidth,
            sHeight, // Rettangolo sorgente (dall'immagine originale in device px)
            0,
            0,
            outputWidth,
            outputHeight // Rettangolo destinazione (sul nuovo canvas in device px)
        );

        imageBitmap.close(); // Libera memoria

        // 5. Converti il canvas ritagliato in Blob -> Data URL (PNG)
        const croppedBlob: Blob = await canvas.convertToBlob({ type: 'image/png' });

        // Usa FileReader per convertire Blob in Data URL
        const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // reader.result può essere string | ArrayBuffer | null
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error("FileReader non ha restituito una stringa Data URL per l'immagine ritagliata."));
                }
            };
            reader.onerror = (e) => reject(new Error(`Errore FileReader durante ritaglio: ${e}`)); // FileReader ErrorEvent
            reader.readAsDataURL(croppedBlob);
        });

        console.log('Ritaglio immagine completato.');
        return dataUrl;
    } catch (error: unknown) {
        // Cattura qualsiasi errore
        console.error('Errore dettagliato durante il ritaglio immagine:', error);
        // Rilancia un errore per segnalare il fallimento al chiamante
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Ritaglio immagine fallito: ${message}`);
    }
}

/**
 * Crea una miniatura da una Data URL di immagine.
 * @param imageDataUrl La Data URL dell'immagine originale.
 * @param targetWidth La larghezza desiderata per la miniatura in pixel (CSS).
 * @returns Una Promise che risolve con la Data URL della miniatura (PNG).
 * @throws Error se la creazione della miniatura fallisce.
 */
export async function createThumbnail(imageDataUrl: string, targetWidth: number): Promise<string> {
    console.log(`Avvio creazione miniatura con larghezza target: ${targetWidth}px`);
    let imageBitmap: ImageBitmap | null = null; // Inizializza a null per finally
    try {
        // 1. Fetch della Data URL per ottenere i dati come Blob
        const response: Response = await fetch(imageDataUrl);
        if (!response.ok) throw new Error(`Fetch miniatura fallito: ${response.statusText}`);
        const imageBlob: Blob = await response.blob();

        // 2. Decodifica il Blob in un ImageBitmap
        imageBitmap = await createImageBitmap(imageBlob);
        const originalWidth: number = imageBitmap.width;
        const originalHeight: number = imageBitmap.height;

        if (originalWidth === 0 || originalHeight === 0)
            throw new Error('Dimensioni immagine originale non valide (0).');

        // 3. Calcola l'altezza mantenendo le proporzioni
        const targetHeight: number = Math.round(originalHeight * (targetWidth / originalWidth));

        console.log(`Miniatura: Orig=${originalWidth}x${originalHeight}, Target=${targetWidth}x${targetHeight}`);

        if (targetWidth <= 0 || targetHeight <= 0)
            throw new Error(`Dimensioni miniatura calcolate non valide: ${targetWidth}x${targetHeight}`);

        // 4. Usa OffscreenCanvas per disegnare
        const canvas: OffscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx: OffscreenCanvasRenderingContext2D | null = canvas.getContext('2d');

        if (!ctx) throw new Error('Impossibile ottenere contesto 2D per miniatura.');

        // 5. Disegna l'ImageBitmap ridimensionato sul canvas
        ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
        imageBitmap.close(); // Chiudi qui dopo aver disegnato
        imageBitmap = null; // Resetta variabile

        // 6. Converti il canvas in un Blob PNG
        const thumbnailBlob: Blob = await canvas.convertToBlob({ type: 'image/png' });

        // 7. Converti il Blob in Data URL usando FileReader
        const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('FileReader non ha restituito una stringa Data URL per la miniatura.'));
                }
            };
            reader.onerror = (e) => reject(new Error(`Errore FileReader per miniatura: ${e}`));
            reader.readAsDataURL(thumbnailBlob);
        });

        console.log('Creazione miniatura completata.');
        return dataUrl; // Risolve con la Data URL della miniatura
    } catch (error: unknown) {
        console.error('Errore dettagliato durante creazione miniatura:', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Creazione miniatura fallita: ${message}`);
    } finally {
        // Assicura che il bitmap sia chiuso anche se c'è un errore prima di drawImage/close
        imageBitmap?.close();
    }
}

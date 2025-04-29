// src/shared/image.util.ts

/**
 * Rappresenta il rettangolo di ritaglio di un'immagine.
 */
interface CropRect {
    top: number;
    left: number;
    width: number;
    height: number;
    dpr?: number; // Device Pixel Ratio (opzionale)
}

/**
 * Opzioni per il formato dell'immagine di output
 */
interface ImageOutputOptions {
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number; // 0-1 per JPEG/WEBP, ignorato per PNG
}

// Costanti per la configurazione
const DEFAULT_IMAGE_FORMAT = 'image/png';
const DEFAULT_JPEG_QUALITY = 0.9;

/**
 * Valida le dimensioni di un rettangolo.
 * @param width Larghezza da validare
 * @param height Altezza da validare
 * @returns True se le dimensioni sono valide, altrimenti false
 */
function validateDimensions(width: number, height: number): boolean {
    return width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height);
}

/**
 * Converte un Blob in una Data URL.
 * @param blob Blob da convertire
 * @returns Promise che risolve con una Data URL
 */
async function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('FileReader non ha restituito una stringa Data URL'));
            }
        };
        reader.onerror = (e) => reject(new Error(`Errore FileReader: ${e}`));
        reader.readAsDataURL(blob);
    });
}

/**
 * Carica un'immagine da una data URL e la converte in ImageBitmap.
 * @param dataUrl La Data URL dell'immagine
 * @returns Promise che risolve con un ImageBitmap
 */
async function loadImageFromDataUrl(dataUrl: string): Promise<ImageBitmap> {
    if (!dataUrl?.startsWith('data:')) {
        throw new Error('URL sorgente non valido: deve essere una Data URL');
    }

    const response: Response = await fetch(dataUrl);
    if (!response.ok) {
        throw new Error(`Fetch immagine fallito: ${response.statusText} (${response.status})`);
    }

    const imageBlob: Blob = await response.blob();
    return createImageBitmap(imageBlob);
}

/**
 * Renderizza un'immagine su un canvas e la converte in Data URL.
 * @param renderer Funzione che esegue le operazioni di rendering sul canvas
 * @param width Larghezza del canvas
 * @param height Altezza del canvas
 * @param options Opzioni per il formato dell'immagine di output
 * @returns Promise che risolve con una Data URL
 */
async function renderToDataUrl(
    renderer: (ctx: OffscreenCanvasRenderingContext2D) => void,
    width: number,
    height: number,
    options: ImageOutputOptions = {}
): Promise<string> {
    if (!validateDimensions(width, height)) {
        throw new Error(`Dimensioni canvas non valide: ${width}x${height}`);
    }

    const outputFormat = options.format || DEFAULT_IMAGE_FORMAT;
    const outputQuality =
        options.format === 'image/jpeg' || options.format === 'image/webp'
            ? (options.quality ?? DEFAULT_JPEG_QUALITY)
            : undefined;

    // Crea canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: true });

    if (!ctx) {
        throw new Error("Impossibile ottenere il contesto 2D dall'OffscreenCanvas");
    }

    // Esegui rendering
    renderer(ctx);

    // Converti canvas in blob
    const blob = await canvas.convertToBlob({
        type: outputFormat,
        quality: outputQuality,
    });

    // Converti blob in data URL
    return blobToDataURL(blob);
}

/**
 * Ritaglia un'immagine (data URL) usando le coordinate specificate.
 * @param sourceDataUrl La Data URL dell'immagine originale.
 * @param cropRect Oggetto con { top, left, width, height, dpr? }.
 * @param options Opzioni per il formato dell'immagine di output.
 * @returns Una Promise che risolve con la Data URL dell'immagine ritagliata.
 * @throws Error se il ritaglio fallisce per qualsiasi motivo.
 */
export async function cropImage(
    sourceDataUrl: string,
    cropRect: CropRect,
    options: ImageOutputOptions = {}
): Promise<string> {
    if (!validateDimensions(cropRect.width, cropRect.height)) {
        throw new Error(`Dimensioni ritaglio non valide: ${cropRect.width}x${cropRect.height}`);
    }

    // Usa DPR fornito o quello del dispositivo o default a 1
    const dpr: number = cropRect.dpr || window.devicePixelRatio || 1;
    console.log('Avvio ritaglio con coordinate:', cropRect, 'e DPR:', dpr);

    let imageBitmap: ImageBitmap | null = null;

    try {
        // Carica l'immagine sorgente
        imageBitmap = await loadImageFromDataUrl(sourceDataUrl);

        // Calcola coordinate sorgente in DEVICE PIXELS
        const sx = Math.max(0, Math.round(cropRect.left * dpr));
        const sy = Math.max(0, Math.round(cropRect.top * dpr));

        // Assicura che le dimensioni sorgente non eccedano la bitmap
        const sWidth = Math.max(1, Math.min(Math.round(cropRect.width * dpr), imageBitmap.width - sx));
        const sHeight = Math.max(1, Math.min(Math.round(cropRect.height * dpr), imageBitmap.height - sy));

        // Le dimensioni dell'output canvas sono quelle del ritaglio in device pixels
        const outputWidth = sWidth;
        const outputHeight = sHeight;

        console.log(`Rettangolo sorgente da bitmap (device px): x=${sx}, y=${sy}, w=${sWidth}, h=${sHeight}`);
        console.log(`Dimensioni canvas output (device px): w=${outputWidth}, h=${outputHeight}`);

        // Esegui il rendering del ritaglio
        const finalBitmap = imageBitmap; // Cattura per la closure
        return await renderToDataUrl(
            (ctx) => {
                ctx.drawImage(
                    finalBitmap,
                    sx,
                    sy,
                    sWidth,
                    sHeight, // Rettangolo sorgente
                    0,
                    0,
                    outputWidth,
                    outputHeight // Rettangolo destinazione
                );
            },
            outputWidth,
            outputHeight,
            options
        );
    } catch (error: unknown) {
        console.error('Errore dettagliato durante il ritaglio immagine:', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Ritaglio immagine fallito: ${message}`);
    } finally {
        // Libera memoria
        if (imageBitmap) {
            imageBitmap.close();
        }
    }
}

/**
 * Crea una miniatura da una Data URL di immagine.
 * @param imageDataUrl La Data URL dell'immagine originale.
 * @param targetWidth La larghezza desiderata per la miniatura in pixel (CSS).
 * @param options Opzioni per il formato dell'immagine di output.
 * @returns Una Promise che risolve con la Data URL della miniatura.
 * @throws Error se la creazione della miniatura fallisce.
 */
export async function createThumbnail(
    imageDataUrl: string,
    targetWidth: number,
    options: ImageOutputOptions = {}
): Promise<string> {
    if (!validateDimensions(targetWidth, 1)) {
        throw new Error(`Larghezza miniatura non valida: ${targetWidth}`);
    }

    console.log(`Avvio creazione miniatura con larghezza target: ${targetWidth}px`);

    let imageBitmap: ImageBitmap | null = null;

    try {
        // Carica l'immagine sorgente
        imageBitmap = await loadImageFromDataUrl(imageDataUrl);

        const originalWidth = imageBitmap.width;
        const originalHeight = imageBitmap.height;

        if (!validateDimensions(originalWidth, originalHeight)) {
            throw new Error('Dimensioni immagine originale non valide.');
        }

        // Calcola l'altezza mantenendo le proporzioni
        const targetHeight = Math.round(originalHeight * (targetWidth / originalWidth));

        console.log(`Miniatura: Orig=${originalWidth}x${originalHeight}, Target=${targetWidth}x${targetHeight}`);

        // Esegui il rendering ridimensionato
        const finalBitmap = imageBitmap; // Cattura per la closure
        return await renderToDataUrl(
            (ctx) => {
                ctx.drawImage(finalBitmap, 0, 0, targetWidth, targetHeight);
            },
            targetWidth,
            targetHeight,
            options
        );
    } catch (error: unknown) {
        console.error('Errore dettagliato durante creazione miniatura:', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Creazione miniatura fallita: ${message}`);
    } finally {
        // Assicura che il bitmap sia chiuso anche se c'è un errore
        if (imageBitmap) {
            imageBitmap.close();
        }
    }
}

// src/content/core/utils.ts

/**
 * Imposta la proprietà CSS clip-path di un elemento.
 * @param el L'elemento HTMLElement o null.
 * @param path La stringa del valore clip-path.
 */
export const setClipPath = (el: HTMLElement | null, path: string): void => {
    if (!el) return;
    el.style.clipPath = path;
};

/**
 * Funzione di throttling semplice per limitare la frequenza di esecuzione di una funzione.
 * @param func La funzione da "throttlare".
 * @param limit Il periodo di attesa in millisecondi.
 * @returns La funzione throttled.
 */
export const simpleThrottle = <T extends (...args: unknown[]) => unknown>(func: T, limit: number): T => {
    let wait = false;
    // Usiamo una function expression per preservare 'this' se necessario (anche se qui non sembra usato)
    return function (this: unknown, ...args: Parameters<T>): ReturnType<T> | void {
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

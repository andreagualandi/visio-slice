// scripting-facade.ts

/**
 * Esegue uno o più script nel contesto di una scheda specificata.
 * @param target L'oggetto che specifica la scheda in cui iniettare lo script.
 * @param files Un array di percorsi di file (relativi alla root dell'estensione) da iniettare.
 * @returns Una Promise che risolve con un array di risultati dell'iniezione (o undefined se l'API restituisce undefined),
 * o rigetta se l'iniezione fallisce.
 */
export async function executeScript(
    target: chrome.scripting.InjectionTarget,
    files: string[]
): Promise<chrome.scripting.InjectionResult[] | undefined> {
    console.log(`[ScriptingFacade] Esecuzione script in tab ${target.tabId}:`, files);
    try {
        // chrome.scripting.executeScript restituisce una Promise in Manifest V3
        const results = await chrome.scripting.executeScript({ target, files });
        console.log(`[ScriptingFacade] Esecuzione script completata con ${results?.length ?? 0} risultati.`);
        return results;
    } catch (error) {
        // Cattura eventuali errori rigettati dalla Promise di executeScript
        console.error(
            `[ScriptingFacade] Errore durante executeScript in tab ${target.tabId}:`,
            error instanceof Error ? error.message : error
        );
        // Rilancia l'errore per permettere al chiamante di gestirlo
        throw error;
    }
}

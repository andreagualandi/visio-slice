// App/src/gallery/GalleryPage/hooks/useSliderState.ts
import { useState, useCallback } from 'react';

export function useSliderState(initialValue: number = 33) {
    const [value, setValue] = useState<number>(initialValue);

    const handleChange = useCallback((newValue: number) => {
        setValue(newValue);
        // TODO: Aggiungere logica persistenza se/quando necessario
    }, []);

    // Ritorna valore e handler in stile array (come useState) o oggetto
    // return [value, handleChange];
    return { columnPercent: value, handleSliderChange: handleChange };
}

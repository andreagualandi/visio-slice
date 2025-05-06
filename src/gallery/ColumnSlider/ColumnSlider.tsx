// src/gallery/ColumnSlider/ColumnSlider.tsx
import React, { useId } from 'react';

interface ColumnSliderProps {
    label: string;
    value: number;
    onChange: (newValue: number) => void;
    min: number;
    max: number;
    step: number;
}

const ColumnSlider: React.FC<ColumnSliderProps> = ({ label, value, onChange, min, max, step }) => {
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.valueAsNumber);
    };

    const baseId = useId();
    const sliderId = `slider-${baseId}`; // Crea un ID per l'accessibilità

    return (
        <div className="flex flex-col space-y-1">
            {/* Etichetta e Valore Corrente */}
            <label htmlFor={sliderId} className="flex justify-between text-xs font-medium text-gray-600">
                <span>{label}</span>
                <span className="font-semibold">{value}%</span>
            </label>
            {/* Input Range */}
            <input
                id={sliderId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleInputChange}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600" // Stile Tailwind (accent-* per colore cursore)
            />
        </div>
    );
};

export default ColumnSlider;

// src/vite-env.d.ts

/// <reference types="vite/client" />

// Declare modules for CSS/SCSS/SASS Modules
declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module '*.module.scss' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module '*.module.sass' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

// Puoi aggiungere altre dichiarazioni globali qui se necessario

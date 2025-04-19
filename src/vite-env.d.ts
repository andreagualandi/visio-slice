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

// Dice a TypeScript che importare un modulo che finisce con '?script'
// restituisce una stringa come export di default.
declare module '*?script' {
    const scriptPath: string;
    export default scriptPath;
}

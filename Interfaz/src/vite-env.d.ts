/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del FastAPI del modelo. Vacía o ausente = modo simulado. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

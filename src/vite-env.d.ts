/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
  /** « memory » : données gardées dans le navigateur, pour les tests et la démo. */
  readonly VITE_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

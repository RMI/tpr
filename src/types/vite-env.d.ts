/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_MODE: string;
  readonly VITE_GIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OCTOPUS_ACCOUNT: string;
  readonly VITE_OCTOPUS_API_KEY: string;
  readonly VITE_OCTOPUS_API_ENDPOINT: string;
  readonly VITE_GROWATT_USER: string;
  readonly VITE_GROWATT_PASSWORD: string;
  readonly VITE_GROWATT_TOKEN: string;
  readonly VITE_GROWATT_SERIAL: string;
  readonly VITE_GITHUB_TOKEN?: string;
  readonly VITE_GITHUB_REPO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

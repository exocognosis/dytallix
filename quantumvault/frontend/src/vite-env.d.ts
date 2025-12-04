/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_KEY?: string
  readonly VITE_BLOCKCHAIN_API?: string
  readonly VITE_DEFAULT_OWNER?: string
  readonly VITE_CHAIN_ID?: string
  readonly VITE_DEV_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

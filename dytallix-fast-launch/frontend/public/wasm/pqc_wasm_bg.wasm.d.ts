/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const version: () => [number, number];
export const dilithium_available: () => number;
export const keygen: () => any;
export const verify: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
export const pubkey_to_address: (a: number, b: number, c: number, d: number) => [number, number];
export const dilithium_sign: (a: number, b: number, c: number, d: number) => [number, number];
export const sign: (a: number, b: number, c: number, d: number) => [number, number];
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_export_2: WebAssembly.Table;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_start: () => void;

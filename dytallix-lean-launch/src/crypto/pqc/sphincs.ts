// SPHINCS+ convenience wrapper
import { keygen as k, sign as s, verify as v, sizes as sz } from './pqc'
export const keygen = () => k('sphincs')
export const sign = (sk: Uint8Array, msg: Uint8Array) => s('sphincs', sk, msg)
export const verify = (pk: Uint8Array, msg: Uint8Array, sig: Uint8Array) => v('sphincs', pk, msg, sig)
export const sizes = () => sz('sphincs')

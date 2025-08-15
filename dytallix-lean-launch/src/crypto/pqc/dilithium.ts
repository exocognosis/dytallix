// Dilithium convenience wrapper
import { keygen as k, sign as s, verify as v, sizes as sz } from './pqc'
export const keygen = () => k('dilithium')
export const sign = (sk: Uint8Array, msg: Uint8Array) => s('dilithium', sk, msg)
export const verify = (pk: Uint8Array, msg: Uint8Array, sig: Uint8Array) => v('dilithium', pk, msg, sig)
export const sizes = () => sz('dilithium')

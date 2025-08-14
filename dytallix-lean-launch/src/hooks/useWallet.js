import { useCallback, useEffect, useRef, useState } from 'react'
import { generateKeypair, pubkeyFromSecret } from '../lib/crypto/pqc.js'
import { deriveAddress } from '../lib/crypto/address.js'
import {
  saveKeystore,
  loadKeystore,
  clearKeystore,
  saveMeta,
  loadMeta,
  clearMeta,
  createKeystoreFromSecret,
  decryptKeystoreToSecret,
  importKeystore as parseKeystore,
  exportKeystore as serializeKeystore,
} from '../wallet/Keystore'

export function useWallet() {
  const [state, setState] = useState(() => {
    const meta = loadMeta()
    const ks = loadKeystore()
    if (ks?.meta?.address) {
      return { wallet: { algo: ks.meta.algo, address: ks.meta.address, publicKey: ks.meta.publicKey, hasKeys: true }, status: 'locked' }
    }
    if (meta?.address) {
      return { wallet: { algo: meta.algo, address: meta.address, publicKey: meta.publicKey, hasKeys: false }, status: 'locked' }
    }
    return { wallet: undefined, status: 'locked' }
  })
  const secretRef = useRef(null)
  const zeroTimers = useRef([])

  useEffect(() => {
    const onBeforeUnload = () => { if (secretRef.current) secretRef.current = null }
    const onVis = () => { if (document.hidden) { secretRef.current = null; setState(s => ({ ...s, status: 'locked' })) } }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const scheduleZeroize = useCallback(() => {
    // Clear secret from memory after inactivity window (5 minutes per requirements)
    const t = setTimeout(() => { secretRef.current = null; setState(s => ({ ...s, status: 'locked' })) }, 5 * 60 * 1000)
    zeroTimers.current.push(t)
  }, [])

  const clearZeroTimers = useCallback(() => {
    zeroTimers.current.forEach(t => clearTimeout(t)); zeroTimers.current = []
  }, [])

  const createWallet = useCallback(async (algo, password) => {
    const kp = await generateKeypair(algo)
    const address = await deriveAddress(kp.publicKey, algo)
    const ks = await createKeystoreFromSecret(kp.secretKey, { address, algo, publicKey: kp.publicKey }, password)
    saveKeystore(ks)
    saveMeta({ algo, address, publicKey: kp.publicKey })
    setState({ wallet: { algo, address, publicKey: kp.publicKey, hasKeys: true }, status: 'locked' })
    return { address }
  }, [])

  const unlock = useCallback(async (password) => {
    const ks = loadKeystore()
    if (!ks) throw new Error('No keystore')
    const sk = await decryptKeystoreToSecret(ks, password)
    secretRef.current = sk
    clearZeroTimers(); scheduleZeroize()
    setState((s) => ({ ...s, status: 'unlocked' }))
    return true
  }, [clearZeroTimers, scheduleZeroize])

  const lock = useCallback(() => {
    secretRef.current = null
    clearZeroTimers()
    setState((s) => ({ ...s, status: 'locked' }))
  }, [clearZeroTimers])

  const connectWatchOnly = useCallback(async (address, algo = 'dilithium', publicKey = '') => {
    saveMeta({ address, algo, publicKey })
    setState({ wallet: { algo, address, publicKey, hasKeys: false }, status: 'locked' })
  }, [])

  const importPrivateKey = useCallback(async (algo, secretKeyB64, password) => {
    const publicKey = await pubkeyFromSecret(secretKeyB64)
    const address = await deriveAddress(publicKey, algo)
    const ks = await createKeystoreFromSecret(secretKeyB64, { address, algo, publicKey }, password)
    saveKeystore(ks)
    saveMeta({ algo, address, publicKey })
    setState({ wallet: { algo, address, publicKey, hasKeys: true }, status: 'locked' })
    return { address }
  }, [])

  const importKeystore = useCallback(async (keystoreJson, password) => {
    const ksIn = typeof keystoreJson === 'string' ? parseKeystore(keystoreJson) : parseKeystore(JSON.stringify(keystoreJson))
    // Validate password
    const secretKeyB64 = await decryptKeystoreToSecret(ksIn, password)
    const meta = ksIn.meta
    const addr = meta.address || await deriveAddress(meta.publicKey || (await pubkeyFromSecret(secretKeyB64)), meta.algo)
    const normalized = { ...ksIn, meta: { ...meta, address: addr } }
    saveKeystore(normalized)
    saveMeta({ address: addr, algo: meta.algo, publicKey: meta.publicKey })
    setState({ wallet: { algo: meta.algo, address: addr, publicKey: meta.publicKey, hasKeys: true }, status: 'locked' })
    return { address: addr }
  }, [])

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    const ks = loadKeystore()
    if (!ks) throw new Error('No keystore')
    const secretKeyB64 = await decryptKeystoreToSecret(ks, oldPassword)
    const meta = ks.meta
    const newKs = await createKeystoreFromSecret(secretKeyB64, { address: meta.address, algo: meta.algo, publicKey: meta.publicKey }, newPassword)
    saveKeystore(newKs)
    return true
  }, [])

  const exportKeystore = useCallback(() => {
    const ks = loadKeystore()
    if (!ks) throw new Error('No keystore')
    const blob = new Blob([JSON.stringify(ks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keystore-${ks.meta.address}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

  const forget = useCallback(() => {
    clearKeystore(); clearMeta(); secretRef.current = null; clearZeroTimers()
    setState({ wallet: undefined, status: 'locked' })
  }, [clearZeroTimers])

  return { ...state, createWallet, unlock, lock, connectWatchOnly, importPrivateKey, importKeystore, changePassword, exportKeystore, forget, getSecret: () => secretRef.current }
}

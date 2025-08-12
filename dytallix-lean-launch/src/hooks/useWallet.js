import { useCallback, useEffect, useRef, useState } from 'react'
import { generateKeypair, pubkeyFromSecret } from '../lib/crypto/pqc.js'
import { deriveAddress } from '../lib/crypto/address.js'
import { encryptKeystore, decryptKeystore, saveKeystore, loadKeystore, saveMeta, loadMeta, clearKeystore, clearMeta } from '../lib/keystore.js'

export function useWallet() {
  const [state, setState] = useState(() => {
    const meta = loadMeta()
    const ks = loadKeystore()
    if (meta?.address && ks?.address === meta.address) {
      return { wallet: { algo: meta.algo, address: meta.address, publicKey: meta.publicKey, hasKeys: true }, status: 'locked' }
    }
    return { wallet: undefined, status: 'locked' }
  })
  const secretRef = useRef(null)
  const zeroTimers = useRef([])

  useEffect(() => {
    const onBeforeUnload = () => { if (secretRef.current) secretRef.current = null }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const scheduleZeroize = useCallback(() => {
    // Clear secret from memory after inactivity window (defense-in-depth)
    const t = setTimeout(() => { secretRef.current = null; setState(s => ({ ...s, status: 'locked' })) }, 15 * 60 * 1000)
    zeroTimers.current.push(t)
  }, [])

  const clearZeroTimers = useCallback(() => {
    zeroTimers.current.forEach(t => clearTimeout(t)); zeroTimers.current = []
  }, [])

  const createWallet = useCallback(async (algo, password) => {
    const kp = await generateKeypair(algo)
    const address = await deriveAddress(kp.publicKey, algo)
    const ks = await encryptKeystore(kp.secretKey, algo, address, kp.publicKey, password)
    saveKeystore(ks)
    saveMeta({ algo, address, publicKey: kp.publicKey })
    setState({ wallet: { algo, address, publicKey: kp.publicKey, hasKeys: true }, status: 'locked' })
    return { address }
  }, [])

  const unlock = useCallback(async (password) => {
    const ks = loadKeystore()
    if (!ks) throw new Error('No keystore')
    const sk = await decryptKeystore(ks, password)
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
    const ks = await encryptKeystore(secretKeyB64, algo, address, publicKey, password)
    saveKeystore(ks)
    saveMeta({ algo, address, publicKey })
    setState({ wallet: { algo, address, publicKey, hasKeys: true }, status: 'locked' })
    return { address }
  }, [])

  const importKeystore = useCallback(async (keystoreJson, password) => {
    const ksIn = typeof keystoreJson === 'string' ? JSON.parse(keystoreJson) : keystoreJson
    const secretKeyB64 = await decryptKeystore(ksIn, password) // password validation
    const publicKey = ksIn.publicKey || await pubkeyFromSecret(secretKeyB64)
    const algo = ksIn.algo
    if (!algo) throw new Error('Missing algo in keystore')
    const address = await deriveAddress(publicKey, algo)
    const ks = await encryptKeystore(secretKeyB64, algo, address, publicKey, password)
    saveKeystore(ks)
    saveMeta({ algo, address, publicKey })
    setState({ wallet: { algo, address, publicKey, hasKeys: true }, status: 'locked' })
    return { address }
  }, [])

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    const ks = loadKeystore()
    if (!ks) throw new Error('No keystore')
    const secretKeyB64 = await decryptKeystore(ks, oldPassword)
    const address = ks.address
    const algo = ks.algo
    const publicKey = ks.publicKey
    const newKs = await encryptKeystore(secretKeyB64, algo, address, publicKey, newPassword)
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
    a.download = `keystore-${ks.address}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

  const forget = useCallback(() => {
    clearKeystore(); clearMeta(); secretRef.current = null; clearZeroTimers()
    setState({ wallet: undefined, status: 'locked' })
  }, [clearZeroTimers])

  return { ...state, createWallet, unlock, lock, connectWatchOnly, importPrivateKey, importKeystore, changePassword, exportKeystore, forget, getSecret: () => secretRef.current }
}

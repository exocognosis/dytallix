// Setup for Vitest + jsdom

// localStorage mock (simple in-memory)
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const store = new Map()
  window.localStorage = {
    getItem: (k) => (store.has(k) ? String(store.get(k)) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size }
  }
}

// sessionStorage mock
if (typeof window !== 'undefined' && typeof window.sessionStorage === 'undefined') {
  const store = new Map()
  window.sessionStorage = {
    getItem: (k) => (store.has(k) ? String(store.get(k)) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size }
  }
}

// matchMedia mock for components using it
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

// crypto.getRandomValues mock (some libs rely on it)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {}
}
if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = (arr) => {
    if (!(arr instanceof Uint8Array)) throw new TypeError('Expected Uint8Array')
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
    return arr
  }
}

// Serve PQC WASM and manifest from public/ during tests (no dev server in jsdom)
try {
  const origFetch = globalThis.fetch
  // Only override if running under jsdom/node
  if (typeof origFetch === 'function') {
    const pathMod = await import('node:path')
    const fsMod = await import('node:fs/promises')
    const root = process.cwd()
    const pubRoot = pathMod.resolve(root, 'public')
    globalThis.fetch = async (input, init) => {
      try {
        if (typeof input === 'string' && input.startsWith('/wasm/pqc/')) {
          // Strip any query string before resolving to disk path
          const urlPath = input.split('?')[0]
          const filePath = pathMod.resolve(pubRoot, urlPath.slice('/'.length)) // drop leading '/'
          const data = await fsMod.readFile(filePath)
          // naive content-type inference
          const ct = urlPath.endsWith('.json') ? 'application/json' : 'application/wasm'
          return new Response(data, { status: 200, headers: { 'content-type': ct } })
        }
      } catch (e) {
        return new Response(String(e?.message || 'not found'), { status: 404 })
      }
      return origFetch(input, init)
    }
  }
} catch {
  // ignore
}

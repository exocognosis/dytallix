// Feature flags
// PQC is enabled only when the build/runtime environment sets VITE_PQC_ENABLED==='true'
// This allows CI / test harnesses to omit integrity gating while production sets the flag.
// eslint-disable-next-line no-undef
// Enhance: fall back to process.env when import.meta.env is unavailable (e.g. in Vitest/node context)
const _viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {}
const _procEnvVal = (typeof process !== 'undefined' && process?.env?.VITE_PQC_ENABLED) || undefined
export const PQC_ENABLED = ((_viteEnv.VITE_PQC_ENABLED ?? _procEnvVal) === 'true')
export const PQC_DEFAULT_ALGO: 'dilithium' = 'dilithium'
export const PQC_ALGOS_ALLOWED = ['dilithium', 'falcon', 'sphincs'] as const

export function resolveAlgo(): string {
  const url = new URL(window.location.href)
  const q = url.searchParams.get('pqc')
  const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('pqcAlgo') : null
  const cand = q || ls || PQC_DEFAULT_ALGO
  if (PQC_ALGOS_ALLOWED.includes(cand as any)) return cand
  return PQC_DEFAULT_ALGO
}

// Feature flags
export const PQC_ENABLED = true
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

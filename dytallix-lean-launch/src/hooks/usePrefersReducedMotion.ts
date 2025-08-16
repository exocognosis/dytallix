// Simple hook to respect user and OS motion preferences
import { useEffect, useState } from 'react'

export default function usePrefersReducedMotion(): boolean {
  const getInitial = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  }

  const [reduced, setReduced] = useState<boolean>(getInitial)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    let mql: MediaQueryList | null = null
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    } catch {
      // ignore
    }
    if (!mql) return

    const handler = (ev: MediaQueryListEvent) => setReduced(ev.matches)
    // Modern browsers
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler)
      return () => mql?.removeEventListener('change', handler)
    }
    // Safari fallback
    // @ts-ignore
    mql.addListener?.(handler as any)
    return () => {
      // @ts-ignore
      mql?.removeListener?.(handler as any)
    }
  }, [])

  return reduced
}

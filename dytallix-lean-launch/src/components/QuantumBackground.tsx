import React, { useEffect, useRef, useState, useMemo } from 'react'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

/**
 * QuantumBackground
 * Canvas 2D, subtle node/mesh background for depth.
 *
 * Config knobs:
 * - density: nodes per 10k px^2 (default 0.08)
 * - caps: mobile (≤60 nodes, ≤90 edges), desktop (≤120 nodes, ≤220 edges)
 * - motion: slow drift with breathing opacity (cycle ~28s)
 * - colors: from CSS variables
 *   - nodes: var(--primary-400) @ ~0.3 alpha (modulated)
 *   - edges: var(--primary-300) @ ~0.18 alpha (distance + breathing)
 *   - ambient: var(--accent-400) @ ~0.12 alpha (radial haze)
 *
 * Accessibility & perf:
 * - Respects prefers-reduced-motion (renders static SVG, no rAF)
 * - User toggle persisted in localStorage (key: bg_enabled)
 * - Pauses when tab hidden, throttled resize, no pointer events
 * - Positioned fixed behind content; no CLS
 */

export type QuantumBackgroundProps = {
  paused?: boolean
  density?: number
  className?: string
}

const TAU = Math.PI * 2
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export default function QuantumBackground({ paused, density = 0.08, className }: QuantumBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const nodesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; p?: number }>>([])
  const breathePhaseRef = useRef<number>(Math.random() * TAU)
  const gradientRef = useRef<CanvasGradient | null>(null)
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('bg_enabled') !== 'false' } catch { return true }
  })
  const prefersReduced = usePrefersReducedMotion()

  // Query param override (?bg=off|on)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bg = params.get('bg')
    if (bg === 'off' || bg === 'on') {
      const next = bg === 'on'
      setEnabled(next)
      try { localStorage.setItem('bg_enabled', next ? 'true' : 'false') } catch {}
    }
  }, [])

  // Read theme colors from CSS variables (memoized per visibility)
  const colors = useMemo(() => {
    const root = document.documentElement
    const get = (v: string, fb: string) => getComputedStyle(root).getPropertyValue(v).trim() || fb
    const primary400 = get('--primary-400', '#60A5FA')
    const primary300 = get('--primary-300', '#93C5FD') || primary400
    const accent400 = get('--accent-400', '#A78BFA')
    return { primary400, primary300, accent400 }
  }, [document.visibilityState])

  // Debounced resize + re-seed
  useEffect(() => {
    let rid: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (rid) clearTimeout(rid)
      rid = setTimeout(() => {
        rid = null
        const c = canvasRef.current
        if (!c) return
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2)
        const { innerWidth: w, innerHeight: h } = window
        c.width = Math.floor(w * dpr)
        c.height = Math.floor(h * dpr)
        c.style.width = w + 'px'
        c.style.height = h + 'px'

        // Device class caps
        const isMobile = Math.min(w, h) < 768
        const maxNodes = isMobile ? 60 : 120
        const area = (w * h) / 10000
        const base = Math.max(24, Math.floor(area * density))
        const count = Math.min(base, maxNodes)

        // Seed nodes with slight parallax bias
        const dNodes = new Array(count).fill(0).map(() => {
          const speed = (Math.random() * 0.35 + 0.15) * dpr // very slow drift
          const angle = Math.random() * TAU
          return {
            x: Math.random() * c.width,
            y: Math.random() * c.height,
            vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
            vy: Math.sin(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
            p: Math.random(), // pulse phase seed
          }
        })
        nodesRef.current = dNodes

        // Precompute ambient gradient
        const ctx = c.getContext('2d')!
        const g = ctx.createRadialGradient(c.width * 0.15, c.height * -0.1, c.width * 0.05, c.width * 0.15, c.height * -0.1, c.width * 0.6)
        g.addColorStop(0, hexToRgba(colors.accent400, 0.06))
        g.addColorStop(1, 'rgba(0,0,0,0)')
        gradientRef.current = g
      }, 120)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => { if (rid) clearTimeout(rid); window.removeEventListener('resize', onResize) }
  }, [density, colors])

  // Visibility pause
  const hiddenRef = useRef<boolean>(document.visibilityState === 'hidden')
  useEffect(() => {
    const onVis = () => {
      hiddenRef.current = document.visibilityState === 'hidden'
      if (!hiddenRef.current && !rafRef.current && !prefersReduced && enabled && !paused) {
        // restart loop
        rafRef.current = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [enabled, prefersReduced, paused])

  // Animation loop
  const loop = (t: number) => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!

    // schedule next frame early
    rafRef.current = requestAnimationFrame(loop)
    if (paused || hiddenRef.current || !enabled || prefersReduced) {
      ctx.clearRect(0, 0, c.width, c.height)
      return
    }

    // Breathing factor: 0.15..0.28 over ~28s
    const phase = (t / 1000) / 28 + breathePhaseRef.current
    const breath = 0.15 + 0.13 * (0.5 + 0.5 * Math.sin(phase * TAU))

    const nodes = nodesRef.current
    const linkDist = Math.min(c.width, c.height) * 0.12
    const linkDist2 = linkDist * linkDist

    ctx.clearRect(0, 0, c.width, c.height)
    // Ambient haze
    if (gradientRef.current) {
      ctx.fillStyle = gradientRef.current as any
      ctx.fillRect(0, 0, c.width, c.height)
    }

    // Integrate positions
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      n.x += n.vx
      n.y += n.vy
      // bounce
      if (n.x <= 0 || n.x >= c.width) n.vx *= -1
      if (n.y <= 0 || n.y >= c.height) n.vy *= -1
    }

    // Edges with caps
    const isMobile = Math.min(c.width, c.height) / (window.devicePixelRatio || 1) < 768
    const maxEdges = isMobile ? 90 : 220
    let drawnEdges = 0
    ctx.lineWidth = 1
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (drawnEdges >= maxEdges) break
        const a = nodes[i]
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d2 = dx * dx + dy * dy
        if (d2 < linkDist2) {
          const alpha = (1 - d2 / linkDist2) * 0.18 * breath
          ctx.strokeStyle = hexToRgba(colors.primary300, clamp(alpha, 0.04, 0.18))
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          drawnEdges++
        }
      }
      if (drawnEdges >= maxEdges) break
    }

    // Nodes with subtle pulse on ~4%
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      // 4% chance to be pulsing cluster
      const pulse = n.p! < 0.04 ? (0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t / 1000) * 1.7 + n.p! * 50))) : 1
      ctx.fillStyle = hexToRgba(colors.primary400, clamp(0.3 * breath * pulse, 0.18, 0.34))
      ctx.beginPath()
      ctx.arc(n.x, n.y, 1.6, 0, TAU)
      ctx.fill()
    }
  }

  // Start / stop loop
  useEffect(() => {
    if (prefersReduced || !enabled || paused) return
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [enabled, prefersReduced, paused])

  // CustomEvent toggle listener
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      const state = ce.detail?.enabled
      if (typeof state === 'boolean') {
        setEnabled(state)
        try { localStorage.setItem('bg_enabled', state ? 'true' : 'false') } catch {}
      }
    }
    window.addEventListener('dytallix:bg-toggle', handler as EventListener)
    return () => window.removeEventListener('dytallix:bg-toggle', handler as EventListener)
  }, [])

  const showStatic = prefersReduced || !enabled || paused

  if (showStatic) {
    // Static, faint SVG pattern for reduced motion
    return (
      <svg
        aria-hidden="true"
        className={className}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        width="100%"
        height="100%"
      >
        <defs>
          <radialGradient id="qb_radial" cx="10%" cy="-10%" r="60%">
            <stop offset="0%" stopColor={colors.accent400} stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <pattern id="qb_grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.2" fill={colors.primary400} opacity="0.25" />
            <circle cx="50" cy="30" r="1.2" fill={colors.primary400} opacity="0.25" />
            <line x1="10" y1="10" x2="50" y2="30" stroke={colors.primary300} strokeWidth="1" opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#qb_radial)" />
        <rect width="100%" height="100%" fill="url(#qb_grid)" opacity="0.35" />
      </svg>
    )
  }

  // Animated canvas
  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      data-bg-enabled={enabled}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'transparent' }}
    />
  )
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const bigint = parseInt(full, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

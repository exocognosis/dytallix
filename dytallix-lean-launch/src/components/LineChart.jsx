import React, { useMemo, useRef, useState } from 'react'

// Lightweight SVG line chart for small time-series
export default function LineChart({
  width = '100%',
  height = 160,
  data = [], // [{ ts: ISO, value: number }]
  color = 'var(--primary-500)',
  grid = true,
  yLabel,
  formatY = (v) => v,
  formatX = (ts) => new Date(ts).toLocaleString(),
  xLabel = 'Time (local)',
  // New options to improve readability
  banding = true, // horizontal zebra bands between major ticks
  showMinorGrid = true, // draw faint minor grid lines between majors
  emphasizeZero = true, // draw a baseline at 0 if within range
}) {
  const containerRef = useRef(null)
  const [hover, setHover] = useState(null) // { i, x, y }
  const points = data || []

  const { path, xs, ys, minY, maxY, majorTicks, minorTicks, PAD_LEFT, PAD_RIGHT, PAD_TOP, PAD_BOTTOM, W, H, xAxisTicks } = useMemo(() => {
    const W = 800
    const H = 160
    const PAD_LEFT = 66 // more space for clearer tick labels
    const PAD_RIGHT = 10
    const PAD_TOP = 8
    const PAD_BOTTOM = 34 // extra space for x tick labels + axis label

    if (!points.length) {
      return { path: '', xs: [], ys: [], minY: 0, maxY: 1, majorTicks: [0, 0.5, 1], minorTicks: [], PAD_LEFT, PAD_RIGHT, PAD_TOP, PAD_BOTTOM, W, H, xAxisTicks: [] }
    }

    // Y domain calc
    const values = points.map((p) => Number(p.value) || 0)
    let minV = Math.min(...values)
    let maxV = Math.max(...values)

    // Add 8% padding to the domain for separation; handle flat lines
    if (minV === maxV) { minV = minV - 1; maxV = maxV + 1 }
    const pad = (maxV - minV) * 0.08
    const domainMin = minV - pad
    const domainMax = maxV + pad

    const plotW = W - PAD_LEFT - PAD_RIGHT
    const plotH = H - PAD_TOP - PAD_BOTTOM

    const scaleY = (v) => PAD_TOP + (domainMax - v) * (plotH / (domainMax - domainMin))

    // X domain (time-based if timestamps available)
    const times = points.map((p, i) => {
      const t = new Date(p.ts || p.time || p.timestamp || 0).getTime()
      return Number.isFinite(t) && t > 0 ? t : NaN
    })
    const hasTime = times.every((t) => Number.isFinite(t))
    let tsMin, tsMax
    if (hasTime) {
      tsMin = Math.min(...times)
      tsMax = Math.max(...times)
      if (tsMax === tsMin) tsMax = tsMin + 60 * 1000 // avoid zero-span
    } else {
      tsMin = 0
      tsMax = Math.max(points.length - 1, 1)
    }

    const scaleXTime = (t) => PAD_LEFT + ((t - tsMin) * plotW) / (tsMax - tsMin)
    const scaleXIndex = (i) => PAD_LEFT + (i * plotW) / Math.max(points.length - 1, 1)

    const xs = hasTime ? times.map((t) => scaleXTime(t)) : points.map((_, i) => scaleXIndex(i))
    const ys = points.map((p) => scaleY(Number(p.value)))

    let d = ''
    xs.forEach((x, i) => { const y = ys[i]; d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}` })

    // Generate nice major ticks (≈6) and minor ticks between them (for Y)
    function makeNiceTicks(min, max, count = 6) {
      const span = max - min
      if (!isFinite(span) || span <= 0) return { ticks: [min, max], niceMin: min, niceMax: max, step: 1 }
      const step0 = span / Math.max(1, count - 1)
      const mag = Math.pow(10, Math.floor(Math.log10(step0)))
      const residual = step0 / mag
      let step
      if (residual >= 5) step = 5 * mag
      else if (residual >= 2) step = 2 * mag
      else step = 1 * mag
      const niceMin = Math.floor(min / step) * step
      const niceMax = Math.ceil(max / step) * step
      const ticks = []
      for (let v = niceMin; v <= niceMax + 1e-9; v += step) ticks.push(v)
      return { ticks, niceMin, niceMax, step }
    }

    const { ticks: majorTicks, niceMin, niceMax, step } = makeNiceTicks(domainMin, domainMax, 6)

    const minorTicks = []
    if (step && showMinorGrid) {
      for (let v = niceMin + step / 2; v < niceMax; v += step) minorTicks.push(v)
    }

    // Build time ticks for X axis
    function makeTimeTicks(startMs, endMs, target = 6) {
      const span = Math.max(endMs - startMs, 1)
      const steps = [
        60 * 1000,
        5 * 60 * 1000,
        10 * 60 * 1000,
        15 * 60 * 1000,
        30 * 60 * 1000,
        60 * 60 * 1000,
        2 * 60 * 60 * 1000,
        3 * 60 * 60 * 1000,
        6 * 60 * 60 * 1000,
        12 * 60 * 60 * 1000,
        24 * 60 * 60 * 1000,
      ]
      let stepMs = steps[steps.length - 1]
      for (const s of steps) {
        if (span / s <= target) { stepMs = s; break }
      }
      const firstTick = Math.ceil(startMs / stepMs) * stepMs
      const ticks = []
      for (let t = firstTick; t <= endMs + 1e3; t += stepMs) ticks.push(t)
      return { stepMs, ticks }
    }

    let xAxisTicks = []
    if (hasTime) {
      const { ticks, stepMs } = makeTimeTicks(tsMin, tsMax, 6)
      xAxisTicks = ticks.map((t) => ({ x: scaleXTime(t), ts: t, stepMs }))
    } else {
      // Fallback to index-based ticks
      const count = Math.min(6, points.length)
      for (let i = 0; i < count; i++) {
        const idx = Math.round((i / (count - 1)) * (points.length - 1))
        xAxisTicks.push({ x: scaleXIndex(idx), ts: idx, stepMs: null })
      }
    }

    return { path: d, xs, ys, minY: niceMin, maxY: niceMax, majorTicks, minorTicks, PAD_LEFT, PAD_RIGHT, PAD_TOP, PAD_BOTTOM, W, H, xAxisTicks }
  }, [points, showMinorGrid])

  const onMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !xs?.length) return
    const x = e.clientX - rect.left
    // find nearest index
    let bestI = 0, bestDist = Infinity
    // Map mouse x in px to nearest xs (already in viewBox coords but proportional)
    // Approximate by comparing relative positions
    const rel = x / rect.width
    const target = rel * W
    xs.forEach((xi, i) => { const d = Math.abs(xi - target); if (d < bestDist) { bestI = i; bestDist = d } })
    setHover({ i: bestI, x: xs[bestI], y: ys[bestI] })
  }

  const onLeave = () => setHover(null)

  // Choose a reasonable formatter for x-axis ticks based on overall span
  function formatTick(ts, stepMs) {
    if (!Number.isFinite(ts)) return ''
    const span = xAxisTicks?.length > 1 ? Math.abs(xAxisTicks[xAxisTicks.length - 1].ts - xAxisTicks[0].ts) : stepMs || 0
    if (span <= 60 * 60 * 1000) {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (span <= 24 * 60 * 60 * 1000) {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div ref={containerRef} style={{ width, height }} onMouseMove={onMove} onMouseLeave={onLeave} aria-label={`${yLabel ? `${yLabel} vs ` : ''}${xLabel} line chart`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="100%">
        {/* Background bands for readability */}
        {grid && banding && (
          <g>
            {majorTicks.slice(0, -1).map((tv, i) => {
              const next = majorTicks[i + 1]
              const y1 = (() => { const plotH = H - PAD_TOP - PAD_BOTTOM; return PAD_TOP + (maxY - tv) * (plotH / (maxY - minY || 1)) })()
              const y2 = (() => { const plotH = H - PAD_TOP - PAD_BOTTOM; return PAD_TOP + (maxY - next) * (plotH / (maxY - minY || 1)) })()
              const yTop = Math.min(y1, y2)
              const h = Math.abs(y2 - y1)
              return (
                <rect key={`band-${i}`} x={PAD_LEFT} y={yTop} width={W - PAD_LEFT - PAD_RIGHT} height={h}
                      fill="var(--surface-border)" opacity="0.18" />
              )
            })}
          </g>
        )}

        {/* Grid and Y axis */}
        {grid && (
          <g>
            {/* Minor grid */}
            {minorTicks.map((tv, i) => {
              const plotH = H - PAD_TOP - PAD_BOTTOM
              const y = PAD_TOP + (maxY - tv) * (plotH / (maxY - minY || 1))
              return <line key={`mg-${i}`} x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="var(--surface-border)" strokeWidth="1" strokeDasharray="2 4" />
            })}
            {/* Major grid */}
            {majorTicks.map((tv, i) => {
              const plotH = H - PAD_TOP - PAD_BOTTOM
              const y = PAD_TOP + (maxY - tv) * (plotH / (maxY - minY || 1))
              return <line key={`g-${i}`} x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="var(--surface-border)" strokeWidth="1.5" />
            })}
            {/* Y axis line */}
            <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={H - PAD_BOTTOM} stroke="var(--surface-border)" strokeWidth="1.5" />

            {/* Zero baseline if within domain */}
            {emphasizeZero && minY < 0 && maxY > 0 && (
              (() => {
                const plotH = H - PAD_TOP - PAD_BOTTOM
                const y0 = PAD_TOP + (maxY - 0) * (plotH / (maxY - minY || 1))
                return <line x1={PAD_LEFT} y1={y0} x2={W - PAD_RIGHT} y2={y0} stroke="var(--accent-500)" strokeWidth="1.5" opacity="0.65" strokeDasharray="4 4" />
              })()
            )}
          </g>
        )}

        {/* X axis line and ticks */}
        <g>
          {/* X axis baseline */}
          <line x1={PAD_LEFT} y1={H - PAD_BOTTOM} x2={W - PAD_RIGHT} y2={H - PAD_BOTTOM} stroke="var(--surface-border)" strokeWidth="1.5" />
          {/* X ticks & labels */}
          {xAxisTicks.map((t, i) => (
            <g key={`xt-${i}`}>
              <line x1={t.x} y1={H - PAD_BOTTOM} x2={t.x} y2={H - PAD_BOTTOM + 5} stroke="var(--surface-border)" />
              <text x={t.x} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--text-muted)">{formatTick(t.ts, t.stepMs)}</text>
            </g>
          ))}
        </g>

        {/* Y tick labels */}
        <g fill="var(--text-muted, #9CA3AF)" fontSize="12">
          {majorTicks.map((tv, i) => {
            const plotH = H - PAD_TOP - PAD_BOTTOM
            const y = PAD_TOP + (maxY - tv) * (plotH / (maxY - minY || 1))
            return (
              <g key={`t-${i}`}>
                <line x1={PAD_LEFT - 5} y1={y} x2={PAD_LEFT} y2={y} stroke="var(--surface-border)" />
                <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end">{formatY(tv)}</text>
              </g>
            )
          })}
        </g>

        {/* Data path and hover */}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
        {hover && (
          <g>
            <line x1={hover.x} y1={PAD_TOP} x2={hover.x} y2={H - PAD_BOTTOM} stroke="var(--surface-border)" />
            <circle cx={hover.x} cy={hover.y} r="4" fill={color} />
          </g>
        )}

        {/* Axis labels inside chart */}
        <g fill="var(--text-muted, #9CA3AF)" fontSize="12">
          <text x={(PAD_LEFT + (W - PAD_RIGHT)) / 2} y={H - 2} textAnchor="middle">{xLabel}</text>
          {yLabel ? (
            <text x={14} y={(H - PAD_BOTTOM + PAD_TOP) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(H - PAD_BOTTOM + PAD_TOP) / 2})`}>{yLabel}</text>
          ) : null}
        </g>
      </svg>
      {hover && points[hover.i] && (
        <div style={{ position: 'relative', top: -height, left: Math.min(Math.max((hover.x / W) * (containerRef.current?.clientWidth || 0) - 80, 0), (containerRef.current?.clientWidth || 0) - 180) }}>
          <div className="card" style={{ position: 'absolute', transform: 'translateY(-100%)', padding: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatY(points[hover.i].value)}</div>
            <div className="muted">{formatX(points[hover.i].ts)}</div>
            {yLabel ? <div className="muted">{yLabel}</div> : null}
          </div>
        </div>
      )}
      {/* Removed below-chart numeric Y labels; labels now rendered inside SVG on the left */}
    </div>
  )
}

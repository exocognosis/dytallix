# AI Risk UI

This document describes the `AiRiskBadge` component used in the Explorer to visualize AI-assessed transaction risk.

Overview
- Component: `src/components/AiRiskBadge.jsx`
- Optional styles: `src/components/AiRiskBadge.module.css`
- Data source: server endpoint `/api/ai/risk/transaction/:hash`

Behavior
- status === "unavailable" → renders a neutral gray badge with text `N/A`.
- label === "low" → renders a green badge with text `Low Risk`.
- label === "medium" → renders an orange badge with text `Medium Risk`.
- label === "high" → renders a red badge with text `High Risk`.
- Tooltip shows raw score (if present), latency in ms (if provided by fetch), and optional model id.
- If no label is provided but a numeric score is available, the level is derived:
  - score < 0.3 → low
  - 0.3 ≤ score < 0.7 → medium
  - score ≥ 0.7 → high

Usage example
```jsx
import AiRiskBadge from '../../components/AiRiskBadge.jsx'

function Example({ hash }) {
  const [risk, setRisk] = useState({ status: 'unavailable' })
  useEffect(() => {
    let mounted = true
    const t0 = Date.now()
    fetch(`/api/ai/risk/transaction/${encodeURIComponent(hash)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP '+r.status)))
      .then(d => {
        if (!mounted) return
        setRisk({ score: d.score, label: d.label || d.level, status: 'ok', latencyMs: Date.now() - t0 })
      })
      .catch(() => { if (mounted) setRisk({ status: 'unavailable' }) })
    return () => { mounted = false }
  }, [hash])

  return (
    <div>
      <span>Tx {hash.slice(0,10)}… </span>
      <AiRiskBadge score={risk.score} label={risk.label} status={risk.status} latencyMs={risk.latencyMs} />
    </div>
  )
}
```

Styling
- The module CSS provides distinct colors for each level (green/orange/red) and a neutral gray for unavailable.
- You can switch to inline styles or Tailwind classes by editing the component accordingly.

Fallback behavior
- If the oracle server is down or times out, the fetch will fail and the component should be rendered with `status="unavailable"`, which displays `N/A`.

Testing
- Run `npm start` (or `yarn dev`).
- Open a transaction detail page.
- When the adapter returns `{ label: "low" }` the badge shows `Low Risk` (green).
- Stop the AI oracle server and reload the page — the badge shows `N/A` (gray).

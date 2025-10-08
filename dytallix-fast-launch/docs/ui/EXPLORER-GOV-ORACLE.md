# Explorer – Governance & Oracle Indicators

Routes
- `/governance` – Lists proposals (read‑only)
- `/governance/:proposalId` – Proposal detail + tally + params
- `/tx/:hash` – Transaction detail with PQC algorithm and Oracle badge (when present)
- `/block/:id` – Block detail with tx list and Oracle badges
- `/contracts` – Contracts stub page; shows friendly message if RPC returns 501

Queries
- Governance:
  - List: `GET {rpc}/api/governance/proposals`
  - Proposal: `GET {rpc}/gov/proposal/:id`
  - Tally: `GET {rpc}/gov/tally/:id`
  - Params: `GET {rpc}/gov/config` (shown even when governance is disabled)
- Transactions:
  - `GET {rpc}/tx/:hash` (shows status, height; PQC algorithm shown if provided by backend)
- Blocks:
  - `GET {rpc}/block/:id`

Oracle Badge
- Renders when oracle metadata is available for a tx (e.g., risk score or verification).
- Component: `src/components/OracleBadge.jsx`.

Notes
- Backend runtime flags gate mutations only; read‑only governance endpoints remain available. The UI reflects this and does not expose tx‑creating actions.
- PQC Algorithm label defaults to “Dilithium” if backend omits `pqc_algorithm`.
- Contracts page displays a stub with helpful copy until RPC returns 501 Not Implemented.

Screenshots
- Add screenshots here after a staging deploy to validate rendering and Lighthouse.

UI Walkthrough (Dashboard + Explorer)

Environment
- Node RPC: http://localhost:3030
- Web server: http://localhost:8787 (serves /api proxy and static UI)

What’s wired
- Dashboard shows current block height, TPS, block time, peers, mempool and includes a “PQC: ON” status card from `/api/pqc/status`.
- Explorer lists recent blocks and transactions via `/api/blocks`, `/api/transactions` (proxied to the node). Block/Tx detail modals pull from `/api/blocks/:id` and `/api/transactions/:hash`.
- Account view pulls balances from node via `/api/addresses/:addr` with udgt/udrt formatted; history scans recent blocks.
- Governance pages use `/api/governance/proposals`, `/api/governance/proposals/:id`, and `/:id/tally` (proxy to node).
- Staking: accrued rewards proxy at `/api/staking/accrued/:address`; APR placeholder at `/api/staking/apr`.
- Risk badge: transaction detail shows AI risk when node receipts include `ai_risk_score` (oracle feature).

How to view
1) Start node with governance/staking enabled and the API server:
   - `DYT_ENABLE_GOVERNANCE=1 DYT_ENABLE_STAKING=1 cargo run -p dytallix-lean-launch/node`
   - In another terminal: `PORT=8787 RPC_HTTP_URL=http://localhost:3030 node dytallix-lean-launch/server/index.js`
2) Open the UI at http://localhost:8787
3) Navigate:
   - Dashboard → Security & PQC card should read “active/degraded/disabled”.
   - Explorer → Recent blocks/transactions populated from the node.
   - Click a block row → modal shows block details and tx list.
   - Click a tx row → modal shows tx details; risk score appears if available.
   - Accounts → enter an address (e.g., `dyt1senderdev000000`) to view balances and recent activity.
   - Governance → proposals list + detail page tally.

Screenshots
- Save screenshots in `launch-evidence/ui/screenshots/`:
  - dashboard.png (top metrics + PQC card)
  - explorer_blocks.png (blocks table)
  - explorer_txs.png (tx list with risk column if present)
  - account_view.png (udgt/udrt balances)
  - governance_list.png / governance_detail.png


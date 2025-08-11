# Dytallix Final Launch Tasks

Most critical
1) Wire Faucet UI to backend/testnet (replace mock with real API, server-side rate limits, autofill from Wallet)
2) Add missing navbar links (Tech Stack, Roadmap)
3) Full QA pass (test flows, fix broken links, confirm wallet connect/faucet, verify AI demos)
4) Deploy to production (Netlify/Vercel/VPS) and verify live site

Note (API base URL)
- Frontend should use VITE_API_URL pointing to the live testnet API (e.g., https://api.testnet.dytallix.com)
- Ensure backend CORS allows the deployed site origin

Medium priority
6) Replace placeholder links in Developer Resources with real URLs
7) Add bug report/feedback form in Developer Resources
8) Draft announcement post for Discord/X for launch

Least critical
9) Polish mobile layout and fix minor UI bugs
10) Add environment variable support for API base URL
11) Add stronger anti-spam/rate limiting (e.g., IP or Discord auth) if needed

Dytallix Lean Launch Plan: 7-Day Dev Sprint
===========================================

Objective:
----------
Build and launch a stripped-down Dytallix developer site with:
- Faucet
- Tech stack
- Two AI module demos
- GitHub + Discord links
- Roadmap/future features page

---

DAY 1 — PROJECT SETUP & SITE STRUCTURE
--------------------------------------

Tasks:
- Scaffold the website (Next.js or React preferred)
- Set up routing for: Home, Faucet, Tech Stack, Modules, Roadmap, Resources
- Create placeholder components for each page
- Set up Tailwind CSS or other styling framework

Deliverables:
- Local dev server with page routing working
- Repo initialized and pushed to GitHub

AI Agent Prompt:
----------------
Create a new React-based website scaffold with the following pages:
- Home
- Faucet
- Tech Stack
- Modules
- Roadmap
- Developer Resources

Use Tailwind CSS for styling and ensure all pages are linked through a common navigation bar. Push the initialized project to GitHub and confirm all placeholder components render correctly.

---

DAY 2 — FAUCET FUNCTIONALITY
----------------------------

Tasks:
- Add wallet connect via MetaMask or PQC wallet interface
- Build basic faucet UI (request tokens + confirm receipt)
- Set rate limits or simple anti-spam (e.g. IP delay or Discord auth)

Deliverables:
- Fully functional faucet connected to testnet
- Wallet address input and token dispense confirmed

AI Agent Prompt:
----------------
Implement a faucet page that allows users to connect their wallet (MetaMask or testnet PQC wallet), input an address, and request a fixed amount of tokens. Include a basic rate limit (e.g. 1 request per IP per hour). Connect the faucet backend to the existing Dytallix testnet endpoint and confirm tokens are successfully sent.

---

DAY 3 — TECH STACK PAGE
------------------------

Tasks:
- Write brief technical summary (PQC stack, AI modules, bridge, crypto-agile architecture)
- Add diagrams or links to spec documents (optional)
- Markdown-styled or styled with Tailwind

Deliverables:
- “Technology” or “How It Works” page live and readable
- Includes link to whitepaper or repo sections

AI Agent Prompt:
----------------
Create a Tech Stack page explaining Dytallix’s core architecture. Include sections for:
- PQC algorithms (Dilithium, Falcon, SPHINCS+)
- AI integration (fraud detection, contract auditing)
- Modular blockchain architecture
- Bridge design and quantum resilience

Use clean layout with headings, bullet points, and links to external documentation or GitHub repos.

---

DAY 4 — AI MODULE 1: ON-CHAIN ANOMALY DETECTION DEMO
----------------------------------------------------

Tasks:
- Build or mock a working AI module demo UI
- Accept transaction logs as input, visualize anomalies
- Optional: connect to simple backend inference or pre-loaded mock data

Deliverables:
- One working demo module with clean I/O
- Hosted or integrated into Modules page

AI Agent Prompt:
----------------
Create a demo AI module called "On-Chain Anomaly Detector" that accepts a list of transaction data as input and returns anomaly scores or alerts. You may use mock inference data if backend ML integration is not ready. Display output in a simple table or heatmap visual. Deploy the module under the Modules page with proper styling.

---

DAY 5 — AI MODULE 2: SMART CONTRACT SCANNER
-------------------------------------------

Tasks:
- Build simple smart contract code input + risk flags output
- Can use pattern-matching or mock inference
- Display warnings with color coding or risk scores

Deliverables:
- Second demo module live
- Accepts Solidity code or selects from pre-set samples

AI Agent Prompt:
----------------
Implement a second demo AI module called "Smart Contract Scanner" which allows users to paste Solidity code and receive flagged security issues. If full inference isn’t available, use mock data to show sample warnings (e.g., reentrancy, unchecked external call). Highlight risky sections and display a severity score or tag.

---

DAY 6 — COPYWRITING: HOMEPAGE, ROADMAP, DEVELOPER RESOURCES
------------------------------------------------------------

Tasks:
- Write landing page content (hero, value prop, CTA)
- Write roadmap section: what's live now, what's coming
- Developer resources page: GitHub, Discord, token request, feedback

Deliverables:
- Complete site content
- Roadmap and resource pages readable and styled

AI Agent Prompt:
----------------
Write and implement clean, compelling website copy for:
- Homepage (1-liner tagline, 3 bullet features, CTA to request tokens or join Discord)
- Roadmap (short paragraphs for each milestone)
- Developer Resources (GitHub repo, docs, Discord link, faucet access, bug report form)

Style the copy with a friendly but professional tone. Optimize for developer onboarding.

---

DAY 7 — QA, POLISH, AND DEPLOY
------------------------------

Tasks:
- Test all components on local and staging
- Fix layout bugs or broken links
- Deploy site to Netlify, Vercel, or custom VPS
- Announce on Discord, X, or relevant dev forums

Deliverables:
- Public launch of dytallix.com or subdomain
- Working, minimal dev-ready site live

AI Agent Prompt:
----------------
Perform a full QA pass on the Dytallix dev site. Confirm:
- Wallet connect and faucet work
- AI module demos run without error
- All links (GitHub, Discord, Docs) function
Fix any layout or mobile issues. Deploy the final site to production (Netlify, Vercel, or VPS). Once deployed, generate a short announcement post to share on Discord and X.

---

MISSION COMPLETE ✅
===================
At the end of 7 days, you'll have a working dev-ready site to:
- Attract contributors
- Onboard testnet users
- Validate your tech
- Gather early community interest

Then iterate weekly.
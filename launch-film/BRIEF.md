# Dytallix Mainnet Launch Film: Brief + Shot List

Status: shot list approved 2026-09-26. Built and rendered; see README.md and renders/

## 1. Brief

**Objective.** A 30-second launch film that says one thing: the Dytallix L1 mainnet is live, and it was built post-quantum from genesis.

**Takeaway.** Quantum computers threaten classical crypto in two different ways. Dytallix launched with post-quantum signing and transport built in.

**Audience.** Institutional and technical viewers: security leads, infrastructure teams, and crypto-literate decision makers. They should come away with an understanding, not hype.

**Narrative arc.** Threat (0–4s), two distinct risks (4–12s), reveal (12–18s), what launched (18–24s), end card (24–30s).

**Keeping the two risks separate.** They are different attacks and are shown differently.
- **HNDL** attacks *confidentiality*. Encrypted traffic is copied today and read after Q-Day. The visual ends with **data exposed**.
- **TNFL** attacks *authenticity*. Signatures are forged after Q-Day. The visual ends with **a record changed that still verifies**.
- Each card carries a one-word tag: CONFIDENTIALITY for HNDL, AUTHENTICITY for TNFL.
- The film does not claim HNDL is "solved." It says only "ML-KEM transport," which matches your copy. Only TNFL is called "addressed at genesis."

**Tone and motion.** Serious, precise, institutional.
- Motion is limited to fades, 8–16 px rises, 1 px line draws and monospace character resolves.
- No bounce, shake, particles, glitch storms, lens flares, glow or bloom. There is one visual event at a time.
- Easing is ease-out (power3.out), 300–600 ms.
- Scenes change with short fades through black. The 4–12s section runs as one continuous layout.

**Visual system** (taken from dytallix.com's dark theme):
| Token | Value | Use |
|---|---|---|
| Page | `#000000` | Film background. The site's page color is `#070a0d`; the film uses pure black so the logo's black matte disappears with no blending. |
| Surface / raised | `#0c1116` / `#111820` | Card fills |
| Line / line-strong | `#26313b` / `#3b4955` | 1 px borders, grid, rules |
| Text / muted / subtle | `#f3f7f8` / `#a9b5bd` / `#7f8d96` | Headline / sub / labels |
| Accent | `#29dfc4` | Post-quantum-safe states and index numbers only |
| Compromise | `#f0a0a0` (site's danger tone) | Broken or forged states only |

- **Type.** Headlines use Inter at weight 550 with tight tracking (−0.035em), as on the site. Labels use a monospace font in uppercase with 0.12em tracking. The site's `ui-monospace` stack is replaced by JetBrains Mono so renders come out the same every time. Fonts are stored locally before rendering.
- **Layout.** Square corners, 1 px rules and the site's numbered eyebrow style ("01 ASSESS" becomes "01 HNDL").

**Logo rules.**
- Only the supplied PNG is used. It is never redrawn, recolored, blended, masked, glowed or distorted.
- The source is 500×500. The mark itself is about 278×324 px. It is shown at 100% or smaller, never scaled up, and placed on whole pixels so it stays sharp.
- Logo motion is opacity plus a 12 px rise only. It is never animated in scale.

**Formats.**
- 16:9 at 1920×1080: text column on the left, visuals on the right. The two threat cards sit side by side.
- 9:16 at 1080×1920: visuals above text, and the two threat cards stacked. Text stays inside platform-UI safe zones (top 250 px and bottom 330 px kept clear).

**Deliverables.**
- `dytallix-mainnet-16x9.mp4` and `dytallix-mainnet-9x16.mp4`: H.264, 30 fps constant frame rate, 900 frames, silent. Music or voiceover can be mixed in later if you supply a track.
- HyperFrames project with the two compositions sharing one scene library.
- A preview in HyperFrames Studio and review stills before the final render.

**Claims guardrails.**
- No throughput, value, validator count, price, airdrop, dates or partners.
- No product names or product UI other than "Dytallix," "Dytallix mainnet" and the URL.
- No year on Q-Day.
- Hex strings are random placeholders. No real keys or addresses are shown.

**Timing flag.** The copy says "Dytallix mainnet is live." Per the launch tracker, mainnet is not live yet: 35 gates, NO GO as of 2026-09-26. The film is built as a launch-day asset and should not be published before launch.

**Word count.** "8 words max per card" is applied per text line. Your own HNDL and TNFL headline-plus-sub pairs total 9 words, so per line is the only reading that fits the copy. Every line below is 8 words or fewer.

## 2. Shot list (second by second)

The text column lists only the lines newly visible or held during each second. Labels in `mono` are small diagram labels. They are listed so you can remove any of them.

| Time | Visual | On-screen text |
|---|---|---|
| **0–1** | Black. A faint 1 px grid fades up. An elliptic-curve line traces across the frame. A classical key-pair card draws in: public key in grey hex, private key masked `••••`. | `PUBLIC KEY` `PRIVATE KEY` (labels). **"Classical signatures will not hold."** enters at 0.6 |
| **1–2** | The masked private key starts resolving character by character, left to right, in soft red: it is being derived from the public key. | Headline holds |
| **2–3** | The private key is fully exposed at 2.4. At 2.6 a single fracture line cuts through the card and the curve (0.3 s draw). The two halves separate by 4 px. | Headline holds |
| **3–4** | Hold on the fractured card. Everything fades to black between 3.6 and 4.0. | Headline out by 4.0 |
| **4–5** | Two card frames draw in. Card 02 stays as a dim outline showing only "02". Inside card 01: a transport line between two nodes, with ciphertext packets (short hex blocks) moving along it. | `01 HNDL · CONFIDENTIALITY`. **"Harvest now, decrypt later."** at 4.4 |
| **5–6** | A tap point on the line copies each packet down into an archive stack of four captured rows. | **"Stolen ciphertext waits for Q-Day."** at 5.2 |
| **6–7** | A timeline strip at the bottom of the card: a marker slides from NOW to Q-DAY. The archived rows stay encrypted. | `NOW` `Q-DAY` (labels) |
| **7–8** | At 7.0 the marker reaches Q-DAY. The archived rows resolve from hex into readable text in soft red ("contract terms," "wallet backup," "session keys," "private message"). At 7.6 card 01 dims to 35%. | Card 01 text holds, dimmed |
| **8–9** | Card 02 lights up. A signed record appears with fields for signer, action and signature, plus a teal ✓ VALID badge. The action reads `release → A`. | `02 TNFL · AUTHENTICITY`. **"Trust now, forge later."** at 8.3 |
| **9–10** | The same timeline strip as card 01: the marker slides from NOW to Q-DAY. | **"Broken signatures become forged approvals."** at 9.2 |
| **10–11** | At Q-DAY the action value scrambles and resolves to `release → X`, underlined in soft red. The signature hex regenerates. The badge stays ✓ VALID and does not change. | `VALID` (badge) |
| **11–12** | Hold with both cards visible: card 01 ends with exposed data, card 02 with a forged record that still verifies. Fade to black between 11.6 and 12.0. | Both cards' text holds |
| **12–13** | Black. At 12.4 the logo fades in at center, at native size, with a 12 px rise. | (none) |
| **13–14** | Headline enters below the logo. | **"Dytallix mainnet is live."** at 13.0 |
| **14–15** | Sub enters in the muted tone. | **"A PQC-native Layer 1."** at 14.0 |
| **15–16** | A 1 px rule draws under the sub at 15.4. The monospace spec line enters at 15.6, with ML-DSA and ML-KEM in teal. | **"NIST ML-DSA signing. ML-KEM transport."** |
| **16–17** | Hold the full lockup. | All three lines |
| **17–18** | Hold. Fade to black between 17.6 and 18.0. | Out by 18.0 |
| **18–19** | Beat 1. The TNFL record card returns in the same geometry, now with an `ML-DSA` signature tag. The timeline strip now reads GENESIS to Q-DAY. | Teal "01". **"Post-quantum authorization"** at 18.2 |
| **19–20** | The marker travels from GENESIS to Q-DAY. | **"TNFL addressed at genesis."** at 19.0 |
| **20–21** | At Q-DAY the same rewrite attempt begins on the action field. It fails: the value snaps back to `release → A` and a small `REJECTED` tag flashes in soft red. The badge stays ✓ VALID. Crossfade out between 20.7 and 21.0. | `REJECTED` (label) |
| **21–22** | Beat 2. A stack builds from the bottom up on a GENESIS base line: `ML-DSA · SIGNING`, then `ML-KEM · TRANSPORT`. Both layers are teal-outlined with square corners. | Teal "02". **"Native PQC stack"** at 21.2 |
| **22–23** | A single teal line runs up through both layers from genesis, showing they were built in from the start. | **"Not an ECC retrofit."** at 22.0 |
| **23–24** | Hold. Fade to black between 23.6 and 24.0. | Out by 24.0 |
| **24–25** | End card. The logo fades in at center, at about 72% of native size. | (none) |
| **25–26** | Title enters. | **"Dytallix Mainnet"** at 25.0 |
| **26–27** | The URL enters in teal monospace. | **"www.dytallix.com"** at 25.8 |
| **27–28** | The small line enters in muted. | **"Built for the Quantum Era."** at 26.4 |
| **28–30** | Static hold to the last frame, with no fade-out, so the final frame works as a thumbnail or poster. | All end-card lines |

**Layout per format.**
- 16:9: text on the left and visuals on the right for 0–4 and 18–24. Cards side by side for 4–12. Centered lockups for 12–18 and 24–30.
- 9:16: visuals on top and text below, left-aligned with 72 px side margins. Cards stacked for 4–12. Centered lockups.

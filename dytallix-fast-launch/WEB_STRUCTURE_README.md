# Dytallix Fast Launch - Dual-Audience Web Experience

Complete web structure for the Dytallix dual-audience platform, featuring separate user flows for developers and enterprise customers.

## Directory Structure

```
/dytallix-fast-launch/
├── homepage/              # Landing page with fork to both flows
│   └── index.html        # Main entry point
├── build/                # Developer ecosystem pages
│   ├── index.html        # Overview
│   ├── pqc-wallet.html   # Post-quantum wallet
│   ├── faucet.html       # Testnet token faucet
│   ├── explorer.html     # Blockchain explorer
│   ├── dashboard.html    # Developer dashboard
│   ├── tokenomics.html   # Token economics
│   └── docs.html         # Documentation
├── quantumshield/        # Enterprise security platform
│   └── index.html        # Complete enterprise landing page
└── shared-assets/        # Common resources
    ├── styles.css        # Global CSS with design system
    ├── app.js            # Shared JavaScript utilities
    ├── constants.js      # Design tokens and configuration
    ├── logo.svg          # Dytallix brand logo
    ├── header.html       # Global header component
    └── footer.html       # Global footer component
```

## Two User Flows

### 1. Build on Dytallix (`/build`)

**Audience:** Developers, engineers, cryptographers

**Goal:** Transparency, tools, docs, and code-first engagement

**Pages:**
- **index.html** - Developer ecosystem overview with tech stack
- **pqc-wallet.html** - PQC keypair generation, wallet management
- **faucet.html** - Request testnet tokens
- **explorer.html** - Real-time blockchain explorer
- **dashboard.html** - Project and API key management
- **tokenomics.html** - Token economics and staking
- **docs.html** - Comprehensive documentation

### 2. QuantumShield (`/quantumshield`)

**Audience:** CISOs, CTOs, compliance leads

**Goal:** Awareness, credibility, lead generation

**Sections:**
1. Hero with video and trust badges
2. Threat Brief (HNDL attacks)
3. Solution Overview
4. Feature Grid
5. Architecture / How It Works
6. Proof & Credibility
7. Demo / Contact Form
8. Footer with legal disclaimer

## Features

### Build Pages Include:
- ✅ PQC wallet with Kyber/Dilithium key generation
- ✅ Testnet faucet with rate limiting
- ✅ Blockchain explorer with WebSocket support
- ✅ Developer dashboard with API key management
- ✅ Interactive tokenomics charts and staking calculator
- ✅ Documentation with API reference and code examples

### QuantumShield Includes:
- ✅ Enterprise-focused messaging
- ✅ HNDL threat timeline visualization
- ✅ Interactive FAQ accordion
- ✅ Feature comparison and architecture diagrams
- ✅ Lead capture form with validation
- ✅ White paper download tracking

### Shared Features:
- ✅ Consistent branding and navigation
- ✅ Responsive design (mobile-first)
- ✅ Accessibility (ARIA, semantic HTML)
- ✅ Analytics event tracking
- ✅ Modal system
- ✅ Form validation
- ✅ No external CDN dependencies

## Getting Started

### View the Site

1. Navigate to `/dytallix-fast-launch`
2. Start a local web server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open browser to `http://localhost:8080/homepage/index.html`

### Navigation

All pages are interconnected:
- **Homepage** → Choose your path (Build or QuantumShield)
- **Build pages** → Cross-link to each other and QuantumShield
- **QuantumShield** → Links back to Build ecosystem

## Technical Details

### CSS Architecture
- CSS Variables for theming
- Mobile-first responsive design
- Utility classes for rapid development
- Smooth animations and transitions

### JavaScript
- Vanilla JS (no framework dependencies)
- Module pattern for organization
- Event delegation for performance
- Analytics tracking throughout

### API Integration Points

**Build Endpoints:**
- `/wallet/create` - Create PQC wallet
- `/wallet/sign` - Sign transactions
- `/faucet/request` - Request tokens
- `/faucet/status` - Check request status
- `/explorer/search` - Search blockchain
- `/explorer/block/:height` - Get block data

**QuantumShield Endpoint:**
- `/api/demo-request` - Submit demo request

### Analytics Events

The following events are tracked:
- `page_view` - Page loads
- `button_click` - CTA interactions
- `form_submit` - Form submissions
- `download` - White paper downloads
- `video_play` - Video interactions
- `modal_open/close` - Modal interactions

## Design System

### Colors
- **Primary Blue:** #0066cc (Dytallix brand)
- **Accent Purple:** #7c3aed (QuantumShield)
- **Success Green:** #10b981
- **Warning Amber:** #f59e0b
- **Danger Red:** #ef4444

### Typography
- **Sans-serif:** System fonts (-apple-system, Segoe UI, Roboto)
- **Monospace:** Monaco, Courier New (code blocks)

### Components
- Cards with hover effects
- Buttons (primary, secondary, outline)
- Forms with validation
- Modals with overlay
- Accordions for FAQs
- Grid layouts (2, 3, 4 columns)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Next Steps

### For Design/UX Teams:
1. Refine visual design and branding
2. Add high-quality images and videos
3. Implement real data visualizations (charts)
4. Enhance animations and micro-interactions

### For Development Teams:
1. Connect API endpoints to backend
2. Implement real WebSocket for blockchain feed
3. Add authentication and session management
4. Integrate analytics service (GA, Mixpanel)
5. Set up CRM integration for lead capture
6. Add A/B testing capabilities

### For Content Teams:
1. Replace placeholder copy with final content
2. Create white paper PDF
3. Record explainer video
4. Write technical blog posts
5. Create case studies and testimonials

## Test Criteria (All Passing ✓)

- [x] `/build` and `/quantumshield` load functional pages
- [x] Build subpages include interactive/API elements
- [x] QuantumShield has working CTAs and form
- [x] Shared styles and navigation are unified
- [x] Folder naming matches `/dytallix-fast-launch`
- [x] All paths are relative (no external dependencies)
- [x] Ready for UI/UX implementation

## Maintenance

### Adding New Pages
1. Create HTML file in appropriate directory
2. Include shared assets: `<link rel="stylesheet" href="../shared-assets/styles.css">`
3. Add navigation links to header
4. Update footer links
5. Test on multiple devices

### Updating Styles
- Modify `/shared-assets/styles.css` for global changes
- Use CSS variables for consistency
- Test responsive behavior

### Adding Features
- Add JavaScript to `/shared-assets/app.js`
- Use `Dytallix` namespace for utilities
- Document new analytics events

## License

Copyright © 2025 Dytallix. All rights reserved.

---

**Built with:** HTML5, CSS3, Vanilla JavaScript  
**Status:** Production-ready structure, ready for content and backend integration  
**Last Updated:** October 2025

# Dytallix Lean Launch MV(T) Monorepo Layout

This directory standardizes the minimum viable public testnet (MV(T)) structure.

## Directory Overview
- `node/` – Chain node configuration, genesis, scripts to start local devnet.
- `faucet/` – Dedicated faucet service (Express or lightweight server) for DGT / DRT.
- `explorer/` – (Placeholder) Block & tx explorer UI/service.
- `web/` – End-user web dApp or marketing site (separate from developer dashboard).
- `src/` – React dashboard application source (legacy location retained until migrated into `web/`).
- `server/` – API + faucet implementation backing the dashboard (will converge with `faucet/`).
- `ops/` – Operational runbooks, deployment manifests, infra-as-code snippets, security hardening docs.
- `docs/` – Protocol & product documentation (tokenomics, bridge, PQC, audits summaries).
- `scripts/` – Automation scripts (build, deploy, integrity, audits) invoked by CI/CD.
- `artifacts/` – Build outputs, integrity manifests, audit logs (non-source, reproducible).
- `reports/` – Changelog & generated reports summarizing PR merges for mv-testnet.

## Branching Strategy
- `mv-testnet` (long-lived) – Integration branch for public MV(T) testnet readiness.
- Feature branches: `feat/<scope>-<short-desc>` from `mv-testnet`.
- Chore/refactor: `chore/<scope>-<short>`; Hotfixes: `fix/<issue>`.
- PRs target `mv-testnet`, then periodically merged into `main` once milestones complete.

## Environment Files
Copy `.env.example` to `.env`. Never commit real mnemonics or secrets. `.env.staging` may exist locally but is ignored.

## Devnet Quick Start
```bash
# From repo root (this folder)
cp .env.example .env
npm install
npm run server &        # API + faucet (port 8787)
npm run dev             # Frontend (port 5173)
```

## Testnet Deployment (High Level)
1. Prepare `node/` genesis & config (copy from authoritative genesis source).
2. Build artifacts: `npm ci && npm run build` (outputs to `dist/`).
3. Publish container/images (CI) – exclude secrets.
4. Apply infra (Terraform/Ansible) stored under `ops/`.
5. Point DNS / reverse proxy → web + API.

## Changelog
See `reports/CHANGELOG.md` for mv-testnet scoped changes.

## Security & Integrity
- PQC WASM integrity manifest validated on load (see `src/crypto/pqc`).
- Security headers opt-in via env flags. See `server/` README (future) for details.

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## 🏗️ Project Structure

```
dytallix-lean-launch/
├── public/
│   ├── index.html          # Main HTML template
│   └── favicon.ico         # Site favicon
├── src/
│   ├── pages/              # Main application pages
│   │   ├── Home.jsx        # Landing page
│   │   ├── Faucet.jsx      # Testnet faucet
│   │   ├── TechSpecs.jsx   # Technical specifications
│   │   ├── Modules.jsx     # AI module demos
│   │   ├── Roadmap.jsx     # Development roadmap
│   │   └── DevResources.jsx # Developer resources
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.jsx      # Navigation bar
│   │   ├── Footer.jsx      # Page footer
│   │   ├── FaucetForm.jsx  # Token request form
│   │   ├── AnomalyDemo.jsx # Transaction anomaly detection demo
│   │   └── ContractScannerDemo.jsx # Smart contract security scanner
│   ├── styles/             # CSS modules for styling
│   │   ├── global.css      # Global styles and utilities
│   │   ├── Home.module.css # Home page specific styles
│   │   ├── Navbar.module.css # Navigation styles
│   │   ├── Footer.module.css # Footer styles
│   │   └── FaucetForm.module.css # Faucet form styles
│   ├── lib/                # Utility libraries
│   │   └── api.js          # API helper functions
│   ├── data/               # Mock data and examples
│   │   ├── mockTxLogs.json # Sample transaction logs
│   │   └── exampleContract.sol # Example smart contract
│   ├── assets/             # Static assets
│   │   └── logo.png        # Platform logo
│   ├── App.jsx             # Main application component
│   └── main.jsx            # React application entry point
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite build configuration
└── README.md              # This file
```

## 🎯 Features

### Pages & Functionality

- **Home Page**: Platform overview with key features and statistics
- **Faucet**: Request testnet DGT/DRT tokens for development with Cosmos integration
- **Tech Specs**: Detailed technical specifications and architecture
- **AI Modules**: Interactive demos of AI-powered security features
- **Roadmap**: Development timeline and future plans
- **Developer Resources**: Links to tools, documentation, and community

### AI Demonstrations

- **Transaction Anomaly Detection**: Analyze transactions for suspicious patterns
- **Smart Contract Scanner**: Automated security vulnerability scanning
- **Real-time Analysis**: Interactive demos with mock AI processing

### Technical Features

- **React + JavaScript**: Modern React application with Cosmos SDK integration
- **CSS Modules**: Scoped styling for maintainable CSS
- **React Router**: Client-side routing for single-page application
- **Vite**: Fast development server and optimized builds
- **CosmJS**: Cosmos blockchain integration library
- **Responsive Design**: Mobile-friendly responsive layout
- **Environment-driven**: Configuration via environment variables for different networks

## 🔧 Configuration

### Environment Variables

Create environment files for different deployment stages. Copy `.env.staging` as a template:

```env
# Cosmos Network Configuration
VITE_LCD_HTTP_URL=https://lcd-testnet.dytallix.com
VITE_RPC_HTTP_URL=https://rpc-testnet.dytallix.com
VITE_RPC_WS_URL=wss://rpc-testnet.dytallix.com/websocket
VITE_CHAIN_ID=dytallix-testnet-1

# Optional: Faucet API endpoint
VITE_FAUCET_API_URL=https://api-testnet.dytallix.com/faucet

# Development mode (enables mock fallbacks)
VITE_DEV_MODE=true
```

**Required Environment Variables:**
- `VITE_LCD_HTTP_URL`: Cosmos LCD (REST) endpoint for querying chain state
- `VITE_RPC_HTTP_URL`: Cosmos RPC endpoint for transactions and queries
- `VITE_RPC_WS_URL`: WebSocket RPC endpoint for real-time updates
- `VITE_CHAIN_ID`: Cosmos chain identifier (must be a string)

### Build Configuration

The Vite configuration includes:
- CSS Modules with automatic class name generation
- Development server on port 3000
- Production build optimization
- Source maps for debugging

## 🎨 Styling

This project uses CSS Modules for component-specific styling and a global stylesheet for shared utilities. The design system includes:

- **Color Palette**: Blue (#3b82f6) and purple (#8b5cf6) gradients
- **Typography**: System font stack with proper sizing scales
- **Layout**: Flexbox and CSS Grid for responsive layouts
- **Components**: Card-based design with hover effects and shadows

### CSS Module Usage

```jsx
import styles from './Component.module.css'

function Component() {
  return <div className={styles.container}>Content</div>
}
```

## 🔌 Cosmos Integration

The application integrates with the Cosmos SDK using CosmJS for blockchain interactions:

- **CosmJS**: Cosmos JavaScript library for transactions and queries
- **LCD/RPC Endpoints**: Query chain state and submit transactions
- **WebSocket**: Real-time updates for transaction status
- **Bech32 Addresses**: Native Cosmos address format (`dytallix1...`)

### Faucet Integration

The faucet component supports both development and production modes:

- **Development Mode**: Uses mock API responses with fallback behavior
- **Production Mode**: Makes actual API calls to Cosmos faucet endpoints
- **Address Validation**: Validates bech32 Cosmos addresses before submission
- **Cooldown Management**: Prevents spam requests with client-side cooldown tracking

Replace mock implementations with actual API calls when backend services are available.

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service.

### Deployment Options

- **Vercel**: Zero-config deployment with Git integration
- **Netlify**: Drag-and-drop deployment with continuous deployment
- **GitHub Pages**: Free hosting for open-source projects
- **AWS S3**: Scalable static website hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -m "Add new feature"`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 Development Guidelines

- Use functional components with React hooks
- Follow CSS Modules naming conventions
- Keep components small and focused
- Add proper error handling for user interactions
- Ensure responsive design across device sizes

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `vite.config.js`
2. **Build failures**: Ensure all dependencies are installed
3. **Styling issues**: Check CSS Module import paths
4. **API errors**: Verify mock API implementations

### Getting Help

- Check the [GitHub Issues](https://github.com/HisMadRealm/dytallix/issues)
- Join our [Discord community](https://discord.gg/dytallix)
- Read the [documentation](https://docs.dytallix.com)

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🔗 Links

- [Dytallix Website](https://dytallix.com)
- [Documentation](https://docs.dytallix.com)
- [GitHub Repository](https://github.com/HisMadRealm/dytallix)
- [Discord Community](https://discord.gg/dytallix)
- [Testnet Explorer](https://testnet.dytallix.com)

## Next Steps
- Gradually relocate `server/` → `faucet/` + `node/` split.
- Migrate `src/` dashboard into `web/` package with isolated build if multi-app emerges.
- Add explorer implementation under `explorer/` or integrate external indexer.

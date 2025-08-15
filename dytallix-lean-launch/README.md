# Dytallix Lean Launch - MV Testnet Environment

This repository contains the "lean launch" environment for the Dytallix mv-testnet workstream. It provides a standardized monorepo structure for developing, testing, and deploying the React-based frontend application and supporting API services for the Dytallix blockchain platform.

## Project Purpose

The dytallix-lean-launch environment serves as the development and testing hub for the mv-testnet branch, featuring:
- Post-quantum secure blockchain frontend development
- Testnet faucet and explorer interfaces  
- AI-powered transaction analysis demos
- Streamlined deployment workflows

## Directory Structure

```
dytallix-lean-launch/
├── node/                   # Blockchain node configuration and scripts
├── faucet/                 # Testnet faucet service and interfaces
├── explorer/               # Blockchain explorer components
├── web/                    # Web application assets and configurations
├── src/                    # React frontend source code (preserved)
├── server/                 # API server implementations (preserved)
├── ops/                    # Operations and deployment scripts
├── scripts/                # Utility and automation scripts
├── docs/                   # Project documentation and guides
├── reports/                # Testing and analysis reports
├── artifacts/              # Build artifacts and generated outputs
├── package.json            # Project dependencies and scripts
├── .env.example            # Environment configuration template
└── README.md              # This file
```

## Quick Start

### Devnet Development

1. **Clone and Setup**
   ```bash
   git clone https://github.com/HisMadRealm/dytallix.git
   cd dytallix/dytallix-lean-launch
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start Local Services**
   ```bash
   # Start development server
   npm run dev
   
   # In separate terminals, start supporting services:
   # - Blockchain node (if running locally)
   # - API server (if applicable)
   ```

5. **Access Applications**
   - **Frontend Dashboard**: http://localhost:3000
   - **API Services**: http://localhost:3030 (if configured)

### Testnet (mv-testnet branch) Usage

1. **Switch to mv-testnet branch**
   ```bash
   git checkout mv-testnet
   ```

2. **Deploy or Connect to Remote Testnet**
   ```bash
   # Configure .env for testnet endpoints
   REACT_APP_API_BASE_URL=https://api.testnet.dytallix.com
   REACT_APP_NODE_URL=https://node.testnet.dytallix.com
   ```

3. **Build for Testnet**
   ```bash
   npm run build
   ```

## Branching Model

- **Long-lived mv-testnet branch**: Primary development branch for testnet features
- **Feature branches**: Created from mv-testnet for specific features (`feature/feature-name`)
- **Pull Requests**: Target mv-testnet for feature integration
- **Periodic Merges**: Stable mv-testnet changes merged to main when ready

### Branch Workflow
```bash
# Create feature branch from mv-testnet
git checkout mv-testnet
git pull origin mv-testnet
git checkout -b feature/new-feature

# Development and testing
# ...

# Create PR targeting mv-testnet
git push origin feature/new-feature
# Open PR: feature/new-feature → mv-testnet
```

## CHANGELOG Policy

This repository maintains a **mv-testnet scoped CHANGELOG** in `CHANGELOG.md`. All notable changes for the mv-testnet workstream are documented following the [Keep a Changelog](https://keepachangelog.com/) format.

### Adding Entries
- Add new entries under `## [Unreleased]` section
- Use semantic versioning for releases
- Include date in YYYY-MM-DD format
- Categorize changes: Added, Changed, Deprecated, Removed, Fixed, Security

## Security & Integrity

**⚠️ Important Security Notice**
- **Never commit secrets**: Keep `.env` files local only
- **Use .env.example**: Template for environment configuration
- **No private keys**: Avoid committing mnemonics, private keys, or sensitive data
- **Review commits**: Always review changes before pushing

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production deployment
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## Documentation

Extended frontend-specific documentation and legacy content has been migrated to the `docs/` directory. For historical README versions and detailed component documentation, see:
- `docs/legacy-frontend-readme.md` - Previous README content
- `docs/` - Additional project documentation
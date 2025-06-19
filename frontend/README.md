# Dytallix Frontend

React-based web interface for interacting with the Dytallix blockchain.

## Features (Planned)

- Wallet interface with PQC key management
- Transaction creation and monitoring
- Smart contract interaction
- AI analysis results visualization
- Developer tools and contract deployment
- Real-time blockchain explorer

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Blockchain Integration**: Custom API client
- **Cryptography**: WebAssembly PQC libraries
- **Charts**: Recharts for analytics
- **UI Components**: Headless UI

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Application pages
│   ├── services/         # API and blockchain services
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles
├── public/               # Static assets
└── docs/                 # Component documentation
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Components

### Wallet
- PQC key generation and management
- Transaction signing with post-quantum signatures
- Balance and history display

### AI Dashboard
- Fraud detection results
- Risk scoring visualization
- Contract analysis reports

### Developer Tools
- Contract deployment interface
- Transaction builder
- Blockchain explorer

- `wallet.tsx`: PQC wallet UI (keygen, sign, verify)
- `explorer.tsx`: Blockchain explorer (block/tx/address lookup)
- `analytics.tsx`: AI-driven analytics and contract audit reports

## Future Features

- Hardware wallet integration
- Multi-signature support
- Cross-chain bridge interface
- DeFi protocol integrations
- Governance voting interface

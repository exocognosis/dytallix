# Dytallix Frontend

A modern React/TypeScript frontend for the Dytallix Post-Quantum Blockchain platform.

## Features

- 🚀 **Modern Stack**: React 18, TypeScript, Vite, Tailwind CSS
- 🔒 **Wallet Management**: PQC key generation, account management, transactions
- 🔍 **Blockchain Explorer**: Block and transaction search, network monitoring  
- 📊 **Analytics Dashboard**: AI-powered fraud detection and risk scoring
- 🤖 **Smart Contracts**: Deploy and interact with contracts
- ⚡ **Real-time Updates**: WebSocket integration for live data
- 🎨 **Modern UI**: Responsive design with Headless UI components

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Headless UI
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Icons**: Heroicons
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Running Dytallix blockchain node (port 3030)
- Running AI services (port 8000)

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Backend Services

**Blockchain Node** (Terminal 1):
```bash
cd blockchain-core
cargo run --bin dytallix-node
```

**AI Services** (Terminal 2):
```bash
cd ai-services  
python3 simple_server.py
```

### 3. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Integration

The frontend connects to two backend services:

- **Blockchain API**: `http://localhost:3030` (proxied as `/api`)
- **AI Services API**: `http://localhost:8000` (proxied as `/ai-api`)

### Available Endpoints

**Blockchain API**:
- `GET /stats` - Network statistics
- `GET /transactions` - Transaction list
- `GET /health` - Node health check
- `POST /transfer` - Submit transfer transaction
- `POST /deploy` - Deploy smart contract

**AI Services API**:
- `GET /health` - AI services health
- `GET /ai/statistics` - AI analytics
- `GET /ai/alerts` - Security alerts

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Navigation.tsx    # Main navigation bar
│   │   ├── StatCard.tsx      # Dashboard statistics card
│   │   ├── TransactionList.tsx # Transaction display
│   │   ├── AIStatusCard.tsx  # AI service status
│   │   ├── ChartContainer.tsx # Chart wrapper
│   │   └── LoadingSkeleton.tsx # Loading states
│   ├── pages/               # Main application pages
│   │   ├── Dashboard.tsx    # Overview dashboard
│   │   ├── Wallet.tsx       # Wallet management
│   │   ├── Explorer.tsx     # Blockchain explorer
│   │   ├── Analytics.tsx    # AI analytics
│   │   ├── SmartContracts.tsx # Contract deployment
│   │   └── Settings.tsx     # User settings
│   ├── hooks/               # Custom React hooks
│   │   ├── useAPI.ts        # API integration
│   │   └── useWebSocket.ts  # Real-time updates
│   ├── services/            # External services
│   │   └── api.ts           # API client
│   ├── store/               # State management
│   │   └── wallet.ts        # Wallet state (Zustand)
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # Core types
│   ├── App.tsx              # Main app component
│   └── main.tsx             # React entry point
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## Key Features

### 🔐 Wallet Management
- **Account Creation**: Generate PQC-secure accounts
- **Key Management**: Store and manage post-quantum keys
- **Transactions**: Send/receive transactions with PQC signatures
- **Balance Tracking**: Real-time balance updates

### 🔍 Blockchain Explorer
- **Block Search**: Find blocks by height or hash
- **Transaction Search**: Look up transactions by hash
- **Address Search**: View address transaction history
- **Network Stats**: Monitor network health and statistics

### 📊 Analytics Dashboard
- **AI Integration**: Real-time fraud detection alerts
- **Risk Scoring**: Transaction risk assessment
- **Performance Metrics**: Network and AI service metrics
- **Trend Analysis**: Historical data visualization

### 🤖 Smart Contracts
- **Contract Deployment**: Deploy WASM smart contracts
- **Contract Interaction**: Call contract methods
- **Contract Templates**: Pre-built contract examples
- **Gas Management**: Estimate and manage gas costs

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Lint code
npm run lint
```

## Environment Configuration

The frontend uses Vite's proxy configuration to route API calls:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3030',
      '/ai-api': 'http://localhost:8000'
    }
  }
})
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Status

✅ **Completed**:
- Modern React/TypeScript setup
- Responsive UI with Tailwind CSS
- Wallet management interface
- Blockchain explorer
- Analytics dashboard
- Smart contract deployment UI
- API integration
- Real-time WebSocket updates

🚧 **In Progress**:
- Backend API integration (wallet operations)
- Smart contract interaction logic
- Enhanced error handling
- Comprehensive testing

📋 **Planned**:
- Mobile-responsive improvements
- Offline support
- Multi-language support
- Advanced charting
- User tutorials

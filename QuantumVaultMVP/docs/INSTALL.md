# QuantumVault MVP - Installation Guide

## Prerequisites

### Required Software
- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Node.js** 20+ and **npm** 8+ (for local development)
- **Git** 2.30+

### System Requirements
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **OS**: Linux, macOS, or Windows with WSL2

## Installation Methods

### Method 1: Docker Compose (Production-Ready)

This is the recommended method for testing and production deployments.

#### Step 1: Clone Repository

```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/QuantumVaultMVP
```

#### Step 2: Configure Environment

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Edit backend/.env and set:
# - Secure passwords for DATABASE_URL
# - Strong JWT_SECRET
# - Update BLOCKCHAIN_PRIVATE_KEY if needed
```

#### Step 3: Start Infrastructure

```bash
cd infra
docker-compose up -d postgres redis vault blockchain
```

#### Step 4: Deploy Smart Contract

```bash
cd ../contracts
npm install
npx hardhat compile

# Deploy to local blockchain
npx hardhat run scripts/deploy.js --network localhost

# Copy the contract address output and update backend/.env:
# ATTESTATION_CONTRACT_ADDRESS=<contract-address-here>
```

#### Step 5: Start Application Services

```bash
cd ../infra
docker-compose up -d backend frontend
```

#### Step 6: Verify Installation

```bash
# Check all services are healthy
docker-compose ps

# Should show all services as "healthy" or "running"

# Test backend API
curl http://localhost:3000/api/v1/blockchain/status

# Access frontend
open http://localhost:5173
```

### Method 2: Local Development

For active development with hot-reloading.

#### Step 1: Start Infrastructure Services

```bash
cd infra
docker-compose up -d postgres redis vault blockchain
```

#### Step 2: Set Up Backend

```bash
cd ../backend
cp .env.example .env

# Edit .env with your configuration

npm install
npx prisma generate
npx prisma migrate deploy

# Create initial admin user
npx prisma db seed

# Start development server
npm run start:dev
```

#### Step 3: Deploy Contracts

```bash
cd ../contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost

# Update backend .env with contract address
```

#### Step 4: Set Up Frontend

```bash
cd ../frontend
npm install

# Start development server
npm run dev
```

#### Step 5: Verify Installation

```bash
# Backend should be running at http://localhost:3000
curl http://localhost:3000/api/v1/blockchain/status

# Frontend should be running at http://localhost:5173
```

## Database Setup

### Run Migrations

```bash
cd backend
npx prisma migrate deploy
```

### Seed Initial Data

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('QuantumVault2024!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@quantumvault.local' },
    update: {},
    create: {
      email: 'admin@quantumvault.local',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // Create security engineer user
  const engineerPassword = await bcrypt.hash('Engineer2024!', 12);
  await prisma.user.upsert({
    where: { email: 'engineer@quantumvault.local' },
    update: {},
    create: {
      email: 'engineer@quantumvault.local',
      passwordHash: engineerPassword,
      role: UserRole.SECURITY_ENGINEER,
    },
  });

  console.log('✅ Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seeding:

```bash
npx prisma db seed
```

## Vault Setup

### Initialize Vault (Development)

The docker-compose setup runs Vault in dev mode with token `root`. For production:

```bash
# Initialize Vault
docker exec -it quantumvault-vault vault operator init

# Save the unseal keys and root token securely

# Unseal Vault
docker exec -it quantumvault-vault vault operator unseal <unseal-key-1>
docker exec -it quantumvault-vault vault operator unseal <unseal-key-2>
docker exec -it quantumvault-vault vault operator unseal <unseal-key-3>

# Login with root token
docker exec -it quantumvault-vault vault login <root-token>

# Enable KV secrets engine
docker exec -it quantumvault-vault vault secrets enable -path=quantumvault kv-v2
```

## Blockchain Setup

### Using Local Hardhat Network

Default configuration uses Geth in dev mode. For Hardhat:

```bash
cd contracts
npx hardhat node

# In another terminal
npx hardhat run scripts/deploy.js --network localhost
```

### Using External Network (Sepolia, etc.)

Update `contracts/hardhat.config.js`:

```javascript
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL || "",
    accounts: [process.env.PRIVATE_KEY || ""],
  },
}
```

Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using a port
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :8200  # Vault
lsof -i :8545  # Blockchain
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
```

Modify ports in `infra/docker-compose.yml` if needed.

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Test connection
docker exec -it quantumvault-postgres psql -U quantumvault -d quantumvault -c "SELECT 1;"
```

### Vault Not Available

```bash
# Check Vault status
docker exec -it quantumvault-vault vault status

# View logs
docker-compose logs vault

# Restart Vault
docker-compose restart vault
```

### Blockchain Not Responding

```bash
# Check blockchain logs
docker-compose logs blockchain

# Test RPC
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

## Next Steps

After installation:

1. **Login to Application**: http://localhost:5173
   - Email: `admin@quantumvault.local`
   - Password: `QuantumVault2024!`

2. **Create a Scan Target**: Add your first TLS endpoint to scan

3. **Run a Scan**: Trigger a scan to discover assets

4. **Review Dashboard**: Check KPIs and risk scores

5. **Create Policy**: Define remediation policies

6. **Wrap Assets**: Apply PQC wrapping to high-risk assets

7. **Attest**: Submit blockchain attestations

See [RUNBOOK.md](RUNBOOK.md) for operational procedures.

## Uninstallation

### Remove Containers and Volumes

```bash
cd infra
docker-compose down -v
```

### Remove Images

```bash
docker image rm quantumvaultmvp-backend quantumvaultmvp-frontend
```

### Clean Up Local Files

```bash
cd ..
rm -rf node_modules dist backend/node_modules backend/dist frontend/node_modules frontend/dist contracts/node_modules contracts/artifacts contracts/cache
```

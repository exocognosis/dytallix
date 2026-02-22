# Dytallix Pay

Dytallix Pay is a PQC-native payment processor and Fiat Onramp built for the Dytallix blockchain. It allows merchants to accept DRT and process fiat onramps/offramps seamlessly.

## Architecture
This project is structured as a Turborepo Monorepo:
- `apps/api`: Fastify REST API for merchants, off-chain payment intent states, and quotes.
- `apps/dashboard`: React/Vite web application for merchants to manage API keys, webhooks, and view payment events.
- `apps/indexer`: Blockchain poller that ingests Dytallix events into the SQL database.
- `apps/worker`: Background job runner to finalize on-chain operations after fiat settlement.
- `packages/db`: Prisma ORM with SQLite (for MVP) housing Merchant, PaymentIntent, and Event data.
- `packages/ui`: Shared component library matching the Dytallix design system.
- `packages/sdk`: TypeScript SDK for interacting with the API.
- `contracts/dytallixpay`: Mock contract runner and event schemas.

## Quickstart (Local Development)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   cd packages/db
   npx prisma db push
   npx ts-node prisma/seed.ts
   cd ../..
   ```

3. **Start the Stack**
   ```bash
   npm run dev
   ```
   This command uses Turborepo to concurrently start:
   - Dashboard: http://localhost:5173/dytallixpay/
   - API Server: http://localhost:3000
   - Indexer
   - Worker

## Simulating a Payment

1. Log into the Dashboard at `http://localhost:5173/dytallixpay/`.
2. Go to the **Test Checkout** tab.
3. Enter an amount in DRT base units (e.g., `5000`).
4. Click **Pay with Card**.
5. The system will:
   - Create a Payment Intent (status: `REQUIRES_PAYMENT_METHOD`).
   - Mock a fiat checkout flow.
   - The background worker and indexer will reconcile the states.
   - You can review the updated intent status and the on-chain events in the **Overview** and **Payments** tabs.

# QuantumVault CRM — Deployment Guide

## Overview

This guide walks you through deploying the QuantumVault CRM on Hetzner under `/qvcrm` on dytallix.com using the shared Dytallix deployment flow, local PostgreSQL, and Google Cloud for Gmail, Google Calendar, and Google Tasks APIs.

**Total setup time: ~45 minutes**

---

## Step 1: Prepare PostgreSQL on Hetzner (10 min)

The Hetzner deployment script now bootstraps PostgreSQL locally on the server.

1. Make sure the CRM has a valid `.env.local` before deployment.
2. The deploy script will:
   - install PostgreSQL on the server if needed
   - create the `quantumvault_crm` database and `quantumvault_crm` role
   - apply `lib/schema.sql`
   - seed the default CRM users with `scripts/setup-db.js`

The CRM uses direct PostgreSQL via `pg`, not Supabase.

---

## Step 2: Create a Google Cloud Project (15 min)

This gives you the credentials to connect Gmail, Google Calendar, and Google Tasks.

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. Click the project dropdown (top left) → **New Project**
   - Project name: `QuantumVault CRM`
   - Click **Create**
4. Make sure the new project is selected in the dropdown

### Enable the APIs

5. Go to **APIs & Services** → **Library**
6. Search for and enable each of these (click each one → **Enable**):
   - **Gmail API**
   - **Google Calendar API**
   - **Google Tasks API**
   - **Google People API** (for user info)

### Create OAuth Credentials

7. Go to **APIs & Services** → **Credentials**
8. Click **+ Create Credentials** → **OAuth client ID**
9. You'll be asked to configure the **OAuth consent screen** first:
   - User Type: **External** (click Create)
   - App name: `QuantumVault CRM`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through Scopes and Test Users
   - Click **Back to Dashboard**
10. Now go back to **Credentials** → **+ Create Credentials** → **OAuth client ID**
    - Application type: **Web application**
    - Name: `QuantumVault CRM`
   - Authorized redirect URIs: Add `https://dytallix.com/qvcrm/api/auth/gmail/callback`
    - Also add `http://localhost:3000/api/auth/gmail/callback` (for local dev)
    - Click **Create**
11. Copy the **Client ID** and **Client Secret** — these are your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
12. Open the OAuth client you created and confirm it is still active.
13. Verify the authorized redirect URIs include:
   - `https://dytallix.com/qvcrm/api/auth/gmail/callback`
   - `http://localhost:3000/api/auth/gmail/callback`

If Google shows `Error 401: invalid_client` or `The OAuth client was not found`, the deployed app is using a deleted or incorrect OAuth client ID. Replace `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with values from an active Google Cloud web client and redeploy.

### Add Test Users (while in development)

12. Go to **OAuth consent screen** → **Test users**
13. Click **+ Add users** and add your own Gmail address
14. (You can add up to 100 test users before publishing the app)

---

## Step 3: Deploy to Hetzner (10 min)

1. Populate `quantumvault-crm/.env.local` with at least:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET`
2. Run the shared deployment script from `dytallix-fast-launch`:

   ```bash
   ./scripts/deploy-to-hetzner.sh full
   ```

3. The script will:
   - sync the main Dytallix app and the CRM source to Hetzner
   - set the CRM production base path to `/qvcrm`
   - verify the Google OAuth client is valid before building
   - build the CRM on the server
   - run the CRM behind Nginx and PM2 on port `3100`
   - expose it publicly at `https://dytallix.com/qvcrm`

---

## Step 4: Verify Everything Works (5 min)

1. Visit `https://dytallix.com/qvcrm` — you should see the CRM login screen
2. Log in with `rick@dytallix.com` / `QVcrm123`
3. Go to **Inbox** → Click **Connect Gmail**
4. You should be redirected to Google's consent screen
5. Approve access → you'll be redirected back to the CRM
6. The Inbox and Google Workspace integrations should be ready to use

---

## Local Development

To run the CRM locally for development:

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/quantumvault-crm.git
cd quantumvault-crm

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run dev server
npm run dev

# Open http://localhost:3000
```

---

## Project Structure

```
quantumvault-crm/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts          # Email/password login
│   │   │   └── gmail/
│   │   │       ├── connect/route.ts    # Initiates Google OAuth
│   │   │       ├── callback/route.ts   # Handles OAuth redirect
│   │   │       ├── disconnect/route.ts # Removes Google connection
│   │   │       └── status/route.ts     # Check connection status
│   │   ├── contacts/route.ts           # CRUD for contacts/deals
│   │   ├── tasks/route.ts              # CRUD for tasks
│   │   └── users/route.ts             # CRUD for users
│   └── (pages will be added here)
├── components/                         # React components (from artifact)
├── lib/
│   ├── supabase.ts                    # PostgreSQL compatibility client
│   ├── google-auth.ts                 # Google OAuth utilities
│   ├── gmail.ts                       # Gmail API wrapper
│   ├── calendar.ts                    # Google Calendar API wrapper
│   ├── google-tasks.ts                # Google Tasks API wrapper
│   └── schema.sql                     # Database schema
├── types/
│   └── index.ts                       # TypeScript type definitions
├── .env.example                       # Environment variable template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## What's Next

After Phase 1 is deployed and working:

- **Phase 2**: Gmail sync and send/receive workflows
- **Phase 3**: Google Calendar sync and event creation
- **Phase 4**: LinkedIn integration (via Unipile or similar)
- **Phase 5**: Real-time notifications, email templates, automated sequences

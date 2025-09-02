# Dytallix Lean Launch 3

This is a minimal MVP of the Dytallix platform. It contains a React frontend and a set of Solidity smart contracts demonstrating the dual tokenomics system.

## Frontend

Developed with Vite + React. Pages include Home, Faucet, Tech Specs, Modules, Roadmap, Dev Resources, and a real-time Monitor.

## Tokenomics

Contains sample contracts for the governance token (DGT), reward token (DRT), vesting, emissions and burn modules. Simple Node-based tests verify configuration values.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Run tokenomics tests:

```bash
cd tokenomics
npm test
```

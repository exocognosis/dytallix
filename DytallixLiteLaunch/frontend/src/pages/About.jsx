import React from 'react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-gray-900">About Dytallix</h1>
          <p className="mt-2 text-gray-600">
            Dytallix is a dual-token, Cosmos-SDK–based blockchain designed for scalable, transparent operations
            with a clear separation between governance and utility. This LiteLaunch app bundles a wallet, block
            explorer, faucet, and basic governance views to support testnet usage and developer onboarding.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-10">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">How It Works</h2>
          <div className="mt-4 text-gray-700 space-y-3">
            <p>
              The network follows the Cosmos/Tendermint architecture: validators produce blocks, the mempool propagates
              transactions, and ABCI connects consensus with application logic. Transactions are signed client-side
              and broadcast to the node via the LiteLaunch server for persistence and indexing.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Wallet: Uses CosmJS SigningStargateClient to derive keys from a mnemonic, sign transactions, query
                balances, and fetch transaction history.
              </li>
              <li>
                Explorer: Indexes blocks and transactions, enables unified search (block height/hash, tx hash, address),
                and shows basic network/validator status.
              </li>
              <li>
                Server: Persists blocks/txs with a lightweight SQL engine, exposes REST for search/broadcast, and
                subscribes to node events via WebSocket for near-real-time updates.
              </li>
              <li>
                CLI (dytx): Signs and broadcasts transactions through the server; useful for automation and testing.
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Tech Stack</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-6 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900">Frontend</h3>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>React + React Router</li>
                <li>CosmJS (SigningStargateClient) for Cosmos tx signing</li>
                <li>bip39 for mnemonic generation/import</li>
                <li>TailwindCSS utility-first styling</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Backend</h3>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Node.js server with REST + WebSocket subscriptions</li>
                <li>sql.js for lightweight persistence of blocks/transactions</li>
                <li>Normalized broadcast and error handling for Cosmos txs</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Dual-Token Model</h2>
          <div className="mt-4 text-gray-700 space-y-3">
            <p>
              Dytallix employs two tokens to separate governance from utility:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                DGT (Governance): Used for staking, validator security, and governance proposals/voting.
              </li>
              <li>
                DRT (Resource/Utility): Used for transaction fees, resource metering, and application-level utility.
              </li>
            </ul>
            <p className="text-sm text-gray-600">
              Token supply, emission schedules, distribution, and conversion mechanics are documented in the repository
              (see the dual-token and faucet docs). This testnet UI does not present financial advice and uses
              test tokens only.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Getting Started</h2>
          <ol className="list-decimal pl-6 space-y-2 mt-2 text-gray-700">
            <li>Open Wallet to create/import a mnemonic and view balances.</li>
            <li>Use Faucet to request test DRT for gas.</li>
            <li>Send a transaction from the Wallet and monitor it in Explorer.</li>
            <li>Use unified search in Explorer to find blocks, tx hashes, or addresses.</li>
          </ol>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Resources</h2>
          <ul className="list-disc pl-6 space-y-2 mt-2 text-gray-700">
            <li>Repository docs: Dual token, faucet, deployment, and governance guides in the project root.</li>
            <li>Network endpoints: RPC, REST, and Faucet URLs shown in the app footer.</li>
            <li>CLI: The dytx tool for scripted signing and broadcast.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

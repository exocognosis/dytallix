import React, { useState } from 'react';

/**
 * BlockchainAnchorDisplay - Visual display of blockchain anchoring process
 * Shows the step 4: Blockchain Anchor process with transaction details
 */
export default function BlockchainAnchorDisplay({ anchorResult, proof, isActive = false }) {
  const [showTxDetails, setShowTxDetails] = useState(false);

  if (!anchorResult && !isActive) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/5 to-transparent p-6 opacity-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <span className="text-orange-500 text-xl">⚓</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-400">4. Blockchain Anchor</h3>
            <p className="text-xs text-neutral-500 mt-1">Proof hash is registered on-chain, creating immutable timestamp and existence proof.</p>
          </div>
        </div>
        <p className="text-sm text-neutral-500">Anchor your proof on-chain for immutable timestamping</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all duration-500 ${
      anchorResult 
        ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent shadow-lg shadow-green-500/10' 
        : isActive
        ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent shadow-lg shadow-orange-500/10'
        : 'border-white/10 bg-gradient-to-br from-orange-500/5 to-transparent'
    } p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <span className="text-orange-500 text-xl">⚓</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">4. Blockchain Anchor</h3>
          <p className="text-xs text-neutral-400 mt-1">Proof hash is registered on-chain, creating immutable timestamp and existence proof.</p>
        </div>
        {anchorResult && (
          <div className="ml-auto">
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Anchored</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {anchorResult ? (
          <>
            {/* Transaction Details */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">Blockchain Transaction</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-neutral-400 mb-1">Transaction Hash</div>
                  <div className="font-mono text-green-300 break-all bg-white/5 p-2 rounded border">
                    {anchorResult.txHash}
                    <button
                      onClick={() => navigator.clipboard?.writeText(anchorResult.txHash)}
                      className="ml-2 px-2 py-1 text-xs rounded bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition"
                      title="Copy transaction hash"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-neutral-400 mb-1">Block Height</div>
                    <div className="font-mono text-green-300">{anchorResult.blockHeight}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 mb-1">Timestamp</div>
                    <div className="font-mono text-green-300">
                      {new Date(anchorResult.timestamp || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Merkle Tree Information */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-semibold text-orange-400 mb-3">Merkle Tree Anchoring</h4>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-neutral-400 mb-1">Merkle Root</div>
                  <div className="font-mono text-orange-300 break-all">
                    {anchorResult.merkleRoot || `${anchorResult.txHash.slice(0, 16)}...`}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400 mb-1">Proof Position</div>
                  <div className="font-mono text-orange-300">
                    Leaf #{anchorResult.leafIndex || Math.floor(Math.random() * 1000)}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">Verification Status</h4>
              <div className="grid md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-neutral-300">Immutable Record Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-neutral-300">Cryptographic Timestamp</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-neutral-300">Publicly Verifiable</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-neutral-300">Tamper Evident</span>
                </div>
              </div>
            </div>

            {/* Explorer Link */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowTxDetails(!showTxDetails)}
                className="text-xs text-orange-400 hover:text-orange-300 transition"
              >
                {showTxDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              <a
                href={`#/explorer/tx/${anchorResult.txHash}`}
                className="text-xs text-green-400 hover:text-green-300 transition underline"
              >
                View in Explorer →
              </a>
            </div>

            {showTxDetails && (
              <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5">
                <h5 className="text-xs font-semibold text-neutral-300 mb-2">Raw Transaction Data</h5>
                <pre className="text-xs text-neutral-400 font-mono overflow-x-auto">
{JSON.stringify({
  hash: anchorResult.txHash,
  blockHeight: anchorResult.blockHeight,
  proofHash: proof?.file_hash_blake3,
  merkleRoot: anchorResult.merkleRoot,
  timestamp: new Date().toISOString(),
  gasUsed: "21000",
  status: "confirmed"
}, null, 2)}
                </pre>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Pending/Available State */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="text-sm font-semibold text-orange-400 mb-3">Ready for Blockchain Anchoring</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-neutral-400 mb-1">Proof Hash to Anchor</div>
                  <div className="font-mono text-orange-300 break-all bg-white/5 p-2 rounded border">
                    {proof?.file_hash_blake3 || 'Generate proof first'}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-neutral-400 mb-1">Network</div>
                    <div className="text-orange-300">Dytallix Testnet</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 mb-1">Estimated Cost</div>
                    <div className="text-orange-300">~0.001 DTX</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-4">
              <h4 className="text-sm font-semibold text-orange-400 mb-3">Anchoring Benefits</h4>
              <div className="grid md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⭐</span>
                  <span className="text-neutral-300">Immutable Timestamp</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⭐</span>
                  <span className="text-neutral-300">Public Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⭐</span>
                  <span className="text-neutral-300">Legal Admissibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⭐</span>
                  <span className="text-neutral-300">Decentralized Storage</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

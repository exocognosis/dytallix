import React, { useState } from 'react';
import { registerAssetOnChain } from '../../lib/quantum/api';
import { truncateHash } from '../../lib/quantum/format';

/**
 * AnchorPanel - Register asset on-chain
 * Calls smart contract to anchor proof hash
 */
export default function AnchorPanel({ proof, onAnchorComplete }) {
  const [status, setStatus] = useState('idle'); // idle, connecting, anchoring, complete, error
  const [txHash, setTxHash] = useState(null);
  const [assetId, setAssetId] = useState(null);
  const [error, setError] = useState(null);

  if (!proof) return null;

  const handleAnchor = async () => {
    try {
      setStatus('connecting');
      setError(null);

      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus('anchoring');

      // Register on-chain via QuantumVault API
      const result = await registerAssetOnChain(proof.file_hash_blake3, proof.uri, {
        filename: proof.meta?.filename,
        mime: proof.meta?.mime,
        bytes: proof.meta?.bytes,
        created: proof.created
      });

      setTxHash(result.transactionHash || result.txHash);
      setAssetId(result.assetId);
      setStatus('complete');

      // Notify parent
      if (onAnchorComplete) {
        onAnchorComplete(result);
      }

    } catch (err) {
      console.error('Anchor failed:', err);
      setError(err.message || 'Failed to anchor on-chain');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setTxHash(null);
    setAssetId(null);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <span className="text-orange-500 text-xl">⚓</span>
        </div>
        <h3 className="text-lg font-semibold">Anchor On-Chain</h3>
      </div>

      <div className="text-sm text-neutral-300 mb-4">
        Register your asset hash on the blockchain for permanent, tamper-proof verification.
      </div>

      {status === 'idle' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-neutral-500 mb-1">Hash to anchor:</div>
            <code className="text-xs font-mono text-orange-300 break-all">
              {truncateHash(proof.file_hash_blake3, 16, 16)}
            </code>
          </div>

          <button
            onClick={handleAnchor}
            className="w-full px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
          >
            🔗 Register Asset
          </button>

          <div className="text-xs text-neutral-500">
            This will call <code className="text-orange-400">DytallixRegistry.registerAsset()</code> 
            {' '}with your proof hash
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3 animate-pulse">🔌</div>
          <div className="text-neutral-300">Connecting wallet...</div>
        </div>
      )}

      {status === 'anchoring' && (
        <div className="text-center py-6">
          <div className="text-4xl mb-3 animate-pulse">⚓</div>
          <div className="text-neutral-300 mb-2">Anchoring on-chain...</div>
          <div className="text-xs text-neutral-500">
            Submitting transaction to network
          </div>
        </div>
      )}

      {status === 'complete' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
              <span>✓</span> Anchored Successfully!
            </div>
            
            <div className="space-y-2 text-sm">
              {assetId && (
                <div>
                  <div className="text-xs text-neutral-500">Asset ID</div>
                  <div className="text-green-300 font-semibold">#{assetId}</div>
                </div>
              )}

              {txHash && (
                <div>
                  <div className="text-xs text-neutral-500">Transaction Hash</div>
                  <code className="text-xs font-mono text-green-300 block truncate">
                    {txHash}
                  </code>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Reset
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
              <span>✗</span> Anchor Failed
            </div>
            <div className="text-sm text-neutral-300">{error}</div>
          </div>

          <button
            onClick={reset}
            className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

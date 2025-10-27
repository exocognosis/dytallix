import React, { useState } from 'react';
import { copyToClipboard, downloadFile, truncateHash } from '../../lib/quantum/format';

/**
 * ProofPanel - Display and manage proof JSON
 * Shows generated proof with copy and download options
 */
export default function ProofPanel({ proof, uploadResult }) {
  const [copied, setCopied] = useState(false);
  const [showFullJson, setShowFullJson] = useState(false);

  if (!proof) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/5 to-transparent p-6 opacity-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <span className="text-green-500 text-xl">📜</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-400">3. Generate Proof</h3>
            <p className="text-xs text-neutral-500 mt-1">Cryptographic proof bundle contains hash, signature, metadata, and verification instructions.</p>
          </div>
        </div>
        <p className="text-sm text-neutral-500">Complete encryption to generate cryptographic proof</p>
      </div>
    );
  }

  const proofJson = JSON.stringify(proof, null, 2);

  const handleCopy = async () => {
    const success = await copyToClipboard(proofJson);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const filename = `proof-${proof.file_hash_blake3.slice(2, 10)}.json`;
    downloadFile(proofJson, filename, 'application/json');
  };

  return (
    <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent p-6 shadow-lg shadow-green-500/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <span className="text-green-500 text-xl">📜</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">3. Generate Proof</h3>
          <p className="text-xs text-neutral-400 mt-1">Cryptographic proof bundle contains hash, signature, metadata, and verification instructions.</p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Complete</span>
          </div>
        </div>
      </div>

      {/* Proof summary */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="text-xs text-purple-400 font-medium mb-1">File Hash (BLAKE3)</div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-purple-300 break-all">
              {truncateHash(proof.file_hash_blake3, 16, 12)}
            </code>
            <button
              onClick={() => copyToClipboard(proof.file_hash_blake3)}
              className="px-2 py-1 text-xs rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition flex-shrink-0"
              title="Copy hash"
            >
              📋
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs text-blue-400 font-medium mb-1">Storage URI</div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-blue-300 truncate">
              {proof.uri}
            </code>
            <button
              onClick={() => copyToClipboard(proof.uri)}
              className="px-2 py-1 text-xs rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition flex-shrink-0"
              title="Copy URI"
            >
              📋
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs text-green-400 font-medium mb-1">Created</div>
          <div className="text-xs text-green-300">
            {new Date(proof.created).toLocaleString()}
          </div>
        </div>

        {uploadResult?.file && (
          <div>
            <div className="text-xs text-orange-400 font-medium mb-1">File Info</div>
            <div className="text-xs text-orange-300">
              {uploadResult.file.name} · {uploadResult.file.type}
            </div>
          </div>
        )}

        {proof.signature && (
          <div>
            <div className="text-xs text-pink-400 font-medium mb-1">PQ Signature (Dilithium)</div>
            <code className="text-xs font-mono text-pink-300 block truncate">
              {truncateHash(proof.signature, 20, 16)}
            </code>
            <div className="text-xs text-neutral-500 mt-1">
              ⚠️ Using stub signature for POC
            </div>
          </div>
        )}
      </div>

      {/* Encryption keys warning */}
      {uploadResult?.encryption && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="text-xs text-yellow-400 font-semibold mb-1">
            ⚠️ Encryption Keys (Save Securely!)
          </div>
          <div className="text-xs text-neutral-300 space-y-1">
            <div>
              <span className="text-neutral-500">Key:</span>{' '}
              <code className="text-yellow-300">{truncateHash(uploadResult.encryption.key, 12, 12)}</code>
            </div>
            <div>
              <span className="text-neutral-500">Nonce:</span>{' '}
              <code className="text-yellow-300">{truncateHash(uploadResult.encryption.nonce, 12, 12)}</code>
            </div>
          </div>
          <div className="text-xs text-neutral-500 mt-2">
            You need these to decrypt the file later. Store them securely!
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition text-sm font-semibold"
        >
          {copied ? '✓ Copied!' : '📋 Copy JSON'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition text-sm font-semibold"
        >
          💾 Download
        </button>
      </div>

      {/* JSON viewer */}
      <div>
        <button
          onClick={() => setShowFullJson(!showFullJson)}
          className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm mb-2"
        >
          {showFullJson ? 'Hide' : 'Show'} Full JSON
        </button>
        
        {showFullJson && (
          <pre className="text-xs font-mono bg-black/30 p-4 rounded-xl overflow-x-auto max-h-96 border border-purple-500/20">
            {proofJson}
          </pre>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { verifyDilithium } from '../../lib/quantum/pq-signature';
import { blake3Hex } from '../../lib/quantum/blake3';
import { verifyAssetOnChain } from '../../lib/quantum/api';
import { truncateHash, formatTimestamp } from '../../lib/quantum/format';

/**
 * VerifyPanel - Verify proof integrity
 * 
 * Verification steps:
 * 1. Parse proof JSON
 * 2. Verify PQ signature (stub for POC)
 * 3. Compare hash with on-chain record
 * 4. Optionally re-hash local file
 */
export default function VerifyPanel({ anchorResult }) {
  const [proofInput, setProofInput] = useState('');
  const [proof, setProof] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, verifying, complete, error
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const proofFileInputRef = useRef(null);

  const handleProofFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setProofInput(text);
      
      // Auto-parse if valid JSON
      try {
        const parsed = JSON.parse(text);
        setProof(parsed);
      } catch (err) {
        setError('Invalid JSON in proof file');
      }
    } catch (err) {
      setError('Failed to read proof file');
    }
  };

  const handleProofPaste = () => {
    try {
      const parsed = JSON.parse(proofInput);
      setProof(parsed);
      setError(null);
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  const handleVerify = async () => {
    if (!proof) {
      setError('No proof loaded');
      return;
    }

    try {
      setStatus('verifying');
      setError(null);
      setVerificationResult(null);

      const results = {
        signatureValid: false,
        hashMatches: false,
        onChainMatch: false,
        fileHashMatch: false,
        onChainData: null
      };

      // Step 1: Verify PQ signature (stub)
      if (proof.signature && proof.owner_sig_pk) {
        const message = new TextEncoder().encode(
          JSON.stringify({
            schema: proof.schema,
            file_hash_blake3: proof.file_hash_blake3,
            created: proof.created,
            uri: proof.uri,
            meta: proof.meta
          }, Object.keys(proof).filter(k => k !== 'signature' && k !== 'owner_sig_pk').sort())
        );

        // Convert hex signature to bytes
        const signatureBytes = new Uint8Array(
          proof.signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        const publicKeyBytes = new Uint8Array(
          proof.owner_sig_pk.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );

        results.signatureValid = await verifyDilithium(signatureBytes, message, publicKeyBytes);
      }

      // Step 2: Verify on-chain (if we have assetId from anchor)
      if (anchorResult?.assetId) {
        try {
          const onChainAsset = await verifyAssetOnChain(anchorResult.assetId);
          results.onChainData = onChainAsset;
          results.onChainMatch = onChainAsset.blake3 === proof.file_hash_blake3;
        } catch (err) {
          console.warn('On-chain verification failed:', err);
        }
      }

      // Step 3: Re-hash local file if provided
      if (verifyFile) {
        const fileBuffer = await verifyFile.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        const fileHash = await blake3Hex(fileBytes);
        
        results.fileHashMatch = fileHash === proof.file_hash_blake3;
      }

      results.hashMatches = results.signatureValid; // For POC

      setVerificationResult(results);
      setStatus('complete');

    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed');
      setStatus('error');
    }
  };

  const reset = () => {
    setProofInput('');
    setProof(null);
    setVerifyFile(null);
    setStatus('idle');
    setVerificationResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (proofFileInputRef.current) proofFileInputRef.current.value = '';
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <span className="text-green-500 text-xl">✓</span>
        </div>
        <h3 className="text-lg font-semibold">Verify Proof</h3>
      </div>

      {!proof ? (
        <div className="space-y-4">
          <div className="text-sm text-neutral-300 mb-2">
            Upload a proof file or paste proof JSON to verify
          </div>

          {/* Proof file upload */}
          <div>
            <button
              onClick={() => proofFileInputRef.current?.click()}
              className="w-full px-4 py-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition text-sm font-semibold"
            >
              📄 Upload Proof File
            </button>
            <input
              ref={proofFileInputRef}
              type="file"
              accept=".json"
              onChange={handleProofFileUpload}
              className="hidden"
            />
          </div>

          {/* Or paste JSON */}
          <div className="text-center text-xs text-neutral-500">or</div>

          <div>
            <textarea
              value={proofInput}
              onChange={(e) => setProofInput(e.target.value)}
              placeholder='Paste proof JSON here...'
              className="w-full h-32 rounded-xl bg-neutral-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30 transition text-sm font-mono resize-none"
            />
            <button
              onClick={handleProofPaste}
              disabled={!proofInput.trim()}
              className="mt-2 w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Parse JSON
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      ) : status === 'idle' ? (
        <div className="space-y-4">
          {/* Proof loaded */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-green-400 font-medium mb-2">Proof Loaded</div>
            <div className="text-xs text-neutral-400 space-y-1">
              <div><span className="text-neutral-500">Hash:</span> <code className="text-green-300">{truncateHash(proof.file_hash_blake3, 12, 8)}</code></div>
              <div><span className="text-neutral-500">Created:</span> {formatTimestamp(proof.created)}</div>
              {proof.meta?.filename && <div><span className="text-neutral-500">File:</span> {proof.meta.filename}</div>}
            </div>
          </div>

          {/* Optional: Upload original file for re-hash */}
          <div>
            <div className="text-xs text-neutral-400 mb-2">Optional: Upload original file to verify hash</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
              >
                {verifyFile ? `✓ ${verifyFile.name}` : '📁 Choose File'}
              </button>
              {verifyFile && (
                <button
                  onClick={() => setVerifyFile(null)}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition text-sm"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setVerifyFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            className="w-full px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition"
          >
            🔍 Verify Proof
          </button>

          <button
            onClick={reset}
            className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Clear
          </button>
        </div>
      ) : status === 'verifying' ? (
        <div className="text-center py-6">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <div className="text-neutral-300">Verifying proof...</div>
        </div>
      ) : status === 'complete' && verificationResult ? (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl border ${
            verificationResult.signatureValid && (verificationResult.onChainMatch || !anchorResult)
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-yellow-500/10 border-yellow-500/20'
          }`}>
            <div className={`flex items-center gap-2 font-semibold mb-3 ${
              verificationResult.signatureValid && (verificationResult.onChainMatch || !anchorResult)
                ? 'text-green-400'
                : 'text-yellow-400'
            }`}>
              <span>
                {verificationResult.signatureValid && (verificationResult.onChainMatch || !anchorResult) ? '✓' : '⚠️'}
              </span>
              {verificationResult.signatureValid && (verificationResult.onChainMatch || !anchorResult) 
                ? 'Verification Passed'
                : 'Verification Partial'}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">PQ Signature:</span>
                <span className={verificationResult.signatureValid ? 'text-green-400' : 'text-red-400'}>
                  {verificationResult.signatureValid ? '✓ Valid (stub)' : '✗ Invalid'}
                </span>
              </div>

              {anchorResult && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">On-Chain Match:</span>
                  <span className={verificationResult.onChainMatch ? 'text-green-400' : 'text-red-400'}>
                    {verificationResult.onChainMatch ? '✓ Match' : '✗ Mismatch'}
                  </span>
                </div>
              )}

              {verifyFile && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">File Hash Match:</span>
                  <span className={verificationResult.fileHashMatch ? 'text-green-400' : 'text-red-400'}>
                    {verificationResult.fileHashMatch ? '✓ Match' : '✗ Mismatch'}
                  </span>
                </div>
              )}

              {verificationResult.onChainData && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-xs text-neutral-500 mb-1">On-Chain Data</div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div>Owner: <code className="text-green-300">{truncateHash(verificationResult.onChainData.owner, 10, 8)}</code></div>
                    <div>Timestamp: {formatTimestamp(verificationResult.onChainData.timestamp * 1000)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Verify Another Proof
          </button>
        </div>
      ) : null}

      {status === 'error' && error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
            <span>✗</span> Verification Error
          </div>
          <div className="text-sm text-neutral-300">{error}</div>
          <button
            onClick={reset}
            className="mt-3 w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

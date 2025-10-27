import React, { useState, useRef } from 'react';
import { blake3Hex } from '../../lib/quantum/blake3';
import { formatBytes } from '../../lib/quantum/format';

const API_URL = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';

/**
 * FileVerifier - Verify file integrity against stored proofs
 */
export default function FileVerifier({ proofId: existingProofId }) {
  const [file, setFile] = useState(null);
  const [proofId, setProofId] = useState(existingProofId || '');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const verifyFile = async () => {
    if (!file || !proofId) {
      setError('Please select a file and enter a proof ID');
      return;
    }

    // Validate proof ID format
    if (!proofId.startsWith('proof-')) {
      setError('Invalid Proof ID format. It should start with "proof-" (e.g., proof-1234567890-1)');
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      setResult(null);

      // Compute hash of selected file
      const fileBuffer = await file.arrayBuffer();
      const plainBytes = new Uint8Array(fileBuffer);
      const hash = await blake3Hex(plainBytes);

      // Verify against proof
      const response = await fetch(`${API_URL}/proof/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofId,
          blake3: hash
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Verification request failed');
      }

      const data = await response.json();
      setResult(data.result);

    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <span className="text-green-500 text-xl">✓</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Verify File Integrity</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Check if file matches the stored proof
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Proof ID Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Proof ID
          </label>
          <div className="text-xs text-neutral-400 mb-2">
            Enter the Certificate ID from your QuantumVault certificate (starts with "proof-")
          </div>
          <input
            type="text"
            value={proofId}
            onChange={(e) => setProofId(e.target.value)}
            placeholder="proof-1234567890-1"
            className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-green-500/50 font-mono text-sm"
            disabled={!!existingProofId}
          />
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 transition ${
            dragOver
              ? 'border-green-500 bg-green-500/10'
              : 'border-white/20 hover:border-white/40'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            {!file ? (
              <>
                <div className="text-3xl mb-2">📄</div>
                <div className="text-neutral-300 text-sm mb-3">
                  Select file to verify
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition text-sm font-semibold"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleFileSelect(selected);
                  }}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">✓</div>
                <div className="text-neutral-200 font-semibold mb-1">{file.name}</div>
                <div className="text-sm text-neutral-400">{formatBytes(file.size)}</div>
                <button
                  onClick={reset}
                  className="mt-3 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs"
                >
                  Change File
                </button>
              </>
            )}
          </div>
        </div>

        {/* Verify Button */}
        {file && proofId && !result && (
          <button
            onClick={verifyFile}
            disabled={verifying}
            className="w-full px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? '🔍 Verifying...' : '✓ Verify File Integrity'}
          </button>
        )}

        {/* Verification Result */}
        {result && (
          <div className={`p-4 rounded-xl border ${
            result.verified
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className={`flex items-center gap-2 font-semibold mb-2 ${
              result.verified ? 'text-green-400' : 'text-red-400'
            }`}>
              <span>{result.verified ? '✓' : '✗'}</span>
              {result.verified ? 'Verification Passed' : 'Verification Failed'}
            </div>
            
            <div className={`text-sm mb-3 ${
              result.verified ? 'text-green-300' : 'text-red-300'
            }`}>
              {result.message}
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-white/5">
                <span className="text-neutral-400">Original File:</span>{' '}
                <span className="text-white font-semibold">{result.originalFile?.filename}</span>
              </div>
              <div className="p-2 rounded bg-white/5">
                <span className="text-neutral-400">Created:</span>{' '}
                <span className="text-white">{result.originalFile?.created}</span>
              </div>
              <div className="p-2 rounded bg-white/5">
                <span className="text-neutral-400">Size:</span>{' '}
                <span className="text-white">{result.originalFile?.size?.toLocaleString()} bytes</span>
              </div>
              {result.blockchainAnchored && (
                <div className="p-2 rounded bg-white/5">
                  <span className="text-neutral-400">Blockchain:</span>{' '}
                  <span className="text-purple-400">✓ Anchored</span>
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
            >
              Verify Another File
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
              <span>✗</span> Error
            </div>
            <div className="text-sm text-neutral-300">{error}</div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
          <div className="font-semibold mb-1">🔍 How Verification Works</div>
          <div className="text-blue-300/80">
            We compute the BLAKE3 hash of your file and compare it with the hash in the stored proof. If they match, the file is verified as authentic and unmodified.
          </div>
        </div>
      </div>
    </div>
  );
}

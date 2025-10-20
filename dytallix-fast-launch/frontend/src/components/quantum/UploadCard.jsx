import React, { useState, useRef } from 'react';
import { blake3Hex, blake3Stream } from '../../lib/quantum/blake3';
import { encryptEnvelope } from '../../lib/quantum/envelope';
import { generateProofSignature } from '../../lib/quantum/pq-signature';
import { uploadCiphertext } from '../../lib/quantum/api';
import { formatBytes } from '../../lib/quantum/format';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * UploadCard - File upload with client-side encryption
 * 
 * Flow:
 * 1. User selects or drags file
 * 2. Validate size (≤10MB)
 * 3. Hash with BLAKE3
 * 4. Encrypt with XChaCha20-Poly1305
 * 5. Upload to backend
 * 6. Generate proof JSON with PQ signature
 */
export default function UploadCard({ onComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, hashing, encrypting, uploading, generating, complete, error
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    // Reset state
    setError(null);
    setMessage('');
    setProgress(0);
    
    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}`);
      return;
    }
    
    if (selectedFile.size === 0) {
      setError('File is empty');
      return;
    }
    
    setFile(selectedFile);
    setMessage(`Selected: ${selectedFile.name} (${formatBytes(selectedFile.size)})`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const processFile = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    try {
      setStatus('hashing');
      setMessage('Hashing file with BLAKE3...');
      setProgress(0);

      // Step 1: Hash the file
      const fileBuffer = await file.arrayBuffer();
      const plainBytes = new Uint8Array(fileBuffer);
      
      // Use streaming hash for progress
      const hash = await blake3Stream(file, (percent) => {
        setProgress(percent);
      });
      const hashHex = await blake3Hex(plainBytes);
      
      setProgress(100);
      setMessage(`Hash complete: ${hashHex.slice(0, 20)}...`);
      
      // Step 2: Encrypt
      setStatus('encrypting');
      setMessage('Encrypting with XChaCha20-Poly1305...');
      setProgress(0);
      
      const { ciphertext, key, nonce } = await encryptEnvelope(plainBytes);
      
      setProgress(100);
      setMessage('Encryption complete');
      
      // Step 3: Upload ciphertext
      setStatus('uploading');
      setMessage('Uploading encrypted file...');
      setProgress(0);
      
      const uploadResult = await uploadCiphertext(
        ciphertext,
        file.name,
        file.type || 'application/octet-stream',
        hashHex
      );
      
      setProgress(100);
      setMessage(`Uploaded to: ${uploadResult.uri}`);
      
      // Step 4: Generate proof with PQ signature
      setStatus('generating');
      setMessage('Generating proof with PQ signature...');
      setProgress(0);
      
      const proofData = {
        schema: 'https://dytallix.io/proof/v1',
        file_hash_blake3: hashHex,
        created: new Date().toISOString(),
        uri: uploadResult.uri,
        meta: {
          filename: file.name,
          mime: file.type || 'application/octet-stream',
          bytes: file.size,
        }
      };
      
      // Generate PQ signature (stub for POC)
      const { signature, publicKey } = await generateProofSignature(proofData);
      
      const proof = {
        ...proofData,
        owner_sig_pk: publicKey,
        signature: signature
      };
      
      setProgress(100);
      setMessage('Proof generated successfully!');
      setStatus('complete');
      
      // Notify parent
      if (onComplete) {
        onComplete({
          proof,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
          encryption: {
            // Note: In production, store these securely or derive from user key
            // For POC, we just show them once
            key: Array.from(key).map(b => b.toString(16).padStart(2, '0')).join(''),
            nonce: Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')
          }
        });
      }
      
    } catch (err) {
      console.error('Upload process failed:', err);
      setError(err.message || 'Upload failed');
      setStatus('error');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <span className="text-blue-500 text-xl">📁</span>
        </div>
        <h3 className="text-lg font-semibold">Upload Asset</h3>
      </div>

      {/* Drag-drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/20 hover:border-white/40'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          {!file ? (
            <>
              <div className="text-4xl mb-3">⬆️</div>
              <div className="text-neutral-300 mb-2">
                Drag and drop a file here, or click to browse
              </div>
              <div className="text-xs text-neutral-500 mb-4">
                Maximum file size: {formatBytes(MAX_FILE_SIZE)}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition text-sm font-semibold"
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
              <div className="text-4xl mb-3">📄</div>
              <div className="text-neutral-200 font-semibold mb-1">{file.name}</div>
              <div className="text-sm text-neutral-400 mb-4">{formatBytes(file.size)}</div>
              
              {status === 'idle' && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={processFile}
                    className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition"
                  >
                    Process & Upload
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {(status !== 'idle' && status !== 'complete' && status !== 'error') && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-300">{message}</span>
            <span className="text-blue-400 font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {status === 'complete' && (
        <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
            <span>✓</span> Upload Complete!
          </div>
          <div className="text-sm text-neutral-300">{message}</div>
          <button
            onClick={reset}
            className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Upload Another File
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
            <span>✗</span> Error
          </div>
          <div className="text-sm text-neutral-300">{error}</div>
          <button
            onClick={reset}
            className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

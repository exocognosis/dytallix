import React, { useState, useRef } from 'react';
import { blake3Hex } from '../../lib/quantum/blake3';
import { encryptEnvelope } from '../../lib/quantum/envelope';
import { formatBytes } from '../../lib/quantum/format';
import PasswordPrompt from './PasswordPrompt';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_URL = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';

/**
 * ProofGenerationCard - Generate cryptographic proofs using v2 API
 * No file upload required - generates proof from metadata only
 */
export default function ProofGenerationCard({ storageLocation, onComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [encryptedFileData, setEncryptedFileData] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    setError(null);
    setMessage('');
    setProgress(0);
    
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
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const startProcess = () => {
    if (!file) return;
    setShowPasswordPrompt(true);
  };

  const handlePasswordComplete = async (password) => {
    setShowPasswordPrompt(false);
    await processFile(password);
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
  };

  const processFile = async (password) => {
    if (!file) {
      setError('No file selected');
      return;
    }

    try {
      // Step 1: Hash the file
      setStatus('hashing');
      setMessage('Computing BLAKE3 hash...');
      setProgress(0);

      const fileBuffer = await file.arrayBuffer();
      const plainBytes = new Uint8Array(fileBuffer);
      const hash = await blake3Hex(plainBytes);
      
      setProgress(100);
      setMessage(`Hash complete: ${hash.slice(0, 20)}...`);
      
      // Step 2: Encrypt with password
      setStatus('encrypting');
      setMessage('Encrypting with AES-256-GCM...');
      setProgress(0);
      
      const encryptionResult = await encryptEnvelope(plainBytes, password);
      const { ciphertext, salt, nonce, iterations } = encryptionResult;
      
      setProgress(100);
      setMessage('Encryption complete');

      // Store encrypted data for user download
      setEncryptedFileData({
        data: ciphertext,
        filename: `${file.name}.enc`,
        salt,
        nonce,
        iterations
      });
      
      // Step 3: Generate proof (v2 API - no upload!)
      setStatus('generating');
      setMessage('Generating cryptographic proof...');
      setProgress(0);
      
      const proofResponse = await fetch(`${API_URL}/proof/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blake3: hash,
          filename: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          storageLocation: storageLocation?.location || 'user-managed',
          metadata: {
            encrypted: true,
            algorithm: 'AES-256-GCM',
            keyDerivation: 'PBKDF2-SHA256',
            iterations: iterations || 100000,
            originalFilename: file.name,
            encryptedSize: ciphertext.length
          }
        })
      });

      if (!proofResponse.ok) {
        throw new Error('Failed to generate proof');
      }

      const proofResult = await proofResponse.json();
      
      setProgress(100);
      setMessage('Proof generated successfully!');
      setStatus('complete');
      
      // Notify parent with proof and encrypted data
      if (onComplete) {
        onComplete({
          proof: proofResult.proof,
          proofId: proofResult.proofId,
          certificate: proofResult.certificate,
          blake3: hash,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
          encryption: {
            passwordProtected: true,
            algorithm: 'AES-256-GCM',
            salt: salt ? Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('') : null,
            nonce: nonce ? Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('') : null,
            iterations: iterations || 100000
          },
          encryptedFile: {
            data: ciphertext,
            filename: `${file.name}.enc`,
            size: ciphertext.length
          },
          storageLocation: storageLocation
        });
      }
      
    } catch (err) {
      console.error('Proof generation failed:', err);
      setError(err.message || 'Proof generation failed');
      setStatus('error');
    }
  };

  const downloadEncryptedFile = () => {
    if (!encryptedFileData) return;

    const blob = new Blob([encryptedFileData.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = encryptedFileData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setError(null);
    setShowPasswordPrompt(false);
    setEncryptedFileData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <span className="text-blue-500 text-xl">🔐</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">1. Generate Proof</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Encrypt & generate cryptographic proof - no upload required
          </p>
        </div>
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
                Select file to encrypt and generate proof
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
                    onClick={startProcess}
                    className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition"
                  >
                    🔐 Encrypt & Generate Proof
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
            <span>✓</span> Proof Generated!
          </div>
          <div className="text-sm text-neutral-300 mb-3">{message}</div>
          
          {encryptedFileData && (
            <button
              onClick={downloadEncryptedFile}
              className="w-full px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition text-sm font-semibold text-green-300"
            >
              📥 Download Encrypted File
            </button>
          )}
          
          <button
            onClick={reset}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Generate Another Proof
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

      {/* Password Prompt Modal */}
      <PasswordPrompt
        isOpen={showPasswordPrompt}
        file={file}
        onComplete={handlePasswordComplete}
        onCancel={handlePasswordCancel}
      />
    </div>
  );
}

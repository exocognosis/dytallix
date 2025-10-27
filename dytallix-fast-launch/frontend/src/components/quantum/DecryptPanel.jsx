import React, { useState } from 'react';
import { decryptWithPassword } from '../../lib/quantum/envelope';

/**
 * DecryptPanel - Password-based decryption of downloaded encrypted files
 */
export default function DecryptPanel({ downloadedFile, proof, uploadResult }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState(null);
  const [error, setError] = useState(null);

  const handleDecrypt = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    if (!downloadedFile?.encryptedData || !uploadResult?.encryption) {
      setError('Missing decryption data');
      console.error('[DecryptPanel] Missing data:', {
        hasDownloadedFile: !!downloadedFile,
        hasEncryptedData: !!downloadedFile?.encryptedData,
        hasUploadResult: !!uploadResult,
        hasEncryption: !!uploadResult?.encryption,
        downloadedFile,
        uploadResult
      });
      return;
    }

    setDecrypting(true);
    setError(null);

    try {
      // Extract salt and IV from upload result
      const { salt: saltHex, iterations } = uploadResult.encryption;
      const { nonce: nonceHex } = uploadResult.encryption;
      
      if (!saltHex || !nonceHex) {
        throw new Error('Missing encryption parameters');
      }

      // Convert hex strings back to Uint8Arrays
      const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const iv = new Uint8Array(nonceHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));

      // Decrypt the file data
      const decrypted = await decryptWithPassword(
        downloadedFile.encryptedData,
        password,
        salt,
        iv,
        iterations || 100000
      );

      setDecryptedData(decrypted);
      setError(null);

      // Create download link for decrypted file
      const blob = new Blob([decrypted], { type: proof?.meta?.mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = proof?.meta?.filename || 'decrypted-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Decryption failed:', err);
      setError(err.message || 'Decryption failed');
    } finally {
      setDecrypting(false);
    }
  };

  const reset = () => {
    setPassword('');
    setDecryptedData(null);
    setError(null);
  };
  if (!downloadedFile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 opacity-50">
        <div className="text-center">
          <div className="text-3xl mb-3">🔓</div>
          <div className="font-semibold text-neutral-400 mb-2">6. Decrypt Asset</div>
          <div className="text-sm text-neutral-500">Download file first to see decryption options</div>
        </div>
      </div>
    );
  }

  const isPasswordProtected = uploadResult?.encryption?.passwordProtected;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-purple-500 text-xl">🔓</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">6. Decrypt Asset</h3>
          <p className="text-xs text-neutral-400 mt-1">Enter your password to decrypt the downloaded file</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <div className="font-semibold">✓ File Downloaded Successfully</div>
          <div className="mt-1">
            <div>File: {downloadedFile.filename}</div>
            <div>Size: {downloadedFile.size?.toLocaleString()} bytes</div>
            <div className="text-yellow-400 mt-2">
              🔐 File is encrypted with {isPasswordProtected ? 'AES-256-GCM' : 'mock encryption'}
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-400 space-y-1">
          <div><strong>Original:</strong> {proof?.meta?.filename || 'Unknown'}</div>
          <div><strong>Original Size:</strong> {proof?.meta?.bytes?.toLocaleString() || 'Unknown'} bytes</div>
          <div><strong>MIME Type:</strong> {proof?.meta?.mime || 'Unknown'}</div>
        </div>

        {/* Decryption Controls */}
        {!decryptedData && (
          <div className="space-y-4">
            {isPasswordProtected ? (
              <>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="font-semibold text-purple-300 mb-3">🔐 Password Required</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Decryption Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 pr-10"
                          placeholder="Enter the password used during upload"
                          onKeyPress={(e) => e.key === 'Enter' && handleDecrypt()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white"
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDecrypt}
                      disabled={!password || decrypting}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {decrypting ? '🔓 Decrypting...' : '🔓 Decrypt & Download'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                <div className="font-semibold mb-2">⚠️ Mock Encryption Mode</div>
                <div>This file was encrypted with mock encryption (no password). Real password-based encryption is now available for new uploads!</div>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {decryptedData && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <div className="font-semibold">✓ Decryption Complete!</div>
            <div className="mt-1">
              <div>File decrypted and downloaded successfully</div>
              <div>Size: {decryptedData.length.toLocaleString()} bytes</div>
            </div>
            <button
              onClick={reset}
              className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
            >
              Decrypt Another File
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <div className="font-semibold">✗ Decryption Failed</div>
            <div className="mt-1">{error}</div>
            <button
              onClick={() => setError(null)}
              className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

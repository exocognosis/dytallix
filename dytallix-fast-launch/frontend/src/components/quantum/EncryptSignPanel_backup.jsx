import React from 'react';

/**
 * EncryptSignPanel - Visual display of encryption and signing process
 * Shows the step 2: Encrypt & Sign process with technical details
 */
export default function EncryptSignPanel({ uploadResult, isActive = false }) {
  if (!uploadResult) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent p-6 opacity-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-500 text-xl">🔐</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-400">2. Encrypt & Sign</h3>
            <p className="text-xs text-neutral-500 mt-1">File is encrypted with XChaCha20-Poly1305. Post-quantum signature proves authenticity and non-repudiation.</p>
          </div>
        </div>
        <p className="text-sm text-neutral-500">Upload a file to see encryption and signing details</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all duration-500 ${
      isActive 
        ? 'border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent shadow-lg shadow-purple-500/10' 
        : 'border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent'
    } p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-purple-500 text-xl">🔐</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">2. Encrypt & Sign</h3>
          <p className="text-xs text-neutral-400 mt-1">File is encrypted with XChaCha20-Poly1305. Post-quantum signature proves authenticity and non-repudiation.</p>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        {/* Encryption Details */}
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <span>🔐</span> Symmetric Encryption
          </div>
          <div className="space-y-1 text-xs text-neutral-300">
            <div><strong>Algorithm:</strong> XChaCha20-Poly1305</div>
            <div><strong>Key Size:</strong> 256-bit</div>
            <div><strong>Nonce:</strong> 192-bit (XChaCha20)</div>
            <div><strong>MAC:</strong> Poly1305 authenticator</div>
          </div>
        </div>

        {/* Post-Quantum Signature */}
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="font-semibold text-green-300 mb-2 flex items-center gap-2">
            <span>📝</span> Post-Quantum Signature
          </div>
          <div className="space-y-1 text-xs text-neutral-300">
            <div><strong>Scheme:</strong> ML-DSA (Dilithium)</div>
            <div><strong>Security Level:</strong> NIST Level 3</div>
            <div><strong>Key Size:</strong> 1952 bytes (public)</div>
            <div><strong>Signature Size:</strong> ~3293 bytes</div>
          </div>
        </div>

        {/* Envelope Structure */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <span>📦</span> Envelope Structure
          </div>
          <div className="space-y-1 text-xs text-neutral-300">
            <div><strong>Version:</strong> QuantumVault v1.0</div>
            <div><strong>Metadata:</strong> File info, timestamps</div>
            <div><strong>Ciphertext:</strong> Encrypted file data</div>
            <div><strong>Authentication:</strong> PQ signature</div>
          </div>
        </div>

        {/* Security Properties */}
        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="font-semibold text-orange-300 mb-2 flex items-center gap-2">
            <span>🛡️</span> Security Properties
          </div>
          <div className="space-y-1 text-xs text-neutral-300">
            <div><strong>Confidentiality:</strong> ✓ AES-level security</div>
            <div><strong>Integrity:</strong> ✓ Authenticated encryption</div>
            <div><strong>Non-repudiation:</strong> ✓ Digital signature</div>
            <div><strong>Quantum-resistance:</strong> ✓ NIST PQC standards</div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="text-xs text-neutral-400 space-y-1">
          <div><strong>File Hash:</strong> {uploadResult.blake3?.slice(0, 16)}...{uploadResult.blake3?.slice(-8)}</div>
          <div><strong>Encrypted Size:</strong> {uploadResult.file?.size?.toLocaleString()} bytes</div>
          <div><strong>Storage URI:</strong> {uploadResult.uri}</div>
        </div>
      </div>
    </div>
  );
}

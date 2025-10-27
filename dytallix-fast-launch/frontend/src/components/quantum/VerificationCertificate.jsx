import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';

/**
 * VerificationCertificate - Display and download verification certificates
 */
export default function VerificationCertificate({ 
  proof, 
  proofId, 
  certificate, 
  storageLocation,
  onAnchor,
  anchored,
  anchoring 
}) {
  const [downloading, setDownloading] = useState(false);

  const downloadCertificate = async () => {
    try {
      setDownloading(true);
      
      const response = await fetch(`${API_URL}/certificate/${proofId}/download`);
      if (!response.ok) throw new Error('Failed to download certificate');
      
      const data = await response.json();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantumvault-certificate-${proofId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Certificate download error:', error);
      alert('Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  const viewCertificate = () => {
    window.open(`${API_URL}/certificate/${proofId}`, '_blank');
  };

  if (!proof && !certificate) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent p-6 opacity-50">
        <div className="text-center">
          <div className="text-3xl mb-3">📜</div>
          <div className="font-semibold text-neutral-400 mb-2">Verification Certificate</div>
          <div className="text-sm text-neutral-500">Generate a proof to see certificate</div>
        </div>
      </div>
    );
  }

  const certData = certificate || proof;
  const fileData = certData.file || certData.proof?.file;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-purple-500 text-xl">📜</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Verification Certificate</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Cryptographic proof of file integrity
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Certificate Header */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <div className="text-center mb-3">
            <div className="text-2xl mb-2">✓</div>
            <div className="font-bold text-lg text-purple-200">QuantumVault Certificate</div>
            <div className="text-xs text-purple-300/80">Cryptographic Verification Service v2.0</div>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40">
            <div className="flex items-center justify-between mb-1">
              <div className="text-purple-300 text-xs font-semibold">Certificate ID (for verification)</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(proofId);
                  alert('Proof ID copied to clipboard!');
                }}
                className="px-2 py-1 rounded bg-purple-500/30 hover:bg-purple-500/40 transition text-xs text-purple-200"
              >
                📋 Copy ID
              </button>
            </div>
            <div className="font-mono text-purple-200 break-all text-sm">{proofId}</div>
            <div className="text-xs text-purple-300/60 mt-1">
              Use this ID to verify your file later
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-neutral-400 text-xs mb-1">File Name</div>
            <div className="font-semibold text-white">{fileData?.filename}</div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-neutral-400 text-xs mb-1">BLAKE3 Hash</div>
            <div className="font-mono text-xs text-green-300 break-all">
              {fileData?.blake3}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-neutral-400 text-xs mb-1">File Size</div>
              <div className="font-semibold text-white">{fileData?.size?.toLocaleString()} bytes</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-neutral-400 text-xs mb-1">Algorithm</div>
              <div className="font-semibold text-white">BLAKE3</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-neutral-400 text-xs mb-1">Issue Date</div>
            <div className="font-semibold text-white">
              {certData.created || certData.proof?.created || new Date().toISOString()}
            </div>
          </div>

          {certData.storage?.location && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-neutral-400 text-xs mb-1">Storage Location</div>
              <div className="font-mono text-xs text-blue-300 break-all">
                {certData.storage.location}
              </div>
              <div className="text-neutral-500 text-xs mt-1">
                User-controlled storage
              </div>
            </div>
          )}

          {storageLocation && !certData.storage?.location && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-neutral-400 text-xs mb-1">Storage Location</div>
              <div className="font-mono text-xs text-blue-300 break-all">
                {storageLocation.location}
              </div>
              <div className="text-neutral-500 text-xs mt-1">
                {storageLocation.name} - User-controlled storage
              </div>
            </div>
          )}
        </div>

        {/* Verification Status */}
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
            <span>✓</span> Cryptographically Verified
          </div>
          <div className="text-xs text-green-300/80">
            This certificate proves the integrity and authenticity of the file using post-quantum cryptographic standards.
          </div>
        </div>

        {/* Blockchain Anchoring */}
        {!anchored && onAnchor && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-orange-400 mb-1">⚓ Blockchain Anchoring</div>
                <div className="text-xs text-orange-300/80">
                  Register this proof on the Dytallix blockchain for immutable timestamping
                </div>
              </div>
            </div>
            <button
              onClick={onAnchor}
              disabled={anchoring}
              className="w-full px-4 py-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 transition text-sm font-semibold text-orange-300 disabled:opacity-50"
            >
              {anchoring ? '⏳ Anchoring on blockchain...' : '⚓ Anchor Proof on Blockchain'}
            </button>
          </div>
        )}

        {/* Blockchain Anchored Status */}
        {anchored && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
              <span>⚓</span> Anchored on Blockchain
            </div>
            <div className="text-xs text-green-300/80 mb-2">
              This proof has been permanently registered on the Dytallix blockchain
            </div>
            {proof?.blockchainTxHash && (
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <div className="text-neutral-400 text-xs mb-1">Transaction Hash</div>
                <div className="font-mono text-xs text-green-300 break-all">
                  {proof.blockchainTxHash}
                </div>
              </div>
            )}
            {proof?.blockchainBlock && (
              <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/10">
                <div className="text-neutral-400 text-xs mb-1">Block Height</div>
                <div className="font-semibold text-white">
                  #{proof.blockchainBlock}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={viewCertificate}
            className="px-4 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition text-sm font-semibold text-purple-300"
          >
            🔍 View Full Certificate
          </button>
          
          <button
            onClick={downloadCertificate}
            disabled={downloading}
            className="px-4 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition text-sm font-semibold text-blue-300 disabled:opacity-50"
          >
            {downloading ? '⏳ Downloading...' : '📥 Download JSON'}
          </button>
        </div>

        {/* Info Box */}
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          <div className="font-semibold mb-1">📌 Certificate Uses</div>
          <ul className="space-y-1 text-yellow-300/80">
            <li>• Prove file integrity for compliance audits</li>
            <li>• Verify authenticity before sharing with third parties</li>
            <li>• Create immutable audit trails</li>
            <li>• Meet regulatory requirements (GDPR, HIPAA, SOX)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

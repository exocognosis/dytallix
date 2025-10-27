import React, { useState } from 'react';
import { downloadAsset } from '../../lib/quantum/api';

/**
 * DownloadCard - Download and decrypt uploaded files
 */
export default function DownloadCard({ uploadResult, encryptionKeys }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    if (!uploadResult?.uri) {
      setError('No upload result available');
      return;
    }

    setDownloading(true);
    setError(null);
    setDownloadResult(null);

    try {
      console.log('[DownloadCard] Starting download for URI:', uploadResult.uri);
      
      const result = await downloadAsset(uploadResult.uri, encryptionKeys);
      
      console.log('[DownloadCard] Download successful:', result);
      setDownloadResult(result);
      
      // Create download link for the encrypted file
      const blob = new Blob([result.encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `encrypted_${uploadResult.uri.split('/').pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('[DownloadCard] Download failed:', err);
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const isActive = !!uploadResult?.uri;

  return (
    <div className={`rounded-2xl border p-6 transition-all ${
      isActive 
        ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent' 
        : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isActive ? 'bg-orange-500/20' : 'bg-white/10'
        }`}>
          <span className={`text-xl transition-all ${isActive ? 'text-orange-400' : 'text-neutral-500'}`}>
            📥
          </span>
        </div>
        <div>
          <div className={`font-semibold transition-all ${isActive ? 'text-orange-400' : 'text-neutral-400'}`}>
            5. Download Asset
          </div>
          <div className="text-xs text-neutral-500">Retrieve your encrypted file</div>
        </div>
      </div>

      {!isActive ? (
        <div className="text-center py-8">
          <div className="text-neutral-500 text-sm">Upload a file first to enable download</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm">
            <div className="text-neutral-400 mb-2">Available for Download:</div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="font-mono text-xs text-neutral-300 break-all">
                {uploadResult.uri}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                BLAKE3: {uploadResult.blake3?.substring(0, 32)}...
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {downloadResult && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <div className="font-semibold">✓ Download Successful</div>
              <div className="text-neutral-300 mt-1">
                Downloaded {downloadResult.size} bytes (encrypted)
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                File saved to your downloads folder
              </div>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full px-4 py-3 rounded-xl font-semibold transition-all ${
              downloading 
                ? 'bg-orange-500/20 text-orange-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:opacity-90'
            }`}
          >
            {downloading ? 'Downloading...' : '📥 Download Encrypted File'}
          </button>

          <div className="text-xs text-neutral-500 text-center">
            ⚠️ File is encrypted - you'll need the decryption key to restore the original
          </div>
        </div>
      )}
    </div>
  );
}

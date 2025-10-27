import React, { useState } from 'react';
import { downloadAsset } from '../../lib/quantum/api';

/**
 * DownloadPanel - Download and decrypt uploaded files
 */
export default function DownloadPanel({ uploadResult, proof, onComplete }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  // Debug logging
  console.log('[DownloadPanel] Props received:', {
    hasUploadResult: !!uploadResult,
    uploadResult: uploadResult,
    hasProof: !!proof,
    proof: proof
  });

  const handleDownload = async () => {
    // Try multiple possible locations for the URI
    const uri = uploadResult?.uri || uploadResult?.proof?.uri || proof?.uri;
    
    if (!uri) {
      console.error('[DownloadPanel] No URI found in:', { uploadResult, proof });
      setDownloadError('No upload result or URI available');
      return;
    }

    console.log('[DownloadPanel] Found URI:', uri);

    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      console.log('[DownloadPanel] Starting download for URI:', uri);
      
      const result = await downloadAsset(uri);
      
      if (result.success) {
        // Create a blob for download
        const blob = new Blob([result.encryptedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `${proof?.meta?.filename || 'download'}.enc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setDownloadSuccess({
          filename: `${proof?.meta?.filename || 'download'}.enc`,
          size: result.size,
          encrypted: result.needsDecryption,
          encryptedData: result.encryptedData  // Store for potential decryption
        });
        
        // Notify parent component about successful download
        if (onComplete) {
          onComplete({
            encryptedData: result.encryptedData,
            size: result.size,
            filename: proof?.meta?.filename || 'download'
          });
        }
      }
    } catch (error) {
      console.error('[DownloadPanel] Download error:', error);
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!uploadResult) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 opacity-50">
        <div className="text-center">
          <div className="text-3xl mb-3">📥</div>
          <div className="font-semibold text-neutral-400 mb-2">Download Asset</div>
          <div className="text-sm text-neutral-500">Upload a file first</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
      <div className="text-center mb-4">
        <div className="text-3xl mb-3">📥</div>
        <div className="font-semibold text-lg mb-2">Download Asset</div>
        <div className="text-sm text-neutral-400">Retrieve your encrypted file</div>
      </div>

      {downloadError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <div className="font-semibold">Download Failed</div>
          <div className="mt-1">{downloadError}</div>
        </div>
      )}

      {downloadSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <div className="font-semibold">✓ Downloaded Successfully</div>
          <div className="mt-1">
            <div>File: {downloadSuccess.filename}</div>
            <div>Size: {downloadSuccess.size.toLocaleString()} bytes</div>
            {downloadSuccess.encrypted && (
              <div className="text-yellow-400 mt-1">⚠️ File is encrypted - you need the decryption key</div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Show available info */}
        <div className="text-xs text-neutral-400">
          <div><strong>URI:</strong> {uploadResult?.uri || uploadResult?.proof?.uri || proof?.uri || 'Not available'}</div>
          <div><strong>Original:</strong> {proof?.meta?.filename || 'Unknown'}</div>
          <div><strong>Size:</strong> {proof?.meta?.bytes?.toLocaleString() || 'Unknown'} bytes</div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || !uploadResult?.uri && !uploadResult?.proof?.uri && !proof?.uri}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Downloading...
            </div>
          ) : (
            '📥 Download Encrypted File'
          )}
        </button>

        <div className="text-xs text-neutral-500 text-center">
          Downloads the encrypted file (.enc) to your device
        </div>
      </div>
    </div>
  );
}

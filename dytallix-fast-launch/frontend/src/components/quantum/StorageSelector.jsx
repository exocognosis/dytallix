import React, { useState } from 'react';

/**
 * StorageSelector - Let users choose where to store their encrypted files
 * 
 * Options:
 * - Local Download (default)
 * - Cloud Storage (S3, Azure, GCS)
 * - IPFS
 * - Custom URL
 * - User-Managed (no upload)
 */
export default function StorageSelector({ onSelect, selectedStorage }) {
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const storageOptions = [
    {
      id: 'local',
      name: 'Local Download',
      icon: '💾',
      description: 'Download encrypted file to your device',
      subtext: 'You manually upload to your chosen storage',
      location: 'local://user-device',
      recommended: true
    },
    {
      id: 'user-managed',
      name: 'User-Managed Storage',
      icon: '👤',
      description: 'You handle storage - we only verify proofs',
      subtext: 'Most flexible option for enterprises',
      location: 'user-managed',
      popular: true
    },
    {
      id: 's3',
      name: 'Amazon S3',
      icon: '☁️',
      description: 'You upload to your AWS S3 bucket',
      subtext: 'Requires your own AWS account & credentials',
      location: 's3://your-bucket/path',
      enterprise: true
    },
    {
      id: 'ipfs',
      name: 'IPFS',
      icon: '🌐',
      description: 'You upload to IPFS network',
      subtext: 'Use your own IPFS node or Pinata/Infura',
      location: 'ipfs://Qm...',
      decentralized: true
    },
    {
      id: 'azure',
      name: 'Azure Blob',
      icon: '☁️',
      description: 'You upload to Azure Blob Storage',
      subtext: 'Requires your own Azure account & credentials',
      location: 'azure://container/path',
      enterprise: true
    },
    {
      id: 'custom',
      name: 'Custom URL',
      icon: '🔗',
      description: 'You provide your own storage URL',
      subtext: 'Any HTTP/HTTPS accessible location',
      location: customUrl || 'https://your-server.com/files/',
      custom: true
    }
  ];

  const handleSelect = (option) => {
    if (option.id === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      onSelect(option);
    }
  };

  const handleCustomSubmit = () => {
    if (customUrl) {
      const customOption = storageOptions.find(o => o.id === 'custom');
      onSelect({
        ...customOption,
        location: customUrl
      });
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Choose Storage Location</h3>
        <p className="text-sm text-neutral-400 mb-3">
          You control where your encrypted files are stored
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <span className="text-blue-400 text-sm">ℹ️</span>
          <span className="text-xs text-neutral-300">
            QuantumVault only stores proofs, not files. You manage your own storage.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {storageOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option)}
            className={`relative p-4 rounded-xl border-2 transition-all text-left ${
              selectedStorage?.id === option.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10'
            }`}
          >
            {/* Badge */}
            {option.recommended && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                Recommended
              </div>
            )}
            {option.popular && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
                Popular
              </div>
            )}
            {option.enterprise && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
                Enterprise
              </div>
            )}
            {option.decentralized && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold">
                Web3
              </div>
            )}

            {/* Content */}
            <div className="flex items-start gap-3">
              <div className="text-3xl">{option.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-white mb-1">{option.name}</div>
                <div className="text-xs text-neutral-400 mb-1">{option.description}</div>
                {option.subtext && (
                  <div className="text-xs text-neutral-500 italic mb-2">
                    {option.subtext}
                  </div>
                )}
                <div className="text-xs text-neutral-600 font-mono break-all">
                  {option.location}
                </div>
              </div>
            </div>

            {/* Selection indicator */}
            {selectedStorage?.id === option.id && (
              <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Custom URL Input */}
      {showCustomInput && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <label className="block text-sm font-medium text-blue-300 mb-2">
            Enter Custom Storage URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-server.com/storage/"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customUrl}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Selected Storage Info */}
      {selectedStorage && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
            <span>✓</span> Storage Location Selected
          </div>
          <div className="text-sm text-neutral-300">
            <strong>{selectedStorage.name}:</strong> {selectedStorage.location}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
        <div className="font-semibold mb-2">🔐 Zero-Knowledge Storage</div>
        <div className="text-xs text-yellow-300/80">
          Your files are encrypted before leaving your device. QuantumVault only generates cryptographic proofs - you maintain full control over where your encrypted files are stored.
        </div>
      </div>
    </div>
  );
}

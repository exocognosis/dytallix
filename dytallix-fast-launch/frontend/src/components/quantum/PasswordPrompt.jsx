import React, { useState } from 'react';

/**
 * PasswordPrompt - Modal/overlay to collect encryption password
 */
export default function PasswordPrompt({ isOpen, file, onComplete, onCancel }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    setError(null);

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Call completion handler with password
    if (onComplete) {
      onComplete(password);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-neutral-900 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-500 text-2xl">🔐</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Set Encryption Password</h3>
            <p className="text-sm text-neutral-400">Choose a strong password to encrypt your file</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <div className="font-semibold">Error</div>
            <div className="mt-1">{error}</div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="text-sm text-neutral-400">
            <div><strong>File:</strong> {file?.name}</div>
            <div><strong>Size:</strong> {file?.size?.toLocaleString()} bytes</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Encryption Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 pr-10"
                placeholder="Enter a strong password"
                autoFocus
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

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50"
              placeholder="Confirm your password"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <div className="text-xs text-neutral-500 mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="font-semibold text-yellow-400 mb-1">⚠️ Important Security Notice</div>
          <div>This password encrypts your file using AES-256-GCM. <strong>We cannot recover lost passwords</strong> - make sure to remember it or store it securely!</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!password || password !== confirmPassword}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔐 Encrypt File
          </button>
        </div>
      </div>
    </div>
  );
}

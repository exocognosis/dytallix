import React, { useState } from 'react';
import { encryptAsset } from '../../lib/quantum/crypto';

/**
 * PasswordPanel - Collect user password for encryption
 */
export default function PasswordPanel({ file, onComplete }) {
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

    // Call parent with password
    if (onComplete) {
      onComplete({ password });
    }
  };

  if (!file) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 opacity-50">
        <div className="text-center">
          <div className="text-3xl mb-3">🔐</div>
          <div className="font-semibold text-neutral-400 mb-2">Set Password</div>
          <div className="text-sm text-neutral-500">Upload file first</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-purple-500 text-xl">🔐</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">2. Set Password</h3>
          <p className="text-xs text-neutral-400 mt-1">Choose a strong password for encryption</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-xs text-neutral-400 mb-4">
          <div><strong>File:</strong> {file.name}</div>
          <div><strong>Size:</strong> {file.size.toLocaleString()} bytes</div>
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
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 pr-10"
              placeholder="Enter a strong password"
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
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50"
            placeholder="Confirm your password"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!password || password !== confirmPassword}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔐 Set Encryption Password
        </button>

        <div className="text-xs text-neutral-500 text-center">
          <div className="mb-2"><strong>Important:</strong> Remember this password!</div>
          <div>You'll need it to decrypt your file later. We cannot recover lost passwords.</div>
        </div>
      </div>
    </div>
  );
}

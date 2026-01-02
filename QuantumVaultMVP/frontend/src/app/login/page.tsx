'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authAPI } from '@/lib/api';

const LOGIN_BG = '#05162c';
const LOGIN_SESSION_KEY = 'qv_login_seen_session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeTitle, setWelcomeTitle] = useState('Welcome to QuantumVault');

  useEffect(() => {
    try {
      const hasSeenThisSession = sessionStorage.getItem(LOGIN_SESSION_KEY) === '1';
      if (hasSeenThisSession) {
        setWelcomeTitle('Welcome Back to QuantumVault');
      } else {
        sessionStorage.setItem(LOGIN_SESSION_KEY, '1');
        setWelcomeTitle('Welcome to QuantumVault');
      }
    } catch {
      setWelcomeTitle('Welcome to QuantumVault');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.access_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: `radial-gradient(1100px circle at 28% 62%, rgba(34, 211, 238, 0.10), transparent 56%),
          radial-gradient(900px circle at 82% 44%, rgba(59, 130, 246, 0.14), transparent 60%),
          ${LOGIN_BG}`,
      }}
    >
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-center lg:justify-items-end gap-y-10 lg:gap-y-0 lg:gap-x-12">
          <div className="flex justify-center lg:justify-end w-full">
            <Image
              src="/QuantumVault.png"
              alt="QuantumVault - PQC Enterprise Security by Dytallix"
              width={1200}
              height={628}
              priority
              sizes="(max-width: 1024px) 90vw, 900px"
              className="w-full max-w-[420px] sm:max-w-[520px] lg:max-w-[900px] h-auto drop-shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            />
          </div>

          <div className="w-full flex flex-col items-center lg:items-start">
            <div className="w-full max-w-sm bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-700/50">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white">{welcomeTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">Sign in to your QuantumVault account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/30 border border-slate-600/70 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="admin@quantumvault.local"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/30 border border-slate-600/70 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="bg-red-900/35 border border-red-700/70 text-red-200 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

              <div className="mt-6 pt-5 border-t border-slate-700/50 text-center text-slate-400">
                <p className="text-xs font-medium tracking-wide">Default credentials:</p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  admin@quantumvault.local / QuantumVault2024!
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block" />
          <div className="mt-4 text-center lg:text-left text-xs text-slate-500/90">
            Powered by Dytallix • Quantum-Safe Infrastructure
          </div>
        </div>
      </div>
    </div>
  );
}

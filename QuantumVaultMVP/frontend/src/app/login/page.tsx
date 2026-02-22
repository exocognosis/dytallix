'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Lock, Mail } from 'lucide-react';

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
        setWelcomeTitle('Welcome Back');
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
      await authAPI.login(email, password);
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
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Background Image Container */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/QuantumVaultMVP/login-bg-final.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Overlay Content Container */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
        {/* Left Column: Empty (Spacer for the background logo) */}
        <div className="hidden lg:block" />

        {/* Right Column: Login Form */}
        <div className="flex items-center justify-center lg:justify-start lg:pl-12 px-6">
          <div className="w-full max-w-md">
            <GlassPanel variant="default" className="p-8 backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white">{welcomeTitle}</h2>
                <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium"
                      placeholder="admin@quantumvault.local"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2"
                  >
                    <span>⚠️</span> {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/10 hover:border-white/20 transition-all rounded-lg"
                  size="lg"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-xs text-gray-400 mb-2">Development credentials:</p>
                <code className="block text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400 font-mono">
                  Admin: admin@quantumvault.local / QuantumVault2024!
                </code>
                <code className="block mt-2 text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400 font-mono">
                  Engineer: engineer@quantumvault.local / Engineer2024!
                </code>
                <code className="block mt-2 text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400 font-mono">
                  Viewer: viewer@quantumvault.local / Viewer2024!
                </code>
              </div>

              <div className="mt-6 text-center">
                <p className="text-[10px] text-gray-600 tracking-wide uppercase">
                  BUILT ON DYTALLIX
                </p>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div >
    </div >
  );
}

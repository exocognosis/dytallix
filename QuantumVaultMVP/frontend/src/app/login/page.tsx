'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Branding */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center">
            <Image
              src="/QuantumVault.png"
              alt="QuantumVault"
              width={400}
              height={400}
              priority
              className="w-full max-w-[320px] h-auto mb-8 drop-shadow-2xl"
            />
            <h1 className="text-4xl font-bold text-white mb-4 gradient-text">
              QuantumVault
            </h1>
            <p className="text-lg text-muted max-w-md">
              Enterprise-grade post-quantum cryptographic key management and attestation platform.
            </p>
          </div>

          {/* Right: Login Form */}
          <div className="flex justify-center lg:justify-end">
            <GlassPanel variant="default" className="w-full max-w-md p-8">
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mb-6">
                <Image
                  src="/QuantumVault.png"
                  alt="QuantumVault"
                  width={120}
                  height={120}
                  priority
                  className="drop-shadow-lg"
                />
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white">{welcomeTitle}</h2>
                <p className="mt-2 text-sm text-muted">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition"
                      placeholder="admin@quantumvault.local"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-xs text-muted mb-2">Default credentials:</p>
                <code className="text-xs bg-white/5 px-3 py-1.5 rounded border border-white/10 text-white/70">
                  admin@quantumvault.local / QuantumVault2024!
                </code>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted">
                  Powered by <span className="text-white/80">Dytallix</span> • Quantum-Safe Infrastructure
                </p>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

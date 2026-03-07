import { redirect } from 'next/navigation';

import LoginForm from '@/components/login-form';
import { getServerSessionUser } from '@/lib/auth';

export default async function LoginPage() {
  const user = await getServerSessionUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-dark-base px-4 py-8 text-dt-1 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.82),transparent_36%),linear-gradient(180deg,#020617_0%,#07111f_52%,#0b1728_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10 bg-accent/5 blur-3xl" />

      <section className="relative w-full max-w-xl rounded-[32px] border border-dark-border bg-dark-surface/92 p-8 shadow-[0_36px_120px_-48px_rgba(2,6,23,0.95)] backdrop-blur-2xl sm:p-10">
        <div className="mb-8 space-y-4">
          <span className="inline-flex items-center rounded-full border border-dark-border-hover bg-dark-elevated px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-dt-3">
            Internal Access
          </span>
          <div>
            <h1 className="text-[clamp(1rem,5vw,2.15rem)] font-semibold tracking-tight whitespace-nowrap text-dt-1">
              Sign in to QuantumVault CRM
            </h1>
          </div>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
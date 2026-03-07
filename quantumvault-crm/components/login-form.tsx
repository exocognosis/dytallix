'use client';

import { FormEvent, useState, useTransition } from 'react';

import { withBasePath } from '@/lib/base-path';

export default function LoginForm() {
  const [email, setEmail] = useState('rick@dytallix.com');
  const [password, setPassword] = useState('QVcrm123');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(withBasePath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Login failed');
      }

      startTransition(() => {
        window.location.assign(withBasePath('/dashboard'));
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-dt-2">
        <span className="sr-only">Work Email</span>
        <input
          className="w-full rounded-2xl border border-dark-border bg-dark-input px-4 py-3.5 text-base text-dt-1 outline-none transition placeholder:text-dt-4 focus:border-accent focus:ring-2 focus:ring-accent/20"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@dytallix.com"
          required
        />
      </label>

      <label className="block text-sm font-medium text-dt-2">
        <span className="mb-2 block">Password</span>
        <input
          className="w-full rounded-2xl border border-dark-border bg-dark-input px-4 py-3.5 text-base text-dt-1 outline-none transition placeholder:text-dt-4 focus:border-accent focus:ring-2 focus:ring-accent/20"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Signing In...' : 'Login'}
      </button>
    </form>
  );
}
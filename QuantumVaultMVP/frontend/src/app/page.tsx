"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiBase, setTokens } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const isDevBuild = process.env.NODE_ENV !== "production";
  const [email, setEmail] = useState(isDevBuild ? "hello@dytallix.com" : "");
  const [password, setPassword] = useState(isDevBuild ? "password12345" : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Login failed");
        return;
      }
      setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessExpiresAt: data.access_expires_at,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <div className="grid items-stretch gap-4 rounded-2xl border border-slate-800/40 bg-transparent p-4 shadow-2xl md:p-6 lg:grid-cols-[1.618fr_1fr] lg:gap-6">
            <div className="flex min-h-[220px] items-center justify-center lg:min-h-0 lg:justify-start">
              <div className="relative h-full w-full">
                <Image
                  src="/QuantumVault.png"
                  alt="QuantumVault"
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 80vw"
                  className="object-contain"
                />
              </div>
            </div>

            <div className="w-full max-w-md justify-self-center self-center rounded-2xl border border-slate-800/60 bg-[#031429] p-8 shadow-2xl">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
                    autoComplete="current-password"
                  />
                </div>

                {error ? (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-to-r from-teal-600 to-teal-500 px-3 py-2 text-sm font-medium text-slate-950 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>

                <div className="text-xs text-slate-500">
                  Tip: set <span className="font-medium">QV_ADMIN_EMAIL</span> and <span className="font-medium">QV_ADMIN_PASSWORD</span> on the backend.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

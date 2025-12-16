"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch, clearTokens, getTokens } from "@/lib/api";

type KPIs = {
  total_assets: number;
  non_pqc_assets: number;
  high_critical_at_risk: number;
  wrapped_pqc_count: number;
  attested_count: number;
  policy_coverage_percent: number;
};

type Charts = {
  risk_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  migration_progress_percent: number;
  timeline: Array<{ captured_at: string; totals: any }>;
};

type Asset = {
  id: string;
  asset_type: string;
  environment: string;
  name: string;
  locator: string;
  pqc_compliance: string;
  risk_level: string;
  quantum_risk_score: number;
  status: string;
  last_scanned_at?: string;
};

type Policy = {
  id: string;
  name: string;
  mode: "MONITOR_ONLY" | "ENFORCE";
  risk_threshold: number;
  active: boolean;
};

type Attestation = {
  id: string;
  asset_id: string;
  tx_hash: string;
  block_number?: number;
  status: string;
  created_at: string;
};

const tabs = ["Assets", "Policies", "Attestations", "Anchoring Jobs"] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Assets");
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = getTokens();
    if (!t?.accessToken) router.replace("/");
  }, [router]);

  async function refreshAll() {
    setError(null);
    try {
      const [k, c, a] = await Promise.all([
        apiFetch<KPIs>("/dashboard/kpis"),
        apiFetch<Charts>("/dashboard/charts"),
        apiFetch<Asset[]>("/assets"),
      ]);
      setKpis(k);
      setCharts(c);
      setAssets(a);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dashboard");
    }
  }

  useEffect(() => {
    refreshAll();
    const i = setInterval(refreshAll, 8000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (tab === "Policies") setPolicies(await apiFetch<Policy[]>("/policies"));
        if (tab === "Attestations")
          setAttestations(await apiFetch<Attestation[]>("/attestations"));
      } catch (e: any) {
        setError(e?.message ?? "Failed to load tab data");
      }
    })();
  }, [tab]);

  async function bulkWrap() {
    setBusy("Wrapping...");
    setError(null);
    try {
      await apiFetch<{ job_id: string }>("/wrap", {
        method: "POST",
        body: JSON.stringify({ asset_ids: selectedIds }),
      });
      setSelected({});
      await refreshAll();
    } catch (e: any) {
      setError(e?.message ?? "Wrap failed");
    } finally {
      setBusy(null);
    }
  }

  async function bulkAttest() {
    setBusy("Attesting...");
    setError(null);
    try {
      await apiFetch<{ job_id: string }>("/attest", {
        method: "POST",
        body: JSON.stringify({ asset_ids: selectedIds }),
      });
      setSelected({});
      await refreshAll();
    } catch (e: any) {
      setError(e?.message ?? "Attestation failed");
    } finally {
      setBusy(null);
    }
  }

  function signOut() {
    clearTokens();
    router.push("/");
  }

  const riskBars = useMemo(() => {
    if (!charts) return [];
    return Object.entries(charts.risk_distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [charts]);

  const statusBars = useMemo(() => {
    if (!charts) return [];
    return Object.entries(charts.status_distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [charts]);

  const timeline = useMemo(() => {
    if (!charts) return [];
    return [...charts.timeline]
      .reverse()
      .map((p) => ({
        t: new Date(p.captured_at).toLocaleDateString(),
        wrapped: Number(p.totals?.wrapped_pqc_count ?? 0),
        nonPqc: Number(p.totals?.non_pqc_assets ?? 0),
      }));
  }, [charts]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/DytallixLogo.png"
              alt="Dytallix"
              width={34}
              height={34}
              priority
            />
            <div className="text-lg font-semibold tracking-wide">QUANTUMVAULT</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">{busy ?? ""}</div>
            <button
              onClick={signOut}
              className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard title="Total Assets" value={kpis?.total_assets ?? 0} />
          <KpiCard title="Non-PQC Assets" value={kpis?.non_pqc_assets ?? 0} accent="text-red-300" />
          <KpiCard title="High/Critical At Risk" value={kpis?.high_critical_at_risk ?? 0} accent="text-red-300" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard title="Wrapped PQC" value={kpis?.wrapped_pqc_count ?? 0} accent="text-teal-300" />
          <KpiCard title="Attested" value={kpis?.attested_count ?? 0} accent="text-teal-300" />
          <KpiCard title="Policy Coverage %" value={`${kpis?.policy_coverage_percent ?? 0}%`} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Risk Level Distribution">
            <div className="h-48">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskBars} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1220",
                        border: "1px solid #1f2937",
                      }}
                    />
                    <Bar dataKey="value" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-lg border border-slate-800/60 bg-slate-950/40" />
              )}
            </div>
          </Panel>

          <Panel title="Status Distribution">
            <div className="h-48">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBars} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1220",
                        border: "1px solid #1f2937",
                      }}
                    />
                    <Bar dataKey="value" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-lg border border-slate-800/60 bg-slate-950/40" />
              )}
            </div>
          </Panel>

          <Panel title="ECC → PQC Migration">
            <div className="flex h-48 flex-col justify-between">
              <div className="text-sm text-slate-400">Progress</div>
              <div className="text-3xl font-semibold text-teal-300">
                {charts?.migration_progress_percent ?? 0}%
              </div>
              <div className="h-28">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="t" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#0b1220",
                          border: "1px solid #1f2937",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="wrapped"
                        stroke="#2dd4bf"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded-lg border border-slate-800/60 bg-slate-950/40" />
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
            <div className="flex items-center gap-2">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    tab === t
                      ? "bg-slate-900/60 text-teal-300"
                      : "text-slate-300 hover:bg-slate-900/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "Assets" ? (
              <div className="flex items-center gap-2">
                <button
                  disabled={selectedIds.length === 0 || !!busy}
                  onClick={bulkWrap}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-teal-500 disabled:opacity-50"
                >
                  Bulk wrap
                </button>
                <button
                  disabled={selectedIds.length === 0 || !!busy}
                  onClick={bulkAttest}
                  className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-700 disabled:opacity-50"
                >
                  Bulk attest
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="px-4 py-3 text-sm text-red-200">{error}</div>
          ) : null}

          <div className="p-4">
            {tab === "Assets" ? (
              <AssetsTable assets={assets} selected={selected} setSelected={setSelected} />
            ) : null}
            {tab === "Policies" ? <PoliciesPanel policies={policies} /> : null}
            {tab === "Attestations" ? (
              <AttestationsPanel attestations={attestations} />
            ) : null}
            {tab === "Anchoring Jobs" ? <AnchoringJobsPanel /> : null}
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-600">
          API: {process.env.NEXT_PUBLIC_API_BASE}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: any;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
      <div className="text-sm text-slate-400">{title}</div>
      <div className={`mt-2 text-3xl font-semibold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
      <div className="mb-3 text-sm text-teal-300">{title}</div>
      {children}
    </div>
  );
}

function AssetsTable({
  assets,
  selected,
  setSelected,
}: {
  assets: Asset[];
  selected: Record<string, boolean>;
  setSelected: (v: Record<string, boolean>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="w-10 pb-2 pr-3">
              <input
                type="checkbox"
                checked={assets.length > 0 && assets.every((a) => selected[a.id])}
                onChange={(e) => {
                  const next: Record<string, boolean> = {};
                  if (e.target.checked) assets.forEach((a) => (next[a.id] = true));
                  setSelected(next);
                }}
              />
            </th>
            <th className="pb-2 pr-3">Name</th>
            <th className="pb-2 pr-3">Type</th>
            <th className="pb-2 pr-3">Risk</th>
            <th className="pb-2 pr-3">Compliance</th>
            <th className="pb-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} className="border-t border-slate-800/60">
              <td className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={!!selected[a.id]}
                  onChange={(e) =>
                    setSelected({ ...selected, [a.id]: e.target.checked })
                  }
                />
              </td>
              <td className="py-2 pr-3">
                <div className="text-slate-100">{a.name}</div>
                <div className="text-xs text-slate-500">{a.locator}</div>
              </td>
              <td className="py-2 pr-3 text-slate-300">{a.asset_type}</td>
              <td className="py-2 pr-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    a.risk_level === "Critical" || a.risk_level === "High"
                      ? "bg-red-950/40 text-red-300"
                      : a.risk_level === "Medium"
                      ? "bg-amber-950/40 text-amber-300"
                      : "bg-slate-900/60 text-slate-300"
                  }`}
                >
                  {a.risk_level} ({a.quantum_risk_score})
                </span>
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    a.pqc_compliance === "NON_PQC"
                      ? "bg-red-950/40 text-red-300"
                      : a.pqc_compliance === "PQC"
                      ? "bg-teal-950/40 text-teal-300"
                      : "bg-slate-900/60 text-slate-300"
                  }`}
                >
                  {a.pqc_compliance}
                </span>
              </td>
              <td className="py-2 pr-3 text-slate-300">{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoliciesPanel({ policies }: { policies: Policy[] }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-300">Policies</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-2 pr-3">Name</th>
              <th className="pb-2 pr-3">Mode</th>
              <th className="pb-2 pr-3">Risk Threshold</th>
              <th className="pb-2 pr-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-t border-slate-800/60">
                <td className="py-2 pr-3 text-slate-100">{p.name}</td>
                <td className="py-2 pr-3 text-slate-300">{p.mode}</td>
                <td className="py-2 pr-3 text-slate-300">{p.risk_threshold}</td>
                <td className="py-2 pr-3 text-slate-300">{p.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-500">
        Create/edit policies via API for this MVP build.
      </div>
    </div>
  );
}

function AttestationsPanel({ attestations }: { attestations: Attestation[] }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-300">Attestations</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-2 pr-3">Asset</th>
              <th className="pb-2 pr-3">Tx Hash</th>
              <th className="pb-2 pr-3">Block</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {attestations.map((a) => (
              <tr key={a.id} className="border-t border-slate-800/60">
                <td className="py-2 pr-3 text-slate-100">{a.asset_id}</td>
                <td className="py-2 pr-3 font-mono text-xs text-slate-300">
                  {a.tx_hash}
                </td>
                <td className="py-2 pr-3 text-slate-300">{a.block_number ?? ""}</td>
                <td className="py-2 pr-3 text-slate-300">{a.status}</td>
                <td className="py-2 pr-3 text-slate-400">
                  {new Date(a.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnchoringJobsPanel() {
  return (
    <div className="text-sm text-slate-400">
      Wrapping and attestation job details are available via the API endpoints:
      <div className="mt-2 space-y-1 font-mono text-xs text-slate-500">
        <div>/wrapping-jobs</div>
        <div>/wrapping-jobs/&lt;id&gt;</div>
        <div>/attestation-jobs</div>
      </div>
    </div>
  );
}

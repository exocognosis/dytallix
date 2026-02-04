'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { pipelineAPI, adminAPI } from '@/lib/api';
import {
  Route,
  RefreshCw,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FolderSearch,
  FileType,
  FileCode,
  Calendar,
  Save,
  Play,
} from 'lucide-react';

type PipelineRun = {
  id: string;
  status: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  processed?: number;
  skipped?: number;
  failed?: number;
  totalFound?: number;
};

type PipelineAsset = {
  id: string;
  relativePath: string;
  status: string;
  pqcStatus?: string | null;
  pqcProtected?: boolean;
  nistLevel?: number | null;
  dataDomain?: string | null;
  createdAt?: string;
};

export default function PipelinePage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [assets, setAssets] = useState<PipelineAsset[]>([]);
  const [runLoading, setRunLoading] = useState(false);

  // Asset Identification config state
  const [configStatus, setConfigStatus] = useState<'idle' | 'saving' | 'scanning' | 'pqc' | 'success' | 'error'>('idle');
  const [configMessage, setConfigMessage] = useState('');
  const [config, setConfig] = useState({
    sourceDirectories: '/opt/quantumvault-test/QuantumVaultTestData\n/var/www/html',
    destinationDirectories: '/opt/quantumvault/encrypted\n/backup/secure',
    fileTypes: '.pem, .crt, .key, .p12, .jks, .json, .csv, .pdf',
    formats: 'PEM, DER, PKCS#12, CSV, JSON',
    minDate: new Date().toISOString().split('T')[0],
    maxDate: new Date().toISOString().split('T')[0],
    maxFiles: '2000',
    maxFileSizeBytes: String(50 * 1024 * 1024),
  });

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await pipelineAPI.getRuns();
      setRuns(data || []);
      if (data?.length && !selectedRunId) {
        setSelectedRunId(data[0].id);
      }
    } catch (err) {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Config action handlers
  const handleSaveConfig = async () => {
    setConfigStatus('saving');
    try {
      await adminAPI.saveScanConfig(config);
      setConfigStatus('success');
      setConfigMessage('Configuration saved successfully');
      setTimeout(() => setConfigStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setConfigStatus('error');
      setConfigMessage('Failed to save configuration');
    }
  };

  const handleRunDiscovery = async () => {
    setConfigStatus('scanning');
    try {
      const result = await adminAPI.runDiscovery(config);
      setConfigStatus('success');
      setConfigMessage(result.message || 'Asset discovery scan complete');
      fetchRuns(); // Refresh runs after discovery
      setTimeout(() => setConfigStatus('idle'), 5000);
    } catch (error) {
      console.error('Scan failed:', error);
      setConfigStatus('error');
      setConfigMessage('Scan failed to execute');
    }
  };

  const handleRunPipeline = async () => {
    setConfigStatus('pqc');
    try {
      const result = await adminAPI.runPqcPipeline(config);
      setConfigStatus(result.success ? 'success' : 'error');
      setConfigMessage(result.message || 'PQC pipeline complete');
      fetchRuns(); // Refresh runs after pipeline
      setTimeout(() => setConfigStatus('idle'), 8000);
    } catch (error) {
      console.error('PQC pipeline failed:', error);
      setConfigStatus('error');
      setConfigMessage('PQC pipeline failed to execute');
    }
  };

  useEffect(() => {
    if (!selectedRunId) return;
    let active = true;

    const fetchRun = async () => {
      setRunLoading(true);
      try {
        const data = await pipelineAPI.getRun(selectedRunId);
        if (!active) return;
        setAssets(data?.assets || []);
      } catch (err) {
        if (!active) return;
        setAssets([]);
      } finally {
        if (active) setRunLoading(false);
      }
    };

    fetchRun();
    const timer = setInterval(fetchRun, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedRunId]);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Route className="w-8 h-8 text-cyan-400" />
            Pipeline Runs
          </h1>
          <p className="text-white/60 mt-1">
            Monitor PQC pipeline progress and inspect individual assets.
          </p>
        </div>
        <Button variant="outline" onClick={fetchRuns} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Runs
        </Button>
      </div>

      {/* Asset Identification Card */}
      <GlassPanel className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FolderSearch className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Asset Identification</h2>
            <p className="text-sm text-white/50">Configure scanning and PQC transfer parameters</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Directories */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <FolderSearch className="w-4 h-4" />
              Source Directories
            </label>
            <textarea
              value={config.sourceDirectories}
              onChange={(e) => setConfig({ ...config, sourceDirectories: e.target.value })}
              className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 font-mono text-sm"
              placeholder="/path/to/source"
            />
            <p className="text-xs text-white/40 mt-1">One path per line</p>
          </div>

          {/* Destination Directories */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <FolderSearch className="w-4 h-4" />
              Destination Directories
            </label>
            <textarea
              value={config.destinationDirectories}
              onChange={(e) => setConfig({ ...config, destinationDirectories: e.target.value })}
              className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 font-mono text-sm"
              placeholder="/path/to/destination"
            />
            <p className="text-xs text-white/40 mt-1">One path per line</p>
          </div>

          {/* File Types */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <FileType className="w-4 h-4" />
              File Types
            </label>
            <input
              type="text"
              value={config.fileTypes}
              onChange={(e) => setConfig({ ...config, fileTypes: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              placeholder=".pem, .crt, .key"
            />
          </div>

          {/* Formats */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Formats
            </label>
            <input
              type="text"
              value={config.formats}
              onChange={(e) => setConfig({ ...config, formats: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              placeholder="PEM, DER, PKCS#12"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Creation Date (From)
            </label>
            <input
              type="date"
              value={config.minDate}
              onChange={(e) => setConfig({ ...config, minDate: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Creation Date (To)
            </label>
            <input
              type="date"
              value={config.maxDate}
              onChange={(e) => setConfig({ ...config, maxDate: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Limits */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Max Files
            </label>
            <input
              type="number"
              min={1}
              value={config.maxFiles}
              onChange={(e) => setConfig({ ...config, maxFiles: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              placeholder="2000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Max File Size (bytes)
            </label>
            <input
              type="number"
              min={1}
              value={config.maxFileSizeBytes}
              onChange={(e) => setConfig({ ...config, maxFileSizeBytes: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              placeholder="52428800"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
          <div className="flex items-center gap-3">
            {configStatus === 'success' && (
              <span className="text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {configMessage}
              </span>
            )}
            {configStatus === 'error' && (
              <span className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {configMessage}
              </span>
            )}
            {(configStatus === 'saving' || configStatus === 'scanning' || configStatus === 'pqc') && (
              <span className="text-cyan-400 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {configStatus === 'saving' ? 'Saving...' : configStatus === 'scanning' ? 'Running discovery...' : 'Running PQC pipeline...'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={configStatus !== 'idle'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
            <button
              onClick={handleRunDiscovery}
              disabled={configStatus !== 'idle'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Run Discovery
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={configStatus !== 'idle'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Run PQC Pipeline
            </button>
          </div>
        </div>
      </GlassPanel>

      {loading ? (
        <GlassPanel className="p-10 flex items-center justify-center text-white/60">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading pipeline runs…
        </GlassPanel>
      ) : runs.length === 0 ? (
        <GlassPanel className="p-6 text-white/60">No pipeline runs recorded yet.</GlassPanel>
      ) : (
        <>
          <GlassPanel className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
              <div className="flex-1">
                <label className="text-xs text-white/40 uppercase tracking-wide">Select Run</label>
                <select
                  value={selectedRunId || ''}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                >
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.id.slice(0, 8)} · {run.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: selectedRun?.totalFound ?? '-' },
                  { label: 'Processed', value: selectedRun?.processed ?? '-' },
                  { label: 'Skipped', value: selectedRun?.skipped ?? '-' },
                  { label: 'Failed', value: selectedRun?.failed ?? '-' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-xs text-white/40">{item.label}</div>
                    <div className="text-lg font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Assets in Run</h2>
              {runLoading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
            </div>
            {assets.length === 0 ? (
              <div className="text-white/50">No assets recorded for this run yet.</div>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/dashboard/assets/${asset.id}`}
                    className="block border border-white/10 rounded-lg p-4 hover:border-cyan-400/60 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-white/40 font-mono">
                          #{asset.id.slice(0, 8)}
                        </div>
                        <div className="text-white font-medium">{asset.relativePath}</div>
                        <div className="text-sm text-white/50">{asset.dataDomain || 'Unknown domain'}</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {asset.status === 'FAILED' ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="text-white/70">{asset.status}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <span>NIST {asset.nistLevel ?? '-'}</span>
                        <span>•</span>
                        <span>{asset.pqcStatus || (asset.pqcProtected ? 'PQC_PROTECTED' : 'UNPROTECTED')}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

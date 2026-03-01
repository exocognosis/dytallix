'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { pipelineAPI } from '@/lib/api';

type PipelineAssetDetail = {
  id: string;
  runId?: string;
  objectId?: string | null;
  relativePath?: string;
  sourcePath?: string | null;
  destinationPath?: string | null;
  status?: string;
  pqcStatus?: string | null;
  pqcProtected?: boolean;
  nistLevel?: number | null;
  dataDomain?: string | null;
  cryptoDomain?: string | null;
  fileSizeBytes?: number | null;
  plaintextSha256?: string | null;
  manifestSha256?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function PipelineAssetDetailPage() {
  const params = useParams<{ id: string }>();
  const assetId = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asset, setAsset] = useState<PipelineAssetDetail | null>(null);

  useEffect(() => {
    if (!assetId) return;

    let active = true;
    const loadAsset = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await pipelineAPI.getAsset(assetId);
        if (!active) return;
        setAsset(data || null);
      } catch (err: any) {
        if (!active) return;
        const message = err?.response?.data?.message || err?.message || 'Unable to load pipeline asset details';
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAsset();
    return () => {
      active = false;
    };
  }, [assetId]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Pipeline Asset Details</h1>
        <Link
          href="/dashboard/pipeline"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pipeline
        </Link>
      </div>

      {loading ? (
        <GlassPanel className="p-10 flex items-center justify-center text-white/60">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading asset details…
        </GlassPanel>
      ) : error ? (
        <GlassPanel className="p-6 text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </GlassPanel>
      ) : !asset ? (
        <GlassPanel className="p-6 text-white/60">No asset data found.</GlassPanel>
      ) : (
        <GlassPanel className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-white/60">Asset ID</div><div className="text-white break-all">{asset.id}</div>
            <div className="text-white/60">Run ID</div><div className="text-white break-all">{asset.runId || '-'}</div>
            <div className="text-white/60">Relative Path</div><div className="text-white break-all">{asset.relativePath || '-'}</div>
            <div className="text-white/60">Status</div>
            <div className="text-white inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              {asset.status || '-'}
            </div>
            <div className="text-white/60">PQC Status</div><div className="text-white">{asset.pqcStatus || (asset.pqcProtected ? 'PQC_PROTECTED' : 'UNPROTECTED')}</div>
            <div className="text-white/60">NIST Level</div><div className="text-white">{asset.nistLevel ?? '-'}</div>
            <div className="text-white/60">Data Domain</div><div className="text-white">{asset.dataDomain || '-'}</div>
            <div className="text-white/60">Crypto Domain</div><div className="text-white">{asset.cryptoDomain || '-'}</div>
            <div className="text-white/60">File Size (bytes)</div><div className="text-white">{asset.fileSizeBytes ?? '-'}</div>
            <div className="text-white/60">Source Path</div><div className="text-white break-all">{asset.sourcePath || '-'}</div>
            <div className="text-white/60">Destination Path</div><div className="text-white break-all">{asset.destinationPath || '-'}</div>
            <div className="text-white/60">Error</div><div className="text-red-300 break-all">{asset.errorMessage || '-'}</div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

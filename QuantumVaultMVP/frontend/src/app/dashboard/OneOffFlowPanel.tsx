'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { assetsAPI, attestationAPI, wrappingAPI } from '@/lib/api';
import { AlertTriangle, CheckCircle, Link as LinkIcon, Loader2, Lock, Shield, Tag } from 'lucide-react';

type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | string;

type Asset = {
  id: string;
  name?: string;
  type?: string;
  fingerprint?: string;
  status?: string;
};

type Anchor = {
  id: string;
  name: string;
  isActive?: boolean;
  algorithm?: string;
};

type Policy = {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

type CreatedJob = { id: string };
type JobStatusResponse = { status?: JobStatus };

type Attestation = {
  status?: string;
  attestationHash?: string;
  txHash?: string;
  blockNumber?: number;
  chainId?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (!err || typeof err !== 'object') return 'Request failed';

  const message = (err as { message?: unknown }).message;
  if (typeof message === 'string' && message) return message;

  const response = (err as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return 'Request failed';
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return 'Request failed';
  const apiMessage = (data as { message?: unknown }).message;
  if (typeof apiMessage === 'string' && apiMessage) return apiMessage;

  return 'Request failed';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function pollJob<T extends { status?: JobStatus }>(
  getStatus: () => Promise<T>,
  options: { intervalMs: number; timeoutMs: number; signal?: AbortSignal }
): Promise<T> {
  const started = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new Error('Cancelled');
    }

    const status = await getStatus();
    const state = status.status;

    if (state === 'COMPLETED') return status;
    if (state === 'FAILED') {
      throw new Error('Job failed');
    }

    if (Date.now() - started > options.timeoutMs) {
      throw new Error('Timed out waiting for job');
    }

    await sleep(options.intervalMs);
  }
}

export default function OneOffFlowPanel({
  assets,
  policies,
  anchors,
  onCompleted,
  variant = 'standalone',
  showHeader = true,
}: {
  assets: Asset[];
  policies: Policy[];
  anchors: Anchor[];
  onCompleted?: () => void;
  variant?: 'standalone' | 'embedded';
  showHeader?: boolean;
}) {
  const compact = variant === 'embedded' && !showHeader;

  const [assetId, setAssetId] = useState('');
  const [assetQuery, setAssetQuery] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [assetType, setAssetType] = useState('');
  const [assetTypeTouched, setAssetTypeTouched] = useState(false);
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('AUTO');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const [wrapJobId, setWrapJobId] = useState<string | null>(null);
  const [attestJobId, setAttestJobId] = useState<string | null>(null);

  const [encryptStatus, setEncryptStatus] = useState<JobStatus | null>(null);
  const [anchorStatus, setAnchorStatus] = useState<JobStatus | null>(null);
  const [attestStatus, setAttestStatus] = useState<JobStatus | null>(null);
  const [latestAttestation, setLatestAttestation] = useState<Attestation | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [keyType, setKeyType] = useState('key_material');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const selectedAsset = useMemo(() => assets.find((a) => a.id === assetId) || null, [assets, assetId]);
  const selectedPolicy = useMemo(() => policies.find((p) => p.id === policyId) || null, [policies, policyId]);

  const assetTypeOptions = useMemo(() => {
    const found = new Set<string>();
    for (const a of assets) {
      if (a.type && String(a.type).trim()) found.add(String(a.type));
    }
    return Array.from(found).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const algorithmOptions = useMemo(() => {
    const found = new Set<string>();
    for (const a of anchors) {
      if (a.algorithm && String(a.algorithm).trim()) found.add(String(a.algorithm));
    }
    return Array.from(found).sort((a, b) => a.localeCompare(b));
  }, [anchors]);

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return assets;

    return assets.filter((a) => {
      const haystack = [a.name, a.fingerprint, a.id, a.type].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [assets, assetQuery]);

  const effectiveAnchor = useMemo(() => {
    const active = anchors.find((a) => a.isActive);

    if (encryptionAlgorithm === 'AUTO') {
      return active || anchors[0] || null;
    }

    const matching = anchors.filter((a) => (a.algorithm || '').toLowerCase() === encryptionAlgorithm.toLowerCase());
    const matchingActive = matching.find((a) => a.isActive);
    return matchingActive || matching[0] || active || anchors[0] || null;
  }, [anchors, encryptionAlgorithm]);

  useEffect(() => {
    if (!assetId && assets.length > 0) {
      setAssetId(assets[0].id);
    }

    if (!policyId && policies.length > 0) {
      const activePolicy = policies.find((p) => p.isActive) || policies[0];
      if (activePolicy) setPolicyId(activePolicy.id);
    }
  }, [assets, policies, assetId, policyId]);

  useEffect(() => {
    if (!selectedAsset) return;
    if (assetTypeTouched) return;
    setAssetType(selectedAsset.type || '');
  }, [selectedAsset, assetTypeTouched]);

  const resetRunState = () => {
    setError('');
    setWrapJobId(null);
    setAttestJobId(null);
    setEncryptStatus(null);
    setAnchorStatus(null);
    setAttestStatus(null);
    setLatestAttestation(null);
  };

  const uploadKeyMaterial = async (file: File) => {
    if (!assetId) {
      setUploadError('Select an asset first');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      await assetsAPI.ingestKeyMaterial(assetId, base64, keyType);
      setUploadSuccess(`Uploaded: ${file.name}`);
    } catch (err: unknown) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const runFlow = async () => {
    resetRunState();

    if (!assetId) {
      setError('Select an asset');
      return;
    }

    if (!policyId) {
      setError('Select a policy');
      return;
    }

    if (!effectiveAnchor?.id) {
      setError('No anchor available for selected encryption algorithm');
      return;
    }

    setRunning(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Persist operator selections for auditing/traceability.
      try {
        const assetDetail = (await assetsAPI.getAsset(assetId)) as unknown as { metadata?: unknown };
        const existing =
          assetDetail && typeof assetDetail === 'object' && assetDetail !== null && 'metadata' in assetDetail
            ? (assetDetail as { metadata?: unknown }).metadata
            : undefined;
        const existingObject = existing && typeof existing === 'object' && !Array.isArray(existing) ? (existing as Record<string, unknown>) : {};

        await assetsAPI.updateAssetMetadata(assetId, {
          metadata: {
            ...existingObject,
            quickAssetIntake: {
              policyId,
              policyName: selectedPolicy?.name,
              assetType: assetType || selectedAsset?.type || null,
              encryptionAlgorithm: encryptionAlgorithm === 'AUTO' ? (effectiveAnchor.algorithm || null) : encryptionAlgorithm,
              anchorId: effectiveAnchor.id,
              anchorName: effectiveAnchor.name,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      } catch {
        // Non-fatal for MVP; proceed with the flow.
      }

      // 1) Encrypt (wrap)
      setEncryptStatus('PENDING');
      const wrapJob = (await wrappingAPI.wrapAsset(assetId, effectiveAnchor.id)) as unknown as CreatedJob;
      setWrapJobId(wrapJob.id);

      await pollJob(
        async () => {
          const status = (await wrappingAPI.getJobStatus(wrapJob.id)) as unknown as JobStatusResponse;
          setEncryptStatus(status?.status ?? null);
          return status;
        },
        { intervalMs: 1000, timeoutMs: 120000, signal: abort.signal }
      );

      // 2) Anchor (blockchain submission happens during attestation)
      setAnchorStatus('PENDING');
      const attestJob = (await attestationAPI.createJob([assetId])) as unknown as CreatedJob;
      setAttestJobId(attestJob.id);

      await pollJob(
        async () => {
          const status = (await attestationAPI.getJobStatus(attestJob.id)) as unknown as JobStatusResponse;
          setAnchorStatus(status?.status ?? null);
          return status;
        },
        { intervalMs: 1000, timeoutMs: 180000, signal: abort.signal }
      );

      // 3) Attest (fetch latest attestation record)
      setAttestStatus('PENDING');

      const attestations = (await attestationAPI.getAssetAttestations(assetId)) as unknown as Attestation[];
      const latest = attestations?.[0] ?? null;
      setLatestAttestation(latest);
      setAttestStatus('COMPLETED');

      onCompleted?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  if (!assets.length || !anchors.length || !policies.length) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="text-white font-medium">Quick Asset Intake: Encrypt → Attest → Anchor</div>
        <div className="text-slate-400 text-sm mt-2">
          Requires at least one asset, one policy, and one anchor.
        </div>
      </div>
    );
  }

  const header = (
    <>
      <div className="text-white text-lg font-semibold">Quick Asset Intake</div>
      <div className="text-sm text-slate-400 mt-1">
        For assets newly introduced or missed by PQC scan — select one and run encrypt → attest → anchor.
      </div>
    </>
  );

  const sectionTitleClassName = compact ? 'text-white text-base font-semibold mb-3' : 'text-white text-lg font-semibold mb-4';
  const labelClassName = compact ? 'block text-xs font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-300 mb-2';

  const controlClassName = compact
    ? 'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
    : 'w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  const smallControlClassName = compact
    ? 'px-2.5 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
    : 'px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  const stepCardClassName = compact
    ? 'flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-700'
    : 'flex items-center justify-between p-4 bg-slate-900/40 rounded-lg border border-slate-700';

  const inputsCardClassName =
    variant === 'embedded'
      ? 'bg-slate-900/40 rounded-lg border border-slate-700 p-4'
      : 'bg-slate-800 rounded-lg border border-slate-700 p-6';

  const progressCardClassName =
    variant === 'embedded'
      ? 'bg-slate-900/40 rounded-lg border border-slate-700 p-4'
      : 'bg-slate-800 rounded-lg border border-slate-700 p-6';

  const content = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={inputsCardClassName}>
        <h2 className={sectionTitleClassName}>Inputs</h2>

        <div className={compact ? 'space-y-3' : 'space-y-4'}>
          <div>
            <label className={labelClassName}>Asset</label>
            <input
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              disabled={running}
              placeholder="Search assets by name, fingerprint, id…"
              className={controlClassName}
            />
            <select
              value={assetId}
              onChange={(e) => {
                setAssetId(e.target.value);
                setError('');
                setUploadError('');
                setUploadSuccess('');
              }}
              disabled={running}
              className={`${compact ? 'mt-2' : 'mt-3'} ${controlClassName}`}
            >
              {filteredAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.name || a.fingerprint || a.id).slice(0, 80)}
                </option>
              ))}
            </select>
            {selectedAsset && (
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div>
                  id: <span className="text-slate-300">{selectedAsset.id}</span>
                </div>
                {selectedAsset.status && (
                  <div>
                    status: <span className="text-slate-300">{selectedAsset.status}</span>
                  </div>
                )}
                {selectedAsset.fingerprint && (
                  <div>
                    fingerprint: <span className="text-slate-300">{selectedAsset.fingerprint}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className={compact ? 'block text-xs font-medium text-slate-300' : 'block text-sm font-medium text-slate-300'}>
                  Upload / Drag & Drop
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Key type</span>
                  <select
                    value={keyType}
                    onChange={(e) => setKeyType(e.target.value)}
                    disabled={running || uploading}
                    className={smallControlClassName}
                  >
                    <option value="key_material">key_material</option>
                    <option value="certificate">certificate</option>
                    <option value="public_key">public_key</option>
                    <option value="private_key">private_key</option>
                    <option value="other">other</option>
                  </select>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (running || uploading) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) void uploadKeyMaterial(file);
                }}
                onClick={() => {
                  if (running || uploading) return;
                  fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                className={`w-full ${compact ? 'px-3 py-3' : 'px-4 py-5'} border border-dashed border-slate-600 rounded-lg bg-slate-900/40 hover:bg-slate-900/60 transition text-left cursor-pointer`}
              >
                <div className={`${compact ? 'text-xs' : 'text-sm'} text-slate-200 font-medium`}>
                  {uploading ? 'Uploading…' : 'Drop a file here, or click to browse'}
                </div>
                <div className={`text-xs text-slate-400 ${compact ? 'mt-0.5' : 'mt-1'}`}>
                  Upload key material / certificates for this asset (max 10MB).
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadKeyMaterial(file);
                    e.currentTarget.value = '';
                  }}
                />
              </div>

              {uploadError && (
                <div className="mt-3 bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div>{uploadError}</div>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-3 bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
                  {uploadSuccess}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelClassName}>Policy</label>
            <select
              value={policyId}
              onChange={(e) => {
                setPolicyId(e.target.value);
                setError('');
              }}
              disabled={running}
              className={controlClassName}
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isActive ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Asset Type</label>
            <select
              value={assetType}
              onChange={(e) => {
                setAssetTypeTouched(true);
                setAssetType(e.target.value);
                setError('');
              }}
              disabled={running}
              className={controlClassName}
            >
              <option value="">Unspecified</option>
              {assetTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Encryption Algorithm</label>
            <select
              value={encryptionAlgorithm}
              onChange={(e) => {
                setEncryptionAlgorithm(e.target.value);
                setError('');
              }}
              disabled={running}
              className={controlClassName}
            >
              <option value="AUTO">Auto (use active anchor)</option>
              {algorithmOptions.map((algo) => (
                <option key={algo} value={algo}>
                  {algo}
                </option>
              ))}
            </select>
            {effectiveAnchor && (
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                <span>
                  Using anchor: <span className="text-slate-200">{effectiveAnchor.name}</span>
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={runFlow}
              disabled={running || !assetId || !policyId || !effectiveAnchor?.id}
              className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold ${compact ? 'py-2 px-3 text-sm' : 'py-3 px-4'} rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {running ? 'Running…' : 'Run Encrypt → Anchor → Attest'}
            </button>

            <button
              onClick={cancel}
              disabled={!running}
              className={`${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'} bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
          </div>

          <div className={`text-xs text-slate-500 flex items-center gap-2 ${compact ? 'pt-1' : ''}`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>
              Policy and selections are stored as asset metadata for audit traceability.
            </span>
          </div>
        </div>
      </div>

      <div className={progressCardClassName}>
        <h2 className={sectionTitleClassName}>Progress</h2>

        <div className="space-y-4">
          <div className={stepCardClassName}>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white font-medium">Encrypt</div>
                <div className="text-xs text-slate-400">Job: {wrapJobId || '—'}</div>
              </div>
            </div>
            <div className="text-sm text-slate-200">{encryptStatus ? encryptStatus : '—'}</div>
          </div>

          <div className={stepCardClassName}>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white font-medium">Anchor</div>
                <div className="text-xs text-slate-400">Job: {attestJobId || '—'}</div>
              </div>
            </div>
            <div className="text-sm text-slate-200">{anchorStatus ? anchorStatus : '—'}</div>
          </div>

          <div className={stepCardClassName}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-white font-medium">Attest</div>
                <div className="text-xs text-slate-400">Latest proof: {latestAttestation?.attestationHash ? 'available' : '—'}</div>
              </div>
            </div>
            <div className="text-sm text-slate-200">{attestStatus ? attestStatus : '—'}</div>
          </div>

          {running && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for jobs to complete…
            </div>
          )}

          {latestAttestation && (
            <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-700">
              <div className="text-white font-medium mb-2">Latest attestation</div>
              <div className="text-xs text-slate-400 space-y-1">
                {latestAttestation.status && (
                  <div>
                    status: <span className="text-slate-200">{latestAttestation.status}</span>
                  </div>
                )}
                {latestAttestation.attestationHash && (
                  <div>
                    hash: <span className="text-slate-200">{latestAttestation.attestationHash}</span>
                  </div>
                )}
                {latestAttestation.txHash && (
                  <div className="flex items-center gap-2">
                    <span>tx:</span>
                    <span className="text-slate-200 break-all">{latestAttestation.txHash}</span>
                    <a
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      href={
                        String(latestAttestation.txHash).startsWith('0x')
                          ? `https://etherscan.io/tx/${latestAttestation.txHash}`
                          : '#'
                      }
                      target="_blank"
                      rel="noreferrer"
                      title="Open in explorer (mainnet default)"
                    >
                      <LinkIcon className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {typeof latestAttestation.blockNumber === 'number' && (
                  <div>
                    block: <span className="text-slate-200">{latestAttestation.blockNumber}</span>
                  </div>
                )}
                {typeof latestAttestation.chainId === 'number' && (
                  <div>
                    chainId: <span className="text-slate-200">{latestAttestation.chainId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === 'embedded') {
    if (!showHeader) {
      return <div>{content}</div>;
    }

    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        {header}
        <div className="mt-4">{content}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">{header}</div>
      {content}
    </div>
  );
}

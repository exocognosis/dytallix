'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { pipelineAPI, adminAPI, anchorsAPI } from '@/lib/api';

import { WizardStepIndicator } from '@/components/pipeline/WizardStepIndicator';
import { WizardStep1DefineRun } from '@/components/pipeline/WizardStep1DefineRun';
import { WizardStep2FileTypes } from '@/components/pipeline/WizardStep2FileTypes';
import { WizardStep3Metadata } from '@/components/pipeline/WizardStep3Metadata';
import { WizardStep4Discovery } from '@/components/pipeline/WizardStep4Discovery';
import { WizardStep5Run } from '@/components/pipeline/WizardStep5Run';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  stageTimestamps?: Record<string, string> | null;
  createdAt?: string;
};

type FileTypePolicy = {
  extension: string;
  level: 'baseline' | 'enhanced' | 'maximum';
};

type AssetTypeMetadata = {
  extension: string;
  dataDomain: string;
  retentionTag: string;
  owner: string;
};

type DiscoveryResult = {
  message?: string;
  totalFound?: number;
  manifestsGenerated?: string[];
  files?: string[];
};

type PipelineSummary = {
  success: boolean;
  message?: string;
  totalFound?: number;
  processed?: number;
  skipped?: number;
  failed?: number;
  runId?: string;
};

type AnchorReadiness = {
  checked: boolean;
  hasKemAnchor: boolean;
  missingSignatures: string[];
  error?: string;
};

type AnchorRecord = {
  isActive?: boolean;
  algorithm?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_TO_KEM = {
  baseline: 'ML-KEM-512',
  enhanced: 'ML-KEM-768',
  maximum: 'ML-KEM-1024',
} as const;

const WIZARD_STEPS = [
  { id: 1, title: 'Define Run', subtitle: 'Set origin and destination directories.' },
  { id: 2, title: 'File Types + Policies', subtitle: 'Assign PQC levels, dates, and run limits.' },
  { id: 3, title: 'Asset Metadata', subtitle: 'Set metadata defaults for each asset type.' },
  { id: 4, title: 'Asset Discovery', subtitle: 'Scan, review counts, and verify run attributes.' },
  { id: 5, title: 'Run Pipeline', subtitle: 'Execute run and watch per-file progression.' },
];

const DEFAULT_CONFIG = {
  originDatabase: '/opt/quantumvault-test/QuantumVaultTestData',
  destinationDatabase: '/opt/quantumvault/encrypted',
  fileTypes: '.pem, .json',
  formats: 'PEM, JSON',
  minDate: new Date().toISOString().split('T')[0],
  maxDate: new Date().toISOString().split('T')[0],
  maxFiles: '2000',
  maxFileSizeBytes: String(50 * 1024 * 1024),
  defaultPqcLevel: 'enhanced' as 'baseline' | 'enhanced' | 'maximum',
  kemAlgorithm: 'ML-KEM-768',
  enableDilithium: true,
  enableSphincs: false,
};

const DEFAULT_POLICIES: FileTypePolicy[] = [
  { extension: '.pem', level: 'maximum' },
  { extension: '.json', level: 'enhanced' },
];

const DEFAULT_METADATA: AssetTypeMetadata[] = [
  { extension: '.pem', dataDomain: 'CRYPTO_MATERIAL', retentionTag: 'long_term', owner: 'Security' },
  { extension: '.json', dataDomain: 'OPERATIONAL', retentionTag: 'standard', owner: 'Platform' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeExtension(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function normalizeAlgorithm(value: string): string {
  const upper = String(value || '').toUpperCase().trim();
  if (!upper) return '';
  return upper
    .replace('KYBER-512', 'ML-KEM-512')
    .replace('KYBER512', 'ML-KEM-512')
    .replace('KYBER-768', 'ML-KEM-768')
    .replace('KYBER768', 'ML-KEM-768')
    .replace('KYBER-1024', 'ML-KEM-1024')
    .replace('KYBER1024', 'ML-KEM-1024');
}

function extractApiMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeResponse = (error as { response?: { data?: { message?: unknown } } }).response;
  const serverMessage = maybeResponse?.data?.message;
  if (Array.isArray(serverMessage)) return serverMessage.join(', ');
  if (typeof serverMessage === 'string' && serverMessage.trim().length > 0) return serverMessage;
  return null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  // Run/asset state
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [assets, setAssets] = useState<PipelineAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [stepError, setStepError] = useState('');
  const [verificationChecked, setVerificationChecked] = useState(false);

  // Config state
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [fileTypePolicies, setFileTypePolicies] = useState<FileTypePolicy[]>(DEFAULT_POLICIES);
  const [assetTypeMetadata, setAssetTypeMetadata] = useState<AssetTypeMetadata[]>(DEFAULT_METADATA);

  // Operation state
  const [configStatus, setConfigStatus] = useState<'idle' | 'saving' | 'scanning' | 'pqc' | 'success' | 'error'>('idle');
  const [configMessage, setConfigMessage] = useState('');
  const [discoverySummary, setDiscoverySummary] = useState('');
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [anchorReadiness, setAnchorReadiness] = useState<AnchorReadiness>({
    checked: false,
    hasKemAnchor: true,
    missingSignatures: [],
  });

  // ─── Derived ─────────────────────────────────────────────────────────────

  const normalizedPolicies = useMemo(
    () =>
      fileTypePolicies
        .map((policy) => {
          const extensions = policy.extension
            .split(',')
            .map((entry) => normalizeExtension(entry))
            .filter(Boolean);
          return { ...policy, extensions };
        })
        .filter((policy) => policy.extensions.length > 0),
    [fileTypePolicies]
  );

  const normalizedExtensions = useMemo(
    () => Array.from(new Set(normalizedPolicies.flatMap((policy) => policy.extensions))),
    [normalizedPolicies]
  );

  const requiredSignatureAlgorithms = useMemo(() => {
    const required = new Set<string>();
    const includeLevel = (level: 'baseline' | 'enhanced' | 'maximum') => {
      if (level === 'enhanced' || level === 'maximum') required.add('ML-DSA-65');
      if (level === 'maximum') required.add('SLH-DSA-SHAKE-128S');
    };
    includeLevel(config.defaultPqcLevel);
    normalizedPolicies.forEach((policy) => includeLevel(policy.level));
    return Array.from(required.values());
  }, [config.defaultPqcLevel, normalizedPolicies]);

  // Sync fileTypes/formats from policy table
  useEffect(() => {
    const fileTypes = normalizedExtensions.join(', ');
    const formats = normalizedExtensions.map((ext) => ext.replace('.', '').toUpperCase()).join(', ');
    setConfig((prev) => {
      if (prev.fileTypes === fileTypes && prev.formats === formats) return prev;
      return { ...prev, fileTypes, formats };
    });
  }, [normalizedExtensions]);

  // Sync metadata rows when extensions change
  useEffect(() => {
    const extensionSet = new Set(normalizedExtensions);
    setAssetTypeMetadata((prev) => {
      const retained = prev.filter((row) => extensionSet.has(normalizeExtension(row.extension)));
      const retainedSet = new Set(retained.map((row) => normalizeExtension(row.extension)));
      const missing = normalizedExtensions
        .filter((ext) => !retainedSet.has(ext))
        .map((ext) => ({
          extension: ext,
          dataDomain: 'OPERATIONAL',
          retentionTag: 'standard',
          owner: 'Unassigned',
        }));
      return [...retained, ...missing];
    });
  }, [normalizedExtensions]);

  // ─── Payload builder ─────────────────────────────────────────────────────

  const buildPipelinePayload = () => {
    const originDatabase = config.originDatabase.trim();
    const destinationDatabase = config.destinationDatabase.trim();

    const fileTypePqcLevels = normalizedPolicies.reduce<Record<string, string>>((acc, item) => {
      for (const extension of item.extensions) {
        acc[extension] = item.level;
      }
      return acc;
    }, {});

    const signatureAlgorithms = [
      config.enableDilithium ? 'ML-DSA-65' : null,
      config.enableSphincs ? 'SLH-DSA-SHAKE-128s' : null,
    ].filter(Boolean);

    const metadataByExtension = assetTypeMetadata.reduce<Record<string, Omit<AssetTypeMetadata, 'extension'>>>(
      (acc, row) => {
        const extension = normalizeExtension(row.extension);
        if (!extension) return acc;
        acc[extension] = {
          dataDomain: row.dataDomain,
          retentionTag: row.retentionTag,
          owner: row.owner,
        };
        return acc;
      },
      {}
    );

    return {
      ...config,
      originDatabase,
      destinationDatabase,
      sourceDirectories: originDatabase,
      destinationDirectories: destinationDatabase,
      directories: originDatabase,
      fileTypePqcLevels,
      fileTypes: normalizedExtensions.join(','),
      formats: normalizedExtensions.map((ext) => ext.replace('.', '').toUpperCase()).join(','),
      signatureAlgorithms: signatureAlgorithms.join(','),
      assetTypeMetadata: metadataByExtension,
      verifyManifestSha: true,
    };
  };

  // ─── Data fetching ───────────────────────────────────────────────────────

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pipelineAPI.getRuns();
      setRuns(data || []);
      if (data?.length && !selectedRunId) {
        setSelectedRunId(data[0].id);
      }
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const checkAnchorCoverage = useCallback(async () => {
    setAnchorReadiness({ checked: false, hasKemAnchor: true, missingSignatures: [] });
    try {
      const anchors = (await anchorsAPI.getAnchors()) as AnchorRecord[];
      const activeAlgorithms = new Set(
        (anchors || [])
          .filter((anchor) => anchor?.isActive)
          .map((anchor) => normalizeAlgorithm(anchor?.algorithm || ''))
          .filter(Boolean)
      );
      const hasKemAnchor = activeAlgorithms.has(normalizeAlgorithm(config.kemAlgorithm));
      const missingSignatures = requiredSignatureAlgorithms.filter(
        (algo) => !activeAlgorithms.has(normalizeAlgorithm(algo))
      );
      setAnchorReadiness({ checked: true, hasKemAnchor, missingSignatures });
    } catch {
      setAnchorReadiness({
        checked: true,
        hasKemAnchor: false,
        missingSignatures: requiredSignatureAlgorithms,
        error: 'Could not verify active anchors. Open Key Management to confirm anchors before run.',
      });
    }
  }, [config.kemAlgorithm, requiredSignatureAlgorithms]);

  useEffect(() => {
    if (wizardStep === 4) {
      checkAnchorCoverage();
    }
  }, [wizardStep, checkAnchorCoverage]);

  useEffect(() => {
    if (!selectedRunId) return;
    let active = true;
    const fetchRun = async () => {
      setRunLoading(true);
      try {
        const data = await pipelineAPI.getRun(selectedRunId);
        if (!active) return;
        setAssets(data?.assets || []);
        if ((data?.assets || []).length > 0 && !selectedAssetId) {
          setSelectedAssetId(data.assets[0].id);
        }
      } catch {
        if (!active) return;
        setAssets([]);
        setSelectedAssetId(null);
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
  }, [selectedRunId, selectedAssetId]);

  // ─── Operations ──────────────────────────────────────────────────────────

  const handleRunDiscovery = async () => {
    setConfigStatus('scanning');
    setStepError('');
    try {
      const result = await adminAPI.runDiscovery(buildPipelinePayload());
      setDiscoverySummary(result.message || 'Asset discovery scan complete');
      setDiscoveryResult(result);
      setConfigStatus('idle');
      setConfigMessage('');
      await fetchRuns();
    } catch (error) {
      setConfigStatus('error');
      setConfigMessage(extractApiMessage(error) || 'Discovery scan failed to execute');
    }
  };

  const handleRunPipeline = async () => {
    setDiscoverySummary('');
    setPipelineSummary(null);
    setConfigStatus('pqc');
    setStepError('');
    try {
      const result = await adminAPI.runPqcPipeline(buildPipelinePayload());
      setPipelineSummary(result);
      setConfigStatus(result.success ? 'success' : 'error');
      setConfigMessage(result.message || 'PQC pipeline complete');
      await fetchRuns();
      if (result?.runId) setSelectedRunId(result.runId);
      setTimeout(() => setConfigStatus('idle'), 8000);
    } catch {
      setConfigStatus('error');
      setConfigMessage('PQC pipeline failed to execute');
    }
  };

  const handleResetWizard = () => {
    if (!window.confirm('Reset the wizard? All configuration will return to defaults.')) return;
    setWizardStep(1);
    setConfig(DEFAULT_CONFIG);
    setFileTypePolicies(DEFAULT_POLICIES);
    setAssetTypeMetadata(DEFAULT_METADATA);
    setDiscoveryResult(null);
    setDiscoverySummary('');
    setPipelineSummary(null);
    setVerificationChecked(false);
    setStepError('');
    setConfigStatus('idle');
    setConfigMessage('');
  };

  // ─── Wizard navigation ───────────────────────────────────────────────────

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!config.originDatabase.trim() || !config.destinationDatabase.trim()) {
        return 'Origin and destination directories are required.';
      }
    }
    if (step === 2) {
      if (normalizedExtensions.length === 0) {
        return 'Add at least one valid file type rule with a PQC level.';
      }
      if (new Date(config.minDate).getTime() > new Date(config.maxDate).getTime()) {
        return 'Creation date range is invalid. Start date must be before end date.';
      }
      const maxFiles = Number(config.maxFiles);
      const maxFileSize = Number(config.maxFileSizeBytes);
      if (!Number.isFinite(maxFiles) || maxFiles <= 0 || !Number.isFinite(maxFileSize) || maxFileSize <= 0) {
        return 'Max files and max file size must be positive values.';
      }
      if (requiredSignatureAlgorithms.includes('ML-DSA-65') && !config.enableDilithium) {
        return 'Enhanced/Maximum policies require ML-DSA-65 signature attestation.';
      }
      if (requiredSignatureAlgorithms.includes('SLH-DSA-SHAKE-128S') && !config.enableSphincs) {
        return 'Maximum policies require SLH-DSA-SHAKE-128s signature attestation.';
      }
    }
    if (step === 3) {
      if (assetTypeMetadata.some((row) => !row.owner.trim())) {
        return 'Each file type metadata row needs an owner.';
      }
    }
    if (step === 4) {
      if (!discoveryResult?.totalFound && discoveryResult?.totalFound !== 0) {
        return 'Run asset discovery before continuing.';
      }
      if (!verificationChecked) {
        return 'Confirm the final run attributes before continuing.';
      }
      if (!anchorReadiness.hasKemAnchor || anchorReadiness.missingSignatures.length > 0) {
        return 'Anchor coverage is incomplete. Fix KEM/signature anchors before running the pipeline.';
      }
    }
    return null;
  };

  const goToNextStep = () => {
    const error = validateStep(wizardStep);
    if (error) { setStepError(error); return; }
    setStepError('');
    setWizardStep((prev) => Math.min(5, prev + 1));
  };

  const goToPreviousStep = () => {
    setStepError('');
    setWizardStep((prev) => Math.max(1, prev - 1));
  };

  // Guarded: only allow jumping to already-completed steps (backwards)
  const handleStepNav = (targetId: number) => {
    if (targetId < wizardStep) {
      setStepError('');
      setWizardStep(targetId);
    }
  };

  const currentStepValidationError = validateStep(wizardStep);
  const canContinueToNext = wizardStep < 5 && currentStepValidationError === null;

  // ─── Derived selectors ───────────────────────────────────────────────────

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) || null, [runs, selectedRunId]);
  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) || null, [assets, selectedAssetId]);

  const runProgress = useMemo(() => {
    if (!selectedRun) return 0;
    const total = Number(selectedRun.totalFound || 0);
    const completed = Number(selectedRun.processed || 0) + Number(selectedRun.skipped || 0) + Number(selectedRun.failed || 0);
    if (total > 0) return Math.min(100, Math.round((completed / total) * 100));
    return selectedRun.status === 'COMPLETED' ? 100 : 0;
  }, [selectedRun]);

  const selectedAssetProgress = useMemo(() => {
    if (!selectedAsset) return 0;
    const stageTimestamps = selectedAsset.stageTimestamps || {};
    const PIPELINE_STAGES = ['IDENTIFIED', 'CATEGORIZED', 'ANALYZED', 'NIST_ASSIGNED', 'WRAPPED_PQC', 'ATTESTED', 'TRANSFERRED'];
    const completedByTimestamp = PIPELINE_STAGES.filter((stage) => Boolean((stageTimestamps as Record<string, string>)[stage])).length;
    if (completedByTimestamp > 0) return Math.min(100, Math.round((completedByTimestamp / PIPELINE_STAGES.length) * 100));
    const statusProgress: Record<string, number> = { IDENTIFIED: 15, CATEGORIZED: 30, ANALYZED: 45, NIST_ASSIGNED: 60, WRAPPED_PQC: 80, TRANSFERRED: 100, SKIPPED: 100, FAILED: 100 };
    return statusProgress[selectedAsset.status] ?? 0;
  }, [selectedAsset]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Route className="w-8 h-8 text-cyan-400" />
            PQC Asset Pipeline
          </h1>
          <p className="text-white/60 mt-1">
            Guided wizard to prevent policy mismatches, missing anchors, and incomplete file-type handling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleResetWizard}
            className="flex items-center gap-2 text-orange-300 border-orange-400/30 hover:border-orange-400/60"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Wizard
          </Button>
          <Button variant="outline" onClick={fetchRuns} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Runs
          </Button>
        </div>
      </div>

      <GlassPanel className="p-6">
        {/* Step indicator */}
        <WizardStepIndicator
          steps={WIZARD_STEPS}
          currentStep={wizardStep}
          onNavigate={handleStepNav}
        />

        {/* Step content — sliding panel */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              width: `${WIZARD_STEPS.length * 100}%`,
              transform: `translateX(-${((wizardStep - 1) * 100) / WIZARD_STEPS.length}%)`,
            }}
          >
            {/* Step 1 */}
            <div className="w-full shrink-0" style={{ width: `${100 / WIZARD_STEPS.length}%` }}>
              <WizardStep1DefineRun
                config={config}
                onChange={(update) => setConfig((prev) => ({ ...prev, ...update }))}
              />
            </div>

            {/* Step 2 */}
            <div className="w-full shrink-0" style={{ width: `${100 / WIZARD_STEPS.length}%` }}>
              <WizardStep2FileTypes
                config={config}
                onChange={(update) => setConfig((prev) => ({ ...prev, ...update }))}
                fileTypePolicies={fileTypePolicies}
                normalizedExtensions={normalizedExtensions}
                onAddPolicy={() => setFileTypePolicies((prev) => [...prev, { extension: '', level: 'enhanced' }])}
                onUpdatePolicy={(index, updates) =>
                  setFileTypePolicies((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
                  )
                }
                onRemovePolicy={(index) =>
                  setFileTypePolicies((prev) => prev.filter((_, i) => i !== index))
                }
              />
            </div>

            {/* Step 3 */}
            <div className="w-full shrink-0" style={{ width: `${100 / WIZARD_STEPS.length}%` }}>
              <WizardStep3Metadata
                assetTypeMetadata={assetTypeMetadata}
                onUpdateRow={(index, updates) =>
                  setAssetTypeMetadata((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
                  )
                }
              />
            </div>

            {/* Step 4 */}
            <div className="w-full shrink-0" style={{ width: `${100 / WIZARD_STEPS.length}%` }}>
              <WizardStep4Discovery
                config={config}
                normalizedExtensions={normalizedExtensions}
                anchorReadiness={anchorReadiness}
                onRecheckAnchors={checkAnchorCoverage}
                configStatus={configStatus}
                onRunDiscovery={handleRunDiscovery}
                discoveryResult={discoveryResult}
                discoverySummary={discoverySummary}
                verificationChecked={verificationChecked}
                onVerificationChange={setVerificationChecked}
              />
            </div>

            {/* Step 5 */}
            <div className="w-full shrink-0" style={{ width: `${100 / WIZARD_STEPS.length}%` }}>
              <WizardStep5Run
                configStatus={configStatus}
                configMessage={configMessage}
                onRunPipeline={handleRunPipeline}
                pipelineSummary={pipelineSummary}
                loading={loading}
                runLoading={runLoading}
                runs={runs}
                selectedRunId={selectedRunId}
                onSelectRun={setSelectedRunId}
                selectedRun={selectedRun}
                runProgress={runProgress}
                assets={assets}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
                selectedAsset={selectedAsset}
                selectedAssetProgress={selectedAssetProgress}
              />
            </div>
          </div>
        </div>

        {/* Error banners */}
        {stepError && (
          <div className="mt-5 text-sm text-red-300 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="w-4 h-4 shrink-0">⚠</span> {stepError}
          </div>
        )}
        {configStatus === 'error' && configMessage && wizardStep !== 5 && (
          <div className="mt-3 text-sm text-red-300 flex items-center gap-2">
            ⚠ {configMessage}
          </div>
        )}
        {!canContinueToNext && wizardStep < 5 && currentStepValidationError && !stepError && (
          <div className="mt-3 text-sm text-white/40 flex items-center gap-2">
            ↑ {currentStepValidationError}
          </div>
        )}

        {/* Footer navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={wizardStep === 1 || configStatus === 'pqc'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-40"
          >
            ← Back
          </button>

          <div className="text-xs text-white/50 text-center hidden sm:block">
            {WIZARD_STEPS[wizardStep - 1].subtitle}
          </div>

          <button
            type="button"
            onClick={goToNextStep}
            disabled={!canContinueToNext}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </GlassPanel>


    </div>
  );
}

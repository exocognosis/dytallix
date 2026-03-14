import { RiskLevel } from '@prisma/client';

export const PQC_PIPELINE_VERSION = 'qv-pqc-v1';

export type PipelineWrapLevel = 'baseline' | 'enhanced' | 'maximum';

export type PipelinePolicy = {
    level: PipelineWrapLevel;
    kemAlgorithm: string;
    signatureAlgorithms: string[];
};

export type PipelineMetadataOverride = {
    dataDomain?: string;
    retentionTag?: string;
    owner?: string;
};

export type AdminActor = {
    id?: string;
    email?: string;
};

export type AdminSystemControlKey =
    | 'pausePipelineWrites'
    | 'pauseAttestationSubmissions'
    | 'pauseWrappingJobs';

export type AdminSystemControlDefinition = {
    controlKey: AdminSystemControlKey;
    label: string;
    description: string;
};

export const ADMIN_SYSTEM_CONTROLS: AdminSystemControlDefinition[] = [
    {
        controlKey: 'pausePipelineWrites',
        label: 'Pause Pipeline Writes',
        description: 'Blocks discovery/pipeline write operations and bulk file transformation jobs.',
    },
    {
        controlKey: 'pauseAttestationSubmissions',
        label: 'Pause Attestation Submissions',
        description: 'Blocks creation of new attestation queue jobs while enabled.',
    },
    {
        controlKey: 'pauseWrappingJobs',
        label: 'Pause Wrapping Jobs',
        description: 'Blocks creation of new PQC wrapping jobs while enabled.',
    },
];

export const ADMIN_SYSTEM_CONTROL_LOOKUP = new Map<string, AdminSystemControlDefinition>(
    ADMIN_SYSTEM_CONTROLS.map((control) => [control.controlKey, control]),
);

export const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
    UNKNOWN: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
};

export type SignatureAnchorRecord = {
    id: string;
    name: string;
    algorithm: string;
    vaultPrivKeyPath: string;
};

export type AssetType = 'tlsendpoint' | 'certificate' | 'datastore' | 'keymaterial' | 'apiendpoint';

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'secret' | 'topsecret';

export type ExposureLevel = 'internal' | 'partnernetwork' | 'publicinternet';

export type ProtectionMode = 'classical' | 'pqc' | 'hybrid';

export type JobStatus = 'pending' | 'running' | 'success' | 'failed';

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  endpoint_or_path: string;
  owner: string;
  sensitivity: SensitivityLevel;
  regulatory_tags: string[];
  exposure_level: ExposureLevel;
  data_lifetime_days: number;
  risk_score: number;
  encryption_profile: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProtectionPolicy {
  id: string;
  name: string;
  description: string;
  kem: string;
  signature_scheme: string;
  symmetric_algo: string;
  mode: ProtectionMode;
  rotation_interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface ProtectionJob {
  id: string;
  asset_id: string;
  policy_id: string;
  status: JobStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  asset_id?: string;
  policy_id?: string;
  job_id?: string;
  actor: string;
  payload_json: Record<string, any>;
  prev_hash: string;
  current_hash: string;
  created_at: string;
}

export interface CreateAssetRequest {
  name: string;
  asset_type: AssetType;
  endpoint_or_path: string;
  owner: string;
  sensitivity: SensitivityLevel;
  regulatory_tags: string[];
  exposure_level: ExposureLevel;
  data_lifetime_days: number;
}

export interface UpdateClassificationRequest {
  owner: string;
  sensitivity: SensitivityLevel;
  regulatory_tags: string[];
  exposure_level: ExposureLevel;
  data_lifetime_days: number;
}

export interface DiscoverTlsRequest {
  hostname: string;
  port: number;
  name: string;
  owner: string;
  sensitivity: SensitivityLevel;
}

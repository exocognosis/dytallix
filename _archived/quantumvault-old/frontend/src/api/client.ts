const API_BASE_URL = '/api';
const API_KEY = 'dev-api-key-change-in-production'; // TODO: Load from env

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  owner: string;
  sensitivity: string;
  risk_score: number;
  pqc_risk_score?: number;
  risk_class?: string;
  status: string;
  encryption_profile?: any;
  business_criticality?: string;
}

export interface RiskSummary {
  total_assets: number;
  average_risk_score: number;
  by_risk_class: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
}

export interface Scan {
  id: string;
  scan_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

export interface Job {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
}

export const getAssets = async (): Promise<Asset[]> => {
  const response = await fetch(`${API_BASE_URL}/assets`, { headers });
  if (!response.ok) throw new Error('Failed to fetch assets');
  const data = await response.json();
  return data.assets || [];
};

export const getAsset = async (id: string): Promise<Asset> => {
  const response = await fetch(`${API_BASE_URL}/assets/${id}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch asset');
  return response.json();
};

export const createAsset = async (assetData: any): Promise<Asset> => {
  const response = await fetch(`${API_BASE_URL}/assets/manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify(assetData),
  });
  if (!response.ok) throw new Error('Failed to create asset');
  return response.json();
};

export const discoverTlsAsset = async (host: string, port: number = 443): Promise<Asset> => {
  const response = await fetch(`${API_BASE_URL}/assets/discover/tls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ host, port }),
  });
  if (!response.ok) throw new Error('Failed to discover asset');
  return response.json();
};

export const getRiskSummary = async (): Promise<RiskSummary> => {
  const response = await fetch(`${API_BASE_URL}/risk/summary`, { headers });
  if (!response.ok) throw new Error('Failed to fetch risk summary');
  return response.json();
};

export const getScans = async (): Promise<Scan[]> => {
  const response = await fetch(`${API_BASE_URL}/scans`, { headers });
  if (!response.ok) throw new Error('Failed to fetch scans');
  const data = await response.json();
  return data.scans || [];
};

export const createScan = async (targets: string[], scanType: string = 'Discovery'): Promise<Scan> => {
  const response = await fetch(`${API_BASE_URL}/scans`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ targets, scan_type: scanType }),
  });
  if (!response.ok) throw new Error('Failed to create scan');
  return response.json();
};

export const evaluateRisk = async (assetIds: string[]): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/risk/evaluate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(assetIds),
  });
  if (!response.ok) throw new Error('Failed to evaluate risk');
  return response.json();
};

export const createAttestationJob = async (anchorId: string, filters: any = {}): Promise<Job> => {
  const response = await fetch(`${API_BASE_URL}/attestations/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ anchor_id: anchorId, filters }),
  });
  if (!response.ok) throw new Error('Failed to create attestation job');
  return response.json();
};

export const getJobs = async (): Promise<{ jobs: Job[] }> => {
  const response = await fetch(`${API_BASE_URL}/jobs`, { headers });
  if (!response.ok) throw new Error('Failed to fetch jobs');
  return response.json();
};

export const getRiskAssets = async (filters: any = {}): Promise<Asset[]> => {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value as string);
    }
  });

  const response = await fetch(`${API_BASE_URL}/risk/assets?${queryParams.toString()}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch risk assets');
  const data = await response.json();
  return data.assets || [];
};

export const getRiskAsset = async (id: string): Promise<Asset> => {
  const response = await fetch(`${API_BASE_URL}/risk/assets/${id}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch risk asset');
  return response.json();
};

export const getRiskWeights = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/risk/weights`, { headers });
  if (!response.ok) throw new Error('Failed to fetch risk weights');
  return response.json();
};

export const updateAssetRiskFields = async (id: string, updates: any): Promise<Asset> => {
  const response = await fetch(`${API_BASE_URL}/risk/assets/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update asset risk fields');
  return response.json();
};

const API_BASE_URL = '/api';
const API_KEY = 'dev-api-key-change-in-production'; // TODO: Load from env

const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
};

export const getAssets = async () => {
    const response = await fetch(`${API_BASE_URL}/assets`, { headers });
    if (!response.ok) throw new Error('Failed to fetch assets');
    return response.json();
};

export const getAsset = async (id) => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch asset');
    return response.json();
};

export const createAsset = async (assetData) => {
    const response = await fetch(`${API_BASE_URL}/assets/manual`, {
        method: 'POST',
        headers,
        body: JSON.stringify(assetData),
    });
    if (!response.ok) throw new Error('Failed to create asset');
    return response.json();
};

export const discoverTlsAsset = async (host, port = 443) => {
    const response = await fetch(`${API_BASE_URL}/assets/discover/tls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ host, port }),
    });
    if (!response.ok) throw new Error('Failed to discover asset');
    return response.json();
};

export const getRiskSummary = async () => {
    const response = await fetch(`${API_BASE_URL}/risk/summary`, { headers });
    if (!response.ok) throw new Error('Failed to fetch risk summary');
    return response.json();
};

export const getScans = async () => {
    const response = await fetch(`${API_BASE_URL}/scans`, { headers });
    if (!response.ok) throw new Error('Failed to fetch scans');
    return response.json();
};

export const createScan = async (targets, scanType = 'Discovery') => {
    const response = await fetch(`${API_BASE_URL}/scans`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targets, scan_type: scanType }),
    });
    if (!response.ok) throw new Error('Failed to create scan');
    return response.json();
};

export const evaluateRisk = async (assetIds) => {
    const response = await fetch(`${API_BASE_URL}/risk/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(assetIds),
    });
    if (!response.ok) throw new Error('Failed to evaluate risk');
    return response.json();
};

export const createAttestationJob = async (anchorId, filters = {}) => {
    const response = await fetch(`${API_BASE_URL}/attestations/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ anchor_id: anchorId, filters }),
    });
    if (!response.ok) throw new Error('Failed to create attestation job');
    return response.json();
};

export const getJobs = async () => {
    const response = await fetch(`${API_BASE_URL}/jobs`, { headers });
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return response.json();
};

export const getRiskAssets = async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value);
        }
    });

    const response = await fetch(`${API_BASE_URL}/risk/assets?${queryParams.toString()}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch risk assets');
    return response.json();
};

export const getRiskAsset = async (id) => {
    const response = await fetch(`${API_BASE_URL}/risk/assets/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch risk asset');
    return response.json();
};

export const getRiskWeights = async () => {
    const response = await fetch(`${API_BASE_URL}/risk/weights`, { headers });
    if (!response.ok) throw new Error('Failed to fetch risk weights');
    return response.json();
};

export const updateAssetRiskFields = async (id, updates) => {
    const response = await fetch(`${API_BASE_URL}/risk/assets/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update asset risk fields');
    return response.json();
};

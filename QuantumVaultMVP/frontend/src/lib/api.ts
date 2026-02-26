import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:13000/api/v1');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect if we're already on the login page or if the error came from the login endpoint
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && typeof window !== 'undefined' && !isLoginRequest) {
      console.warn('API 401 Unauthorized - Redirecting to login', error.config?.url);
      localStorage.removeItem('token');
      // Ensure we redirect to the app login, not the root domain
      window.location.href = '/QuantumVaultMVP/login';
    }
    return Promise.reject(error);
  }
);

// Type definitions
type AssetMetadata = Record<string, unknown>;

interface Policy {
  name: string;
  description?: string;
  rules?: unknown[];
  metadata?: Record<string, any>;
  isActive?: boolean;
}

interface Anchor {
  name: string;
  algorithm: string;
  isActive?: boolean;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const token: string | undefined = response.data?.access_token ?? response.data?.token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    return response.data;
  },
  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    await apiClient.post('/auth/logout');
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getKPIs: async () => {
    const response = await apiClient.get('/dashboard/kpis');
    return response.data;
  },
  getTrends: async (days: number) => {
    const response = await apiClient.get(`/dashboard/trends?days=${days}`);
    return response.data;
  },
  getMigrationTimeline: async () => {
    const response = await apiClient.get('/dashboard/migration-timeline');
    return response.data;
  },
};

// Assets API
export const assetsAPI = {
  getAssets: async () => {
    const response = await apiClient.get('/assets');
    return response.data;
  },
  getAsset: async (id: string) => {
    const response = await apiClient.get(`/assets/${id}`);
    return response.data;
  },
  createAsset: async (data: any) => {
    const response = await apiClient.post('/assets', data);
    return response.data;
  },
  intakeAsset: async (data: any) => {
    const response = await apiClient.post('/assets/intake', data);
    return response.data;
  },
  updateAssetMetadata: async (id: string, metadata: AssetMetadata) => {
    const response = await apiClient.put(`/assets/${id}/metadata`, metadata);
    return response.data;
  },
  ingestKeyMaterial: async (id: string, keyMaterialBase64: string, keyType: string) => {
    const response = await apiClient.post(`/assets/${id}/key-material`, {
      keyMaterial: keyMaterialBase64,
      keyType,
    });
    return response.data;
  },
};

// Policies API
export const policiesAPI = {
  getPolicies: async () => {
    const response = await apiClient.get('/policies');
    return response.data;
  },
  getPolicy: async (id: string) => {
    const response = await apiClient.get(`/policies/${id}`);
    return response.data;
  },
  createPolicy: async (policy: Policy) => {
    const response = await apiClient.post('/policies', policy);
    return response.data;
  },
  updatePolicy: async (id: string, policy: Partial<Policy>) => {
    const response = await apiClient.put(`/policies/${id}`, policy);
    return response.data;
  },
  deletePolicy: async (id: string) => {
    const response = await apiClient.delete(`/policies/${id}`);
    return response.data;
  },
  activatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/activate`);
    return response.data;
  },
  deactivatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/deactivate`);
    return response.data;
  },
  evaluatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/evaluate`);
    return response.data;
  },
};

// Anchors API
export const anchorsAPI = {
  getAnchors: async () => {
    const response = await apiClient.get('/anchors');
    return response.data;
  },
  getAnchor: async (id: string) => {
    const response = await apiClient.get(`/anchors/${id}`);
    return response.data;
  },
  createAnchor: async (anchor: Anchor) => {
    const response = await apiClient.post('/anchors', anchor);
    return response.data;
  },
  rotateAnchor: async (id: string) => {
    const response = await apiClient.post(`/anchors/${id}/rotate`);
    return response.data;
  },
  activateAnchor: async (id: string) => {
    const response = await apiClient.post(`/anchors/${id}/activate`);
    return response.data;
  },
};

// Scans API
export const scansAPI = {
  getTargets: async () => {
    const response = await apiClient.get('/scans/targets');
    return response.data;
  },
  createTarget: async (target: { name: string; type: string; host: string; port: number }) => {
    const response = await apiClient.post('/scans/targets', target);
    return response.data;
  },
  triggerScan: async (targetId: string) => {
    const response = await apiClient.post(`/scans/trigger/${targetId}`);
    return response.data;
  },
  getScanStatus: async (scanId: string) => {
    const response = await apiClient.get(`/scans/status/${scanId}`);
    return response.data;
  },
  getScanHistory: async () => {
    const response = await apiClient.get('/scans/history');
    return response.data;
  },
};

// Storage API
export const storageAPI = {
  getMetrics: async () => {
    const response = await apiClient.get('/storage/metrics');
    return response.data;
  },
  getTenants: async () => {
    const response = await apiClient.get('/storage/tenants');
    return response.data;
  },
};

// Compliance API
export const complianceAPI = {
  getStandards: async () => {
    const response = await apiClient.get('/compliance/standards');
    return response.data;
  },
  getMigrationProgress: async () => {
    const response = await apiClient.get('/compliance/migration-progress');
    return response.data;
  },
};

// Transport API
export const transportAPI = {
  getSessions: async () => {
    const response = await apiClient.get('/transport/sessions');
    return response.data;
  },
  getTunnels: async () => {
    const response = await apiClient.get('/transport/tunnels');
    return response.data;
  },
  getTraffic: async () => {
    const response = await apiClient.get('/transport/traffic');
    return response.data;
  },
};

// Threats API
export const threatsAPI = {
  getMappings: async () => {
    const response = await apiClient.get('/threats/mappings');
    return response.data;
  },
};

// Wrapping API
export const wrappingAPI = {
  wrapAsset: async (assetId: string, anchorId: string) => {
    const response = await apiClient.post('/wrapping/wrap', { assetId, anchorId });
    return response.data;
  },
  getJobStatus: async (jobId: string) => {
    const response = await apiClient.get(`/wrapping/job-status/${jobId}`);
    return response.data;
  },
  bulkWrapByPolicy: async (policyId: string) => {
    const response = await apiClient.post(`/wrapping/bulk-wrap-by-policy/${policyId}`);
    return response.data;
  },
};

// Attestation API
export const attestationAPI = {
  createJob: async (assetIds: string[]) => {
    const response = await apiClient.post('/attestation/create-job', { assetIds });
    return response.data;
  },
  getJobStatus: async (jobId: string) => {
    const response = await apiClient.get(`/attestation/job-status/${jobId}`);
    return response.data;
  },
  getAssetAttestations: async (assetId: string) => {
    const response = await apiClient.get(`/attestation/asset/${assetId}`);
    return response.data;
  },
};

// Admin API - uses longer timeout for bulk operations
const adminClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for discovery/pipeline operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor to admin client too
adminClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const adminAPI = {
  saveScanConfig: async (config: any) => {
    const response = await adminClient.post('/admin/scan-config', config);
    return response.data;
  },
  runDiscovery: async (config: any) => {
    const response = await adminClient.post('/admin/scan', config);
    return response.data;
  },
  runPqcPipeline: async (config: any) => {
    const response = await adminClient.post('/admin/pqc-pipeline', config);
    return response.data;
  },
  getHealth: async () => {
    const response = await apiClient.get('/admin/health');
    return response.data;
  },
  getLogs: async () => {
    const response = await apiClient.get('/admin/logs');
    return response.data;
  },
  getAlgos: async () => {
    const response = await apiClient.get('/admin/algos');
    return response.data;
  },
  updateAlgo: async (id: string, enabled: boolean) => {
    const response = await apiClient.post('/admin/algos/update', { id, enabled });
    return response.data;
  },
};

// Pipeline API
export const pipelineAPI = {
  getRuns: async () => {
    const response = await apiClient.get('/pipeline/runs');
    return response.data;
  },
  getRun: async (id: string) => {
    const response = await apiClient.get(`/pipeline/runs/${id}`);
    return response.data;
  },
  getAsset: async (id: string) => {
    const response = await apiClient.get(`/pipeline/assets/${id}`);
    return response.data;
  },
};

export default apiClient;

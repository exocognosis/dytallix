import axios from 'axios';
import { getDefaultApiBaseUrl, withBasePath } from './base-path';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || getDefaultApiBaseUrl();

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
      window.location.href = withBasePath('/login');
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
  exchangeEnterpriseToken: async (idToken: string) => {
    const response = await apiClient.post('/auth/enterprise/exchange', { idToken });
    const token: string | undefined = response.data?.access_token ?? response.data?.token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    return response.data;
  },
  exchangeServiceAccountToken: async (clientId: string, clientSecret: string) => {
    const response = await apiClient.post('/auth/service-account/token', { clientId, clientSecret });
    const token: string | undefined = response.data?.access_token ?? response.data?.token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
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
  getImplementationRoadmap: async () => {
    const response = await apiClient.get('/dashboard/implementation-roadmap');
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
    const response = await apiClient.delete(`/policies/${id}`, { data: {} });
    return response.data;
  },
  activatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/activate`, {});
    return response.data;
  },
  deactivatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/deactivate`, {});
    return response.data;
  },
  evaluatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/evaluate`, {});
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
  deactivateAnchor: async (id: string) => {
    const response = await apiClient.post(`/anchors/${id}/deactivate`);
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

// Internal access API
export const accessAPI = {
  getPolicyMatrix: async () => {
    const response = await apiClient.get('/access/policy-matrix');
    return response.data;
  },
  getManagedCredentials: async (status?: string) => {
    const response = await apiClient.get('/access/managed-credentials', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  getAssets: async (params?: {
    classificationLevel?: string;
    lifecycleState?: string;
    legalHold?: boolean;
    search?: string;
  }) => {
    const response = await apiClient.get('/access/assets', { params });
    return response.data;
  },
  getAsset: async (id: string) => {
    const response = await apiClient.get(`/access/assets/${id}`);
    return response.data;
  },
  setLegalHold: async (id: string, enabled: boolean, reason?: string) => {
    const response = await apiClient.patch(`/access/assets/${id}/legal-hold`, { enabled, reason });
    return response.data;
  },
  requestAccess: async (payload: {
    pipelineAssetId: string;
    action: 'VIEW' | 'DOWNLOAD' | 'CONTROLLED_DOWNLOAD';
    ttlSeconds?: number;
    reason?: string;
  }) => {
    const response = await apiClient.post('/access/requests', payload);
    return response.data;
  },
  getRequests: async (decision?: string) => {
    const response = await apiClient.get('/access/requests', {
      params: decision ? { decision } : undefined,
    });
    return response.data;
  },
  activateRequest: async (id: string) => {
    const response = await apiClient.post(`/access/requests/${id}/activate`, {});
    return response.data;
  },
  getSessions: async (status?: string) => {
    const response = await apiClient.get('/access/sessions', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  getSession: async (id: string) => {
    const response = await apiClient.get(`/access/sessions/${id}`);
    return response.data;
  },
  viewSession: async (id: string, sessionToken: string, mode: 'inline' | 'download' = 'inline') => {
    const response = await apiClient.post(`/access/sessions/${id}/view`, { sessionToken, mode });
    return response.data;
  },
  checkoutSession: async (id: string, payload: {
    sessionToken: string;
    credentialId: string;
    deviceKeyAlgorithm: string;
    devicePublicKey: string;
    agentVersion?: string;
    workspaceId?: string;
    reason?: string;
  }) => {
    const response = await apiClient.post(`/access/sessions/${id}/checkout`, payload);
    return response.data;
  },
  checkinSession: async (id: string, payload: {
    sessionToken: string;
    checkoutBundleId: string;
    contentBase64: string;
    contentSha256?: string;
    mediaType?: string;
    agentVersion?: string;
    editor?: string;
    reason?: string;
  }) => {
    const response = await apiClient.post(`/access/sessions/${id}/checkin`, payload);
    return response.data;
  },
  buildViewerUrl: (id: string, viewerToken: string) => {
    const query = `viewerToken=${encodeURIComponent(viewerToken)}`;
    return `${API_BASE_URL}/access/sessions/${encodeURIComponent(id)}/viewer?${query}`;
  },
  closeSession: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/access/sessions/${id}/close`, { reason });
    return response.data;
  },
  getMonitoringSummary: async () => {
    const response = await apiClient.get('/access/monitoring/summary');
    return response.data;
  },
  getAuditEvents: async (params?: { eventType?: string; pipelineAssetId?: string }) => {
    const response = await apiClient.get('/access/audit', { params });
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
  getRuntime: async () => {
    const response = await apiClient.get('/admin/runtime');
    return response.data;
  },
  getSystemControls: async () => {
    const response = await apiClient.get('/admin/controls');
    return response.data;
  },
  updateSystemControl: async (controlKey: string, enabled: boolean, reason?: string) => {
    const response = await apiClient.post('/admin/controls', {
      controlKey,
      enabled,
      reason,
    });
    return response.data;
  },
  getUsers: async (search?: string) => {
    const response = await apiClient.get('/admin/users', {
      params: search ? { search } : undefined,
    });
    return response.data;
  },
  getAssetsForFreeze: async (search?: string) => {
    const response = await apiClient.get('/admin/assets', {
      params: search ? { search } : undefined,
    });
    return response.data;
  },
  setUserActive: async (userId: string, isActive: boolean, reason?: string) => {
    const response = await apiClient.patch(`/admin/users/${userId}/active`, {
      isActive,
      reason,
    });
    return response.data;
  },
  setAssetFrozen: async (assetId: string, isFrozen: boolean, reason?: string) => {
    const response = await apiClient.patch(`/admin/assets/${assetId}/freeze`, {
      isFrozen,
      reason,
    });
    return response.data;
  },
  getApprovals: async (
    status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING',
    search?: string,
  ) => {
    const response = await apiClient.get('/admin/approvals', {
      params: {
        status,
        ...(search ? { search } : {}),
      },
    });
    return response.data;
  },
  getServiceAccounts: async (search?: string) => {
    const response = await apiClient.get('/admin/service-accounts', {
      params: search ? { search } : undefined,
    });
    return response.data;
  },
  getManagedCredentials: async (params?: { search?: string; status?: string }) => {
    const response = await apiClient.get('/admin/managed-credentials', {
      params,
    });
    return response.data;
  },
  createManagedCredential: async (payload: {
    displayName: string;
    assignedUserId: string;
    deviceId: string;
    deviceLabel?: string;
    deviceKeyAlgorithm: string;
    devicePublicKey: string;
    networkZone: string;
    locationLabel?: string;
    locationCode?: string;
    expiresAt?: string | null;
    reason?: string;
  }) => {
    const response = await apiClient.post('/admin/managed-credentials', payload);
    return response.data;
  },
  updateManagedCredential: async (id: string, payload: {
    displayName?: string;
    deviceLabel?: string | null;
    networkZone?: string;
    locationLabel?: string | null;
    locationCode?: string | null;
    expiresAt?: string | null;
    reason?: string;
  }) => {
    const response = await apiClient.patch(`/admin/managed-credentials/${id}`, payload);
    return response.data;
  },
  revokeManagedCredential: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/admin/managed-credentials/${id}/revoke`, { reason });
    return response.data;
  },
  createServiceAccount: async (payload: {
    displayName: string;
    clientId?: string;
    description?: string;
    role?: string;
    clearanceLevel?: string;
    department?: string;
    projectMemberships?: string[];
    allowedNetworkZones?: string[];
  }) => {
    const response = await apiClient.post('/admin/service-accounts', payload);
    return response.data;
  },
  rotateServiceAccountSecret: async (id: string) => {
    const response = await apiClient.post(`/admin/service-accounts/${id}/rotate-secret`, {});
    return response.data;
  },
  setServiceAccountActive: async (id: string, isActive: boolean, reason?: string) => {
    const response = await apiClient.patch(`/admin/service-accounts/${id}/active`, {
      isActive,
      reason,
    });
    return response.data;
  },
  updateServiceAccount: async (id: string, payload: {
    displayName?: string;
    description?: string | null;
    role?: string;
    clearanceLevel?: string;
    department?: string | null;
    projectMemberships?: string[];
    allowedNetworkZones?: string[];
    reason?: string;
  }) => {
    const response = await apiClient.patch(`/admin/service-accounts/${id}`, payload);
    return response.data;
  },
  approveApproval: async (approvalId: string, reason?: string) => {
    const response = await apiClient.post(`/admin/approvals/${approvalId}/approve`, { reason });
    return response.data;
  },
  rejectApproval: async (approvalId: string, reason?: string) => {
    const response = await apiClient.post(`/admin/approvals/${approvalId}/reject`, { reason });
    return response.data;
  },
  getRiskRules: async () => {
    const response = await apiClient.get('/admin/risk-rules');
    return response.data;
  },
  updateRiskRules: async (payload: {
    maxRiskScoreAutoApprove: number;
    requireApprovalAtRiskLevel: string;
    maxAssetsPerRun: number;
  }) => {
    const response = await apiClient.post('/admin/risk-rules', payload);
    return response.data;
  },
  clearRiskRules: async () => {
    const response = await apiClient.delete('/admin/risk-rules', { data: {} });
    return response.data;
  },
  getLogs: async () => {
    const response = await apiClient.get('/admin/logs');
    return response.data;
  },
  getActivity: async (params?: {
    function?: string;
    source?: string;
    result?: string;
    actor?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const response = await apiClient.get('/admin/activity', { params });
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
  getKeyGovernanceStatus: async () => {
    const response = await apiClient.get('/admin/keys/status');
    return response.data;
  },
  rotateAttestationSigner: async (payload?: {
    reason?: string;
    changeTicket?: string;
    requestedBy?: string;
    expectedPriorKeyId?: string;
    runRecoveryTest?: boolean;
  }) => {
    const response = await apiClient.post('/admin/keys/attestation/rotate', payload || {});
    return response.data;
  },
  rotateTransportKeys: async (payload?: {
    reason?: string;
    changeTicket?: string;
    requestedBy?: string;
    expectedPriorKemKeyId?: string;
    expectedPriorIdentityKeyId?: string;
    runRecoveryTest?: boolean;
  }) => {
    const response = await apiClient.post('/admin/keys/transport/rotate', payload || {});
    return response.data;
  },
  runKeyRecoveryTests: async (payload?: {
    scope?: 'attestation' | 'transport' | 'all';
    requestedBy?: string;
  }) => {
    const response = await apiClient.post('/admin/keys/recovery-test', payload || {});
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

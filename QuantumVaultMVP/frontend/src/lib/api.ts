import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Type definitions
interface AssetMetadata {
  [key: string]: string | number | boolean;
}

interface Policy {
  name: string;
  description?: string;
  rules?: any[];
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
    if (response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
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
  updateAssetMetadata: async (id: string, metadata: AssetMetadata) => {
    const response = await apiClient.put(`/assets/${id}/metadata`, metadata);
    return response.data;
  },
};

// Policies API
export const policiesAPI = {
  getPolicies: async () => {
    const response = await apiClient.get('/policies');
    return response.data;
  },
  createPolicy: async (policy: Policy) => {
    const response = await apiClient.post('/policies', policy);
    return response.data;
  },
  activatePolicy: async (id: string) => {
    const response = await apiClient.post(`/policies/${id}/activate`);
    return response.data;
  },
};

// Anchors API
export const anchorsAPI = {
  getAnchors: async () => {
    const response = await apiClient.get('/anchors');
    return response.data;
  },
  createAnchor: async (anchor: Anchor) => {
    const response = await apiClient.post('/anchors', anchor);
    return response.data;
  },
};

export default apiClient;

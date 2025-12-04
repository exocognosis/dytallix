import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8080';
const API_KEY = 'dev-api-key-change-in-production';

// Types
export interface AssetWithRisk {
  id: string;
  name: string;
  asset_type: string;
  owner: string;
  environment?: string;
  business_criticality: string;
  crypto_usage: string;
  exposure_type: string;
  
  // Risk dimensions
  aqv?: number;
  dlv?: number;
  imp?: number;
  exp?: number;
  agi?: number;
  ccw?: number;
  
  // Composite risk
  pqc_risk_score?: number;
  risk_class?: string;
  
  created_at: string;
  updated_at: string;
}

export interface RiskSummary {
  total_assets: number;
  by_risk_class: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
  by_environment: Record<string, {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  }>;
  by_crypto_usage: Record<string, number>;
  average_risk_score: number;
  assets_needing_attention: number;
}

export interface RiskWeights {
  name: string;
  aqv: number;
  dlv: number;
  imp: number;
  exp: number;
  agi: number;
  ccw: number;
}

// API client
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'X-API-Key': API_KEY,
  },
});

// Hooks
export function useRiskAssets(filters?: {
  risk_class?: string;
  environment?: string;
  crypto_usage?: string;
  min_risk_score?: number;
  max_risk_score?: number;
}) {
  const [data, setData] = useState<AssetWithRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/risk/assets', { params: filters });
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch risk assets');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [filters?.risk_class, filters?.environment, filters?.crypto_usage, filters?.min_risk_score, filters?.max_risk_score]);

  return { data, loading, error };
}

export function useRiskAsset(assetId: string) {
  const [data, setData] = useState<AssetWithRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/risk/assets/${assetId}`);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch risk asset');
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  return { data, loading, error };
}

export function useRiskSummary() {
  const [data, setData] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/risk/summary');
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch risk summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return { data, loading, error, refetch: () => {} };
}

export function useRiskWeights() {
  const [data, setData] = useState<RiskWeights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/risk/weights');
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch risk weights');
      } finally {
        setLoading(false);
      }
    };

    fetchWeights();
  }, []);

  return { data, loading, error };
}

export async function updateAssetRiskFields(assetId: string, updates: any): Promise<AssetWithRisk> {
  const response = await apiClient.patch(`/api/risk/assets/${assetId}`, updates);
  return response.data;
}

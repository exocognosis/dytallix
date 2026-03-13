import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8080';
const API_KEY = 'dev-api-key-change-in-production';

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  endpoint_or_path: string;
  owner: string;
  sensitivity: string;
  regulatory_tags: string[];
  exposure_level: string;
  data_lifetime_days: number;
  encryption_profile: any;
  environment?: string;
  business_criticality?: string;
  crypto_usage?: string;
  exposure_type?: string;
  data_sensitivity?: string;
  crypto_agility?: string;
  risk_score: number;
  risk_class?: string;
  created_at: string;
  updated_at: string;
  algo_pk?: string;
  algo_sym?: string;
  sym_key_bits?: number;
  pk_key_bits?: number;
  stores_long_lived_data?: boolean;
  pqc_risk_score?: number;
}

export const SimpleAssetDetail: React.FC = () => {
  const { id, assetId } = useParams<{ id?: string; assetId?: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const actualId = id || assetId;
    console.log('[SimpleAssetDetail] Route params - id:', id, 'assetId:', assetId, 'actualId:', actualId);
    
    if (!actualId) {
      setError('No asset ID provided');
      setLoading(false);
      return;
    }

    const fetchAsset = async () => {
      try {
        setLoading(true);
        console.log(`[SimpleAssetDetail] Fetching asset: ${actualId}`);
        const response = await fetch(`${API_BASE}/api/assets/${actualId}`, {
          headers: { 'X-API-Key': API_KEY }
        });

        console.log(`[SimpleAssetDetail] Response status: ${response.status}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Asset not found');
          }
          throw new Error(`Failed to fetch asset: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[SimpleAssetDetail] Asset data:', data);
        setAsset(data);
      } catch (err) {
        console.error('[SimpleAssetDetail] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load asset');
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id, assetId]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ') || 'None';
    return String(value);
  };

  const getRiskColor = (score: number): string => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  const getRiskLevel = (score: number): string => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading asset details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
          Error: {error}
        </div>
        <button
          onClick={() => navigate('/assets')}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back to Assets
        </button>
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: '#666' }}>Asset not found</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem' 
        }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', color: '#1a1a1a' }}>
              {asset.name}
            </h1>
            <div style={{ color: '#666', fontSize: '1rem' }}>
              {asset.asset_type} • {asset.owner} • {new Date(asset.created_at).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => navigate('/assets')}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Assets
          </button>
        </div>

        {/* Risk Summary Card */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
            🎯 Risk Assessment
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: getRiskColor(asset.risk_score) 
              }}>
                {asset.risk_score}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Overall Risk Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '700', 
                color: getRiskColor(asset.risk_score),
                padding: '0.5rem',
                background: getRiskColor(asset.risk_score) + '20',
                borderRadius: '6px'
              }}>
                {getRiskLevel(asset.risk_score)}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Risk Level</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '700', 
                color: asset.encryption_profile?.protected ? '#10b981' : '#ef4444'
              }}>
                {asset.encryption_profile?.protected ? '✓ Protected' : '⚠ Unprotected'}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>PQC Status</div>
            </div>
          </div>
        </div>

        {/* Asset Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Basic Information */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a1a1a' }}>
              📋 Basic Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong>ID:</strong> 
                <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {asset.id}
                </span>
              </div>
              <div>
                <strong>Type:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.asset_type)}</span>
              </div>
              <div>
                <strong>Path/Endpoint:</strong> 
                <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {formatValue(asset.endpoint_or_path)}
                </span>
              </div>
              <div>
                <strong>Owner:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.owner)}</span>
              </div>
              <div>
                <strong>Sensitivity:</strong> 
                <span style={{ 
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: asset.sensitivity === 'secret' ? '#fee2e2' : 
                             asset.sensitivity === 'confidential' ? '#fef3c7' : '#e5f3ff',
                  color: asset.sensitivity === 'secret' ? '#dc2626' : 
                         asset.sensitivity === 'confidential' ? '#92400e' : '#1e40af'
                }}>
                  {formatValue(asset.sensitivity)}
                </span>
              </div>
              <div>
                <strong>Exposure Level:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.exposure_level)}</span>
              </div>
              <div>
                <strong>Regulatory Tags:</strong> 
                <div style={{ marginTop: '0.25rem' }}>
                  {asset.regulatory_tags.map((tag, index) => (
                    <span key={index} style={{
                      display: 'inline-block',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Profile */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a1a1a' }}>
              🔐 Cryptographic Profile
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong>Protection Status:</strong> 
                <span style={{ 
                  marginLeft: '0.5rem',
                  color: asset.encryption_profile?.protected ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {asset.encryption_profile?.protected ? '✓ PQC Protected' : '⚠ Not Protected'}
                </span>
              </div>
              
              {asset.encryption_profile?.protected && (
                <>
                  <div>
                    <strong>KEM Algorithm:</strong> 
                    <span style={{ marginLeft: '0.5rem' }}>
                      {formatValue(asset.encryption_profile?.kem)}
                    </span>
                  </div>
                  <div>
                    <strong>Signature Scheme:</strong> 
                    <span style={{ marginLeft: '0.5rem' }}>
                      {formatValue(asset.encryption_profile?.signature_scheme)}
                    </span>
                  </div>
                  <div>
                    <strong>Symmetric Algorithm:</strong> 
                    <span style={{ marginLeft: '0.5rem' }}>
                      {formatValue(asset.encryption_profile?.symmetric_algo)}
                    </span>
                  </div>
                </>
              )}
              
              <div>
                <strong>Public Key Algorithm:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.algo_pk)}</span>
              </div>
              <div>
                <strong>Symmetric Algorithm:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>
                  {formatValue(asset.algo_sym)}
                  {asset.sym_key_bits && ` (${asset.sym_key_bits}-bit)`}
                </span>
              </div>
              <div>
                <strong>Crypto Usage:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.crypto_usage)}</span>
              </div>
              <div>
                <strong>Crypto Agility:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.crypto_agility)}</span>
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a1a1a' }}>
              ⚡ Risk Factors
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong>Environment:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.environment)}</span>
              </div>
              <div>
                <strong>Business Criticality:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.business_criticality)}</span>
              </div>
              <div>
                <strong>Data Sensitivity:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.data_sensitivity)}</span>
              </div>
              <div>
                <strong>Exposure Type:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.exposure_type)}</span>
              </div>
              <div>
                <strong>Long-lived Data:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{formatValue(asset.stores_long_lived_data)}</span>
              </div>
              <div>
                <strong>Data Lifetime:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>{asset.data_lifetime_days} days</span>
              </div>
            </div>
          </div>

          {/* Timestamps & Actions */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1a1a1a' }}>
              ⏰ Timeline & Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong>Created:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>
                  {new Date(asset.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <strong>Last Updated:</strong> 
                <span style={{ marginLeft: '0.5rem' }}>
                  {new Date(asset.updated_at).toLocaleString()}
                </span>
              </div>
              {asset.encryption_profile?.encrypted_at && (
                <div>
                  <strong>PQC Protected:</strong> 
                  <span style={{ marginLeft: '0.5rem' }}>
                    {new Date(asset.encryption_profile.encrypted_at).toLocaleString()}
                  </span>
                </div>
              )}
              
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                {!asset.encryption_profile?.protected ? (
                  <div style={{
                    padding: '1rem',
                    background: '#fef3c7',
                    borderRadius: '6px',
                    border: '1px solid #f59e0b'
                  }}>
                    <div style={{ color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>
                      ⚠️ Recommended Actions:
                    </div>
                    <ul style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                      <li>Apply post-quantum cryptographic protection</li>
                      <li>Implement hybrid encryption mode</li>
                      <li>Enable quantum-safe key exchange</li>
                      <li>Update to quantum-resistant algorithms</li>
                    </ul>
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: '#d1fae5',
                    borderRadius: '6px',
                    border: '1px solid #10b981'
                  }}>
                    <div style={{ color: '#065f46', fontWeight: '600', marginBottom: '0.5rem' }}>
                      ✅ PQC Protected
                    </div>
                    <div style={{ color: '#065f46', fontSize: '0.9rem' }}>
                      This asset is protected with post-quantum cryptography using {asset.encryption_profile?.kem} and {asset.encryption_profile?.signature_scheme}.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

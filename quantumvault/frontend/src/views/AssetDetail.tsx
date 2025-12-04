import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRiskAsset } from '../api/riskApi';

const AssetDetail: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { data: asset, loading, error } = useRiskAsset(assetId || '');

  // Helper function to format enum values for display
  const formatEnumValue = (value?: string): string => {
    if (!value) return 'Not specified';
    
    // Map enum values to display strings
    const enumMap: Record<string, string> = {
      'unknown': 'Unknown',
      'other': 'Other',
      'production': 'Production',
      'development': 'Development',
      'staging': 'Staging',
      'testing': 'Testing',
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'public_key_crypto': 'Public Key Cryptography',
      'symmetric_crypto': 'Symmetric Cryptography',
      'hashing': 'Hashing',
      'signing': 'Digital Signing',
      'key_exchange': 'Key Exchange',
      'internet': 'Internet',
      'partner_network': 'Partner Network',
      'internal': 'Internal',
      'isolated': 'Isolated',
    };
    
    return enumMap[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getRiskClassColor = (riskClass?: string) => {
    switch (riskClass) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskClassBg = (riskClass?: string) => {
    switch (riskClass) {
      case 'Critical': return '#fee2e2';
      case 'High': return '#ffedd5';
      case 'Medium': return '#fef3c7';
      case 'Low': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  const getDimensionExplanation = (dimension: string, score?: number): string => {
    if (score === undefined) return 'Not computed';
    
    switch (dimension) {
      case 'AQV':
        if (score === 5) return 'Quantum-vulnerable public-key algorithms detected (RSA/ECC)';
        if (score >= 3) return 'Symmetric-only encryption with ≤128-bit keys';
        return 'Strong symmetric encryption (≥192-bit keys)';
      
      case 'DLV':
        if (score === 5) return 'Long-lived confidential/regulated data requiring extended protection';
        if (score >= 3) return 'Confidential or regulated data with standard retention';
        return 'Limited data retention or lower sensitivity';
      
      case 'IMP':
        if (score === 5) return 'Mission-critical system or infrastructure';
        if (score >= 3) return 'Important business system';
        return 'Non-critical system';
      
      case 'EXP':
        if (score === 5) return 'Publicly exposed on the Internet';
        if (score >= 3) return 'Partner network or internal exposure';
        return 'Restricted or air-gapped network';
      
      case 'AGI':
        if (score === 5) return 'Difficult to change (firmware, embedded systems)';
        if (score >= 3) return 'Moderate effort to upgrade cryptography';
        return 'Highly agile, easy to upgrade';
      
      case 'CCW':
        if (score === 5) return 'Critical classical weaknesses detected (SHA1, MD5, weak keys)';
        if (score >= 3) return 'Moderate classical cryptography weaknesses';
        return 'Modern, secure classical cryptography';
      
      default:
        return 'Unknown dimension';
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading asset details...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!asset) {
    return <div style={{ padding: '2rem' }}>Asset not found</div>;
  }

  const dimensions = [
    { key: 'AQV', label: 'Algorithm Quantum Vulnerability', value: asset.aqv, icon: '🔐' },
    { key: 'DLV', label: 'Data Longevity / Time-to-Value', value: asset.dlv, icon: '⏳' },
    { key: 'IMP', label: 'Business / System Impact', value: asset.imp, icon: '⚠️' },
    { key: 'EXP', label: 'Exposure', value: asset.exp, icon: '🌐' },
    { key: 'AGI', label: 'Cryptographic Agility', value: asset.agi, icon: '🔄' },
    { key: 'CCW', label: 'Classical Crypto Weakness', value: asset.ccw, icon: '🛡️' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '1.5rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/pqc-risk')}
            style={{
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                fontSize: '1.75rem', 
                fontWeight: '600', 
                color: '#1a1a1a',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                {asset.name}
              </h1>
              <p style={{ 
                color: '#666', 
                fontSize: '0.95rem',
                margin: 0
              }}>
                Asset ID: {asset.id}
              </p>
            </div>
            
            <div style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              background: getRiskClassBg(asset.risk_class),
              border: `2px solid ${getRiskClassColor(asset.risk_class)}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                RISK CLASS
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700',
                color: getRiskClassColor(asset.risk_class)
              }}>
                {asset.risk_class || 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Risk Score Display */}
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1.5rem'
          }}>
            PQC Risk Score
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: getRiskClassBg(asset.risk_class),
              border: `4px solid ${getRiskClassColor(asset.risk_class)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: getRiskClassColor(asset.risk_class)
              }}>
                {asset.pqc_risk_score ?? 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                / 100
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{
                height: '40px',
                background: '#f3f4f6',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${asset.pqc_risk_score ?? 0}%`,
                  background: `linear-gradient(90deg, ${getRiskClassColor(asset.risk_class)}, ${getRiskClassColor(asset.risk_class)}cc)`,
                  transition: 'width 0.5s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '1rem'
                }}>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
                    {asset.pqc_risk_score ?? 0}%
                  </span>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#666'
              }}>
                <span>Low Risk</span>
                <span>Medium Risk</span>
                <span>High Risk</span>
                <span>Critical Risk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Dimensions */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#1a1a1a',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            RISK DIMENSIONS
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1rem'
          }}>
            {dimensions.map(dim => (
              <div key={dim.key} style={{
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{dim.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                        {dim.key}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                        {dim.label}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: dim.value === 5 ? '#fee2e2' : dim.value && dim.value >= 3 ? '#fef3c7' : '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: dim.value === 5 ? '#ef4444' : dim.value && dim.value >= 3 ? '#f59e0b' : '#10b981'
                    }}>
                      {dim.value ?? 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div style={{
                  height: '6px',
                  background: '#f3f4f6',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${((dim.value ?? 0) / 5) * 100}%`,
                    background: dim.value === 5 ? '#ef4444' : dim.value && dim.value >= 3 ? '#f59e0b' : '#10b981',
                    transition: 'width 0.3s'
                  }} />
                </div>
                
                <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.5' }}>
                  {getDimensionExplanation(dim.key, dim.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Details */}
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1.5rem'
          }}>
            Asset Details
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Asset Type
              </div>
              <div style={{ fontSize: '1rem' }}>{asset.asset_type}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Owner
              </div>
              <div style={{ fontSize: '1rem' }}>{asset.owner}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Environment
              </div>
              <div style={{ fontSize: '1rem' }}>{formatEnumValue(asset.environment)}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Business Criticality
              </div>
              <div style={{ fontSize: '1rem' }}>{formatEnumValue(asset.business_criticality)}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Crypto Usage
              </div>
              <div style={{ fontSize: '1rem' }}>{formatEnumValue(asset.crypto_usage)}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Exposure Type
              </div>
              <div style={{ fontSize: '1rem' }}>{formatEnumValue(asset.exposure_type)}</div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Created
              </div>
              <div style={{ fontSize: '1rem' }}>
                {new Date(asset.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Last Updated
              </div>
              <div style={{ fontSize: '1rem' }}>
                {new Date(asset.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;

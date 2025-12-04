import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8080';
const API_KEY = 'dev-api-key-change-in-production';

interface DiscoveredAsset {
  id?: string;
  name: string;
  asset_type: string;
  endpoint_or_path: string;
  owner: string;
  sensitivity: string;
  risk_score?: number;
  vulnerabilities: string[];
  recommendations: string[];
}

export const AssetDiscoveryView: React.FC = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [discoveredAssets, setDiscoveredAssets] = useState<DiscoveredAsset[]>([]);
  const [scanResults, setScanResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulated asset discovery scan
  const performAssetScan = async () => {
    setScanning(true);
    setError(null);

    try {
      // Simulate scanning for non-PQC compliant assets
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate scan time

      const mockDiscoveredAssets: DiscoveredAsset[] = [
        {
          name: 'Legacy API Gateway',
          asset_type: 'tlsendpoint',
          endpoint_or_path: 'api.company.com:443',
          owner: 'api-team',
          sensitivity: 'confidential',
          risk_score: 85,
          vulnerabilities: [
            'RSA-2048 key vulnerable to quantum attacks',
            'Uses classical ECDSA signatures',
            'No post-quantum cipher suites'
          ],
          recommendations: [
            'Upgrade to Kyber-1024 for key exchange',
            'Implement Dilithium-3 signatures',
            'Enable hybrid TLS mode'
          ]
        },
        {
          name: 'Customer Database Connection',
          asset_type: 'datastore',
          endpoint_or_path: '/data/postgres/customers',
          owner: 'db-team',
          sensitivity: 'secret',
          risk_score: 92,
          vulnerabilities: [
            'AES-256 symmetric encryption only',
            'No quantum-safe key derivation',
            'Classical authentication mechanisms'
          ],
          recommendations: [
            'Add post-quantum key encapsulation',
            'Implement quantum-safe authentication',
            'Upgrade to hybrid encryption profile'
          ]
        },
        {
          name: 'Payment Processing Service',
          asset_type: 'apiendpoint',
          endpoint_or_path: '/api/payments/process',
          owner: 'payments-team',
          sensitivity: 'secret',
          risk_score: 88,
          vulnerabilities: [
            'RSA-based JWT signing',
            'Classical Diffie-Hellman key exchange',
            'No quantum-resistant algorithms'
          ],
          recommendations: [
            'Switch to Dilithium for JWT signing',
            'Implement CRYSTALS-Kyber key exchange',
            'Add quantum-safe certificate validation'
          ]
        },
        {
          name: 'Internal File Server',
          asset_type: 'datastore',
          endpoint_or_path: '/internal/files/shared',
          owner: 'infrastructure-team',
          sensitivity: 'internal',
          risk_score: 65,
          vulnerabilities: [
            'SMB protocol without PQC',
            'Classical certificate-based auth',
            'Legacy encryption standards'
          ],
          recommendations: [
            'Enable post-quantum SMB encryption',
            'Upgrade certificate infrastructure',
            'Implement crypto-agility framework'
          ]
        },
        {
          name: 'Employee VPN Gateway',
          asset_type: 'tlsendpoint',
          endpoint_or_path: 'vpn.company.com:1194',
          owner: 'security-team',
          sensitivity: 'confidential',
          risk_score: 78,
          vulnerabilities: [
            'OpenVPN with classical cryptography',
            'RSA certificate authentication',
            'No quantum-safe tunneling'
          ],
          recommendations: [
            'Upgrade to quantum-safe VPN protocols',
            'Implement post-quantum certificates',
            'Add hybrid encryption modes'
          ]
        }
      ];

      setDiscoveredAssets(mockDiscoveredAssets);
      setScanResults({
        totalScanned: 156,
        vulnerableAssets: mockDiscoveredAssets.length,
        criticalRisk: mockDiscoveredAssets.filter(a => a.risk_score! >= 80).length,
        scanDuration: '2.3 seconds',
        scanMethod: 'Network discovery + Certificate analysis + Protocol inspection'
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Asset discovery failed');
    } finally {
      setScanning(false);
    }
  };

  const addAssetToDatabase = async (asset: DiscoveredAsset) => {
    try {
      const assetData = {
        name: asset.name,
        asset_type: asset.asset_type,
        endpoint_or_path: asset.endpoint_or_path,
        owner: asset.owner,
        sensitivity: asset.sensitivity,
        regulatory_tags: ['discovered', 'needs-pqc-upgrade'],
        exposure_level: asset.asset_type === 'tlsendpoint' ? 'publicinternet' : 'internal',
        data_lifetime_days: 365,
        encryption_profile: {
          protected: false,
          discovered: true,
          vulnerabilities: asset.vulnerabilities,
          recommendations: asset.recommendations,
          risk_score: asset.risk_score,
          discovered_at: new Date().toISOString()
        },
        
        // PQC Risk fields
        environment: 'production',
        business_criticality: asset.risk_score! >= 80 ? 'high' : 'medium',
        crypto_usage: asset.asset_type === 'tlsendpoint' ? 'data_in_transit' : 'data_at_rest',
        exposure_type: asset.asset_type === 'tlsendpoint' ? 'internet' : 'internal',
        data_sensitivity: asset.sensitivity,
        crypto_agility: 'low',
        stores_long_lived_data: true,
        algo_pk: 'RSA',  // Discovered as using classical RSA
        algo_sym: 'AES',
        sym_key_bits: 256
      };

      const response = await fetch(`${API_BASE}/api/assets/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(assetData)
      });

      if (!response.ok) {
        throw new Error(`Failed to add asset: ${response.statusText}`);
      }

      // Update the discovered asset to show it's been added
      setDiscoveredAssets(prev => prev.map(a => 
        a === asset ? { ...a, id: 'added' } : a
      ));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    }
  };

  const getRiskColor = (score: number): string => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{ padding: '2rem', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem' 
        }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', color: '#1a1a1a' }}>
              🔍 Asset Discovery & Risk Assessment
            </h1>
            <p style={{ color: '#666', margin: 0 }}>
              Scan your infrastructure for non-PQC compliant cryptographic assets
            </p>
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

        {/* Scan Control */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
            Infrastructure Scan
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Discover assets using classical cryptography that need post-quantum upgrades
          </p>
          
          <button
            onClick={performAssetScan}
            disabled={scanning}
            style={{
              background: scanning ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: scanning ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {scanning ? '🔄 Scanning Infrastructure...' : '🔍 Start Asset Discovery Scan'}
          </button>

          {scanning && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: '#f0f9ff', 
              borderRadius: '6px',
              border: '1px solid #0ea5e9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #0ea5e9',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '0.5rem'
                }} />
                <span style={{ color: '#0369a1', fontWeight: '600' }}>Scanning in progress...</span>
              </div>
              <p style={{ color: '#0369a1', margin: 0, fontSize: '0.9rem' }}>
                • Probing network endpoints<br/>
                • Analyzing TLS configurations<br/>
                • Checking certificate algorithms<br/>
                • Evaluating encryption standards
              </p>
            </div>
          )}
        </div>

        {/* Scan Results Summary */}
        {scanResults && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
              📊 Scan Results
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                  {scanResults.totalScanned}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Assets Scanned</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                  {scanResults.vulnerableAssets}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Vulnerable Assets</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                  {scanResults.criticalRisk}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Critical Risk</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>
                  {scanResults.scanDuration}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Scan Duration</div>
              </div>
            </div>
          </div>
        )}

        {/* Discovered Assets */}
        {discoveredAssets.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
                ⚠️ Discovered Non-PQC Compliant Assets
              </h2>
            </div>
            
            <div style={{ padding: '0' }}>
              {discoveredAssets.map((asset, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1.5rem',
                    borderBottom: index < discoveredAssets.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ 
                        margin: '0 0 0.5rem 0', 
                        color: '#1a1a1a',
                        fontSize: '1.1rem' 
                      }}>
                        {asset.name}
                      </h3>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                        <span style={{ marginRight: '1rem' }}>
                          <strong>Type:</strong> {asset.asset_type}
                        </span>
                        <span style={{ marginRight: '1rem' }}>
                          <strong>Owner:</strong> {asset.owner}
                        </span>
                        <span style={{ marginRight: '1rem' }}>
                          <strong>Path:</strong> {asset.endpoint_or_path}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'inline-block',
                        background: getRiskColor(asset.risk_score!),
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        Risk Score: {asset.risk_score}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {asset.id !== 'added' ? (
                        <button
                          onClick={() => addAssetToDatabase(asset)}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          ➕ Add to Database
                        </button>
                      ) : (
                        <span style={{
                          background: '#d1fae5',
                          color: '#10b981',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}>
                          ✓ Added
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <h4 style={{ 
                        color: '#dc2626', 
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        🚨 Vulnerabilities
                      </h4>
                      <ul style={{ margin: '0', padding: '0 0 0 1.2rem', color: '#666' }}>
                        {asset.vulnerabilities.map((vuln, vIndex) => (
                          <li key={vIndex} style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                            {vuln}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 style={{ 
                        color: '#059669', 
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        💡 Recommendations
                      </h4>
                      <ul style={{ margin: '0', padding: '0 0 0 1.2rem', color: '#666' }}>
                        {asset.recommendations.map((rec, rIndex) => (
                          <li key={rIndex} style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid #fecaca',
            marginTop: '1rem'
          }}>
            ⚠️ Error: {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

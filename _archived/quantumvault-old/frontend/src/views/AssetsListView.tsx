import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Asset } from '../models/types';
import '../styles/views.css';

export const AssetsListView: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listAssets();
      setAssets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number): string => {
    if (score >= 60) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    if (score >= 20) return '#eab308';
    return '#10b981';
  };

  if (loading) return <div className="loading">Loading assets...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="container">
      <div className="header">
        <h1>Cryptographic Assets</h1>
        <div className="header-actions">
          <Link to="/assets/create" className="button button-primary">Create Asset</Link>
          <Link to="/assets/discover" className="button">Discover TLS</Link>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <p>No assets found. Create your first asset to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Sensitivity</th>
                <th>Exposure</th>
                <th>Risk Score</th>
                <th>Protected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <Link to={`/assets/${asset.id}`} className="link">
                      {asset.name}
                    </Link>
                  </td>
                  <td>
                    <span className="badge">{asset.asset_type}</span>
                  </td>
                  <td>{asset.owner}</td>
                  <td>
                    <span className="badge badge-sensitivity">{asset.sensitivity}</span>
                  </td>
                  <td>{asset.exposure_level}</td>
                  <td>
                    <span
                      className="risk-score"
                      style={{ backgroundColor: getRiskColor(asset.risk_score) }}
                    >
                      {asset.risk_score}
                    </span>
                  </td>
                  <td>
                    {asset.encryption_profile.protected ? (
                      <span className="badge badge-success">✓ Protected</span>
                    ) : (
                      <span className="badge badge-warning">Not Protected</span>
                    )}
                  </td>
                  <td>
                    <Link to={`/assets/${asset.id}`} className="button button-sm">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskSummary, getRiskAssets } from '../../services/quantumVaultClient';

const PqcRiskDashboard = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState(null);

    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(true);
    const [assetsError, setAssetsError] = useState(null);

    const [riskClassFilter, setRiskClassFilter] = useState('');
    const [envFilter, setEnvFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch summary
    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setSummaryLoading(true);
                const data = await getRiskSummary();
                setSummary(data);
                setSummaryError(null);
            } catch (err) {
                setSummaryError(err.message);
            } finally {
                setSummaryLoading(false);
            }
        };
        fetchSummary();
    }, []);

    // Fetch assets with filters
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setAssetsLoading(true);
                const filters = {
                    risk_class: riskClassFilter || undefined,
                    environment: envFilter || undefined,
                };
                const data = await getRiskAssets(filters);
                setAssets(data);
                setAssetsError(null);
            } catch (err) {
                setAssetsError(err.message);
            } finally {
                setAssetsLoading(false);
            }
        };
        fetchAssets();
    }, [riskClassFilter, envFilter]);

    // Filter assets by search term in frontend
    const filteredAssets = assets.filter(asset => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return asset.name.toLowerCase().includes(term) ||
            asset.owner.toLowerCase().includes(term);
    });

    const getRiskClassColor = (riskClass) => {
        switch (riskClass) {
            case 'Critical': return '#ef4444';
            case 'High': return '#f97316';
            case 'Medium': return '#f59e0b';
            case 'Low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getRiskClassBg = (riskClass) => {
        switch (riskClass) {
            case 'Critical': return '#fee2e2';
            case 'High': return '#ffedd5';
            case 'Medium': return '#fef3c7';
            case 'Low': return '#d1fae5';
            default: return '#f3f4f6';
        }
    };

    if (summaryLoading) {
        return <div style={{ padding: '2rem' }}>Loading risk summary...</div>;
    }

    if (summaryError) {
        return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {summaryError}</div>;
    }

    if (!summary) {
        return <div style={{ padding: '2rem' }}>No risk data available</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            {/* Header */}
            <div style={{
                background: 'white',
                borderBottom: '1px solid #e0e0e0',
                padding: '1.5rem 2rem',
                marginBottom: '0'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        margin: 0,
                        marginBottom: '0.5rem'
                    }}>
                        Post-Quantum Cryptography Risk Dashboard
                    </h1>
                    <p style={{
                        color: '#666',
                        fontSize: '0.95rem',
                        margin: 0
                    }}>
                        Comprehensive PQC risk assessment and quantum vulnerability analysis
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
                {/* Summary Cards */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        marginBottom: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        RISK OVERVIEW
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                    }}>
                        {/* Total Assets */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.5rem'
                            }}>
                                Total Assets
                            </div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#1a1a1a',
                                marginBottom: '0.5rem'
                            }}>
                                {summary.total_assets}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Scanned and analyzed
                            </div>
                        </div>

                        {/* Critical Assets */}
                        <div style={{
                            background: 'white',
                            border: `2px solid ${getRiskClassColor('Critical')}`,
                            borderRadius: '8px',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.5rem'
                            }}>
                                Critical Risk
                            </div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: getRiskClassColor('Critical'),
                                marginBottom: '0.5rem'
                            }}>
                                {summary.by_risk_class.Critical}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Immediate attention required
                            </div>
                        </div>

                        {/* High Risk */}
                        <div style={{
                            background: 'white',
                            border: `2px solid ${getRiskClassColor('High')}`,
                            borderRadius: '8px',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.5rem'
                            }}>
                                High Risk
                            </div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: getRiskClassColor('High'),
                                marginBottom: '0.5rem'
                            }}>
                                {summary.by_risk_class.High}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Priority remediation
                            </div>
                        </div>

                        {/* Medium Risk */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.5rem'
                            }}>
                                Medium Risk
                            </div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: getRiskClassColor('Medium'),
                                marginBottom: '0.5rem'
                            }}>
                                {summary.by_risk_class.Medium}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Plan for upgrade
                            </div>
                        </div>

                        {/* Low Risk */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.5rem'
                            }}>
                                Low Risk
                            </div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: getRiskClassColor('Low'),
                                marginBottom: '0.5rem'
                            }}>
                                {summary.by_risk_class.Low}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Monitor regularly
                            </div>
                        </div>

                        {/* Average Risk Score */}
                        <div style={{
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '1.25rem'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '0.5rem'
                            }}>
                                Avg PQC Risk Score
                            </div>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#1a1a1a',
                                marginBottom: '0.5rem'
                            }}>
                                {summary.average_risk_score.toFixed(1)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                Out of 100
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk Distribution Chart */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        marginBottom: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        RISK DISTRIBUTION
                    </h2>

                    <div style={{
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {['Critical', 'High', 'Medium', 'Low'].map(riskClass => {
                                const count = summary.by_risk_class[riskClass];
                                const percentage = summary.total_assets > 0
                                    ? (count / summary.total_assets * 100).toFixed(1)
                                    : '0';

                                return (
                                    <div key={riskClass} style={{ flex: 1, minWidth: '150px' }}>
                                        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{riskClass}</span>
                                            <span style={{ fontSize: '0.9rem', color: '#666' }}>{count}</span>
                                        </div>
                                        <div style={{
                                            height: '8px',
                                            background: '#f3f4f6',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${percentage}%`,
                                                background: getRiskClassColor(riskClass),
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                            {percentage}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* PQC Protection Status - Strategic Overview */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        marginBottom: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        PQC PROTECTION STATUS
                    </h2>

                    {(() => {
                        // Calculate protection metrics
                        const protectedAssets = assets.filter(a => a.encryption_profile?.protected);
                        const unprotectedAssets = assets.filter(a => !a.encryption_profile?.protected);
                        const protectionRate = assets.length > 0 ? (protectedAssets.length / assets.length * 100).toFixed(1) : '0';

                        // Critical assets analysis
                        const criticalAssets = assets.filter(a => a.business_criticality === 'critical');
                        const criticalProtected = criticalAssets.filter(a => a.encryption_profile?.protected);
                        const criticalProtectionRate = criticalAssets.length > 0 ? (criticalProtected.length / criticalAssets.length * 100).toFixed(1) : '0';

                        // Algorithm usage breakdown
                        const kemUsage = protectedAssets.reduce((acc, a) => {
                            const kem = a.encryption_profile?.kem || 'Unknown';
                            acc[kem] = (acc[kem] || 0) + 1;
                            return acc;
                        }, {});

                        const signatureUsage = protectedAssets.reduce((acc, a) => {
                            const sig = a.encryption_profile?.signature_scheme || 'None';
                            acc[sig] = (acc[sig] || 0) + 1;
                            return acc;
                        }, {});

                        // Recent activity (last 30 days)
                        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                        const recentlyProtected = protectedAssets.filter(a => {
                            const encryptedAt = a.encryption_profile?.encrypted_at;
                            if (!encryptedAt) return false;
                            return new Date(encryptedAt).getTime() >= thirtyDaysAgo;
                        });

                        // High-risk unprotected
                        const highRiskUnprotected = unprotectedAssets.filter(a =>
                            a.risk_class === 'Critical' || a.risk_class === 'High'
                        );

                        return (
                            <div style={{
                                background: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '1.5rem'
                            }}>
                                {/* Top Metrics Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    {/* Overall Protection Rate */}
                                    <div style={{
                                        padding: '1rem',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                            Overall Protection
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: '700', color: parseFloat(protectionRate) >= 75 ? '#10b981' : parseFloat(protectionRate) >= 50 ? '#f59e0b' : '#ef4444' }}>
                                                {protectionRate}%
                                            </span>
                                            <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                                ({protectedAssets.length}/{assets.length})
                                            </span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            background: '#e5e7eb',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${protectionRate}%`,
                                                background: parseFloat(protectionRate) >= 75 ? '#10b981' : parseFloat(protectionRate) >= 50 ? '#f59e0b' : '#ef4444',
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                    </div>

                                    {/* Critical Asset Protection */}
                                    <div style={{
                                        padding: '1rem',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                            Critical Assets
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: '700', color: parseFloat(criticalProtectionRate) >= 90 ? '#10b981' : '#ef4444' }}>
                                                {criticalProtectionRate}%
                                            </span>
                                            <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                                ({criticalProtected.length}/{criticalAssets.length})
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: parseFloat(criticalProtectionRate) >= 90 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                            {parseFloat(criticalProtectionRate) >= 90 ? '✓ Well Protected' : '⚠ Needs Attention'}
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div style={{
                                        padding: '1rem',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                            Recent Activity (30d)
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                                                {recentlyProtected.length}
                                            </span>
                                            <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                                assets protected
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                            {recentlyProtected.length > 0 ? '📈 Active migration' : '⏸ Low activity'}
                                        </div>
                                    </div>

                                    {/* High-Risk Exposure */}
                                    <div style={{
                                        padding: '1rem',
                                        background: highRiskUnprotected.length > 0 ? '#fef2f2' : '#f9fafb',
                                        borderRadius: '6px',
                                        border: `1px solid ${highRiskUnprotected.length > 0 ? '#fecaca' : '#e5e7eb'}`
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                            High-Risk Unprotected
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: '700', color: highRiskUnprotected.length > 0 ? '#ef4444' : '#10b981' }}>
                                                {highRiskUnprotected.length}
                                            </span>
                                            <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                                assets at risk
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: highRiskUnprotected.length > 0 ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                                            {highRiskUnprotected.length > 0 ? '🚨 Immediate action required' : '✓ All high-risk covered'}
                                        </div>
                                    </div>
                                </div>

                                {/* Algorithm Distribution */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1.5rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '1px solid #e5e7eb'
                                }}>
                                    {/* KEM Algorithms */}
                                    <div>
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.75rem' }}>
                                            🔐 Encryption Algorithms (KEM)
                                        </h3>
                                        {Object.keys(kemUsage).length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {Object.entries(kemUsage)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .map(([algo, count]) => (
                                                        <div key={algo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '0.875rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>
                                                                    {algo}
                                                                </div>
                                                                <div style={{
                                                                    height: '6px',
                                                                    background: '#e5e7eb',
                                                                    borderRadius: '3px',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <div style={{
                                                                        height: '100%',
                                                                        width: `${(count / protectedAssets.length * 100).toFixed(0)}%`,
                                                                        background: '#3b82f6',
                                                                        transition: 'width 0.3s'
                                                                    }} />
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#666', minWidth: '60px', textAlign: 'right' }}>
                                                                {count} ({(count / protectedAssets.length * 100).toFixed(0)}%)
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                                                No encrypted assets yet
                                            </div>
                                        )}
                                    </div>

                                    {/* Signature Algorithms */}
                                    <div>
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.75rem' }}>
                                            ✍️ Signature Algorithms
                                        </h3>
                                        {Object.keys(signatureUsage).length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {Object.entries(signatureUsage)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .map(([algo, count]) => (
                                                        <div key={algo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '0.875rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>
                                                                    {algo}
                                                                </div>
                                                                <div style={{
                                                                    height: '6px',
                                                                    background: '#e5e7eb',
                                                                    borderRadius: '3px',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <div style={{
                                                                        height: '100%',
                                                                        width: `${(count / protectedAssets.length * 100).toFixed(0)}%`,
                                                                        background: '#8b5cf6',
                                                                        transition: 'width 0.3s'
                                                                    }} />
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#666', minWidth: '60px', textAlign: 'right' }}>
                                                                {count} ({(count / protectedAssets.length * 100).toFixed(0)}%)
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                                                No signed assets yet
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Strategic Recommendations */}
                                {(parseFloat(protectionRate) < 75 || highRiskUnprotected.length > 0 || parseFloat(criticalProtectionRate) < 90) && (
                                    <div style={{
                                        marginTop: '1.5rem',
                                        padding: '1rem',
                                        background: '#fffbeb',
                                        border: '1px solid #fde68a',
                                        borderRadius: '6px'
                                    }}>
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                                            📋 Recommended Actions
                                        </h3>
                                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#78350f', fontSize: '0.875rem', lineHeight: '1.6' }}>
                                            {highRiskUnprotected.length > 0 && (
                                                <li>
                                                    <strong>Priority:</strong> Protect {highRiskUnprotected.length} high-risk unprotected asset{highRiskUnprotected.length > 1 ? 's' : ''} immediately
                                                </li>
                                            )}
                                            {parseFloat(criticalProtectionRate) < 90 && (
                                                <li>
                                                    <strong>Critical:</strong> {criticalAssets.length - criticalProtected.length} critical business asset{criticalAssets.length - criticalProtected.length > 1 ? 's' : ''} lack PQC protection
                                                </li>
                                            )}
                                            {parseFloat(protectionRate) < 75 && (
                                                <li>
                                                    <strong>Coverage:</strong> Overall protection rate is {protectionRate}% - aim for 90%+ for quantum readiness
                                                </li>
                                            )}
                                            {Object.keys(kemUsage).length === 1 && protectedAssets.length > 5 && (
                                                <li>
                                                    <strong>Diversity:</strong> Consider adopting multiple KEM algorithms to improve crypto-agility
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Assets Table */}
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            margin: 0
                        }}>
                            ASSETS ({filteredAssets.length})
                        </h2>

                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    width: '200px'
                                }}
                            />

                            <select
                                value={riskClassFilter}
                                onChange={(e) => setRiskClassFilter(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    background: 'white'
                                }}
                            >
                                <option value="">All Risk Classes</option>
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>

                            <select
                                value={envFilter}
                                onChange={(e) => setEnvFilter(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    background: 'white'
                                }}
                            >
                                <option value="">All Environments</option>
                                <option value="prod">Production</option>
                                <option value="non-prod">Non-Production</option>
                            </select>
                        </div>
                    </div>

                    <div style={{
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        {assetsLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading assets...</div>
                        ) : assetsError ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                                Error: {assetsError}
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                No assets found matching filters
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{
                                        background: '#f9fafb',
                                        borderBottom: '2px solid #e0e0e0'
                                    }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Risk</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Score</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Asset Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Environment</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Owner</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>AQV</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAssets.map(asset => (
                                        <tr
                                            key={asset.id}
                                            style={{
                                                borderBottom: '1px solid #e0e0e0',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                            onClick={() => navigate(`/quantum-vault/assets/${asset.id}`)}
                                        >
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: getRiskClassBg(asset.risk_class),
                                                    color: getRiskClassColor(asset.risk_class)
                                                }}>
                                                    {asset.risk_class || 'Unknown'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                                                {asset.pqc_risk_score}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                                                {asset.name}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>
                                                {asset.asset_type}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>
                                                {asset.environment || '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>
                                                {asset.owner}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>
                                                {asset.aqv || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PqcRiskDashboard;

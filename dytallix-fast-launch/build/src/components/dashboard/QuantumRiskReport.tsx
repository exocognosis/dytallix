/**
 * QuantumRiskReport - Print-grade report component for PDF export
 * 
 * This component renders a professional quantum risk analysis report
 * designed for headless Chromium PDF printing.
 * 
 * Data source: /build/public/report.json
 * 
 * Usage:
 *   Navigate to /quantumrisk?mode=report to view the report
 *   Run: node generate-report-pdf.js to export as PDF
 */

import React from 'react';
import './QuantumRiskReport.css';

export interface ReportData {
    generatedAt: string;
    organization: {
        industry: string;
        region: string;
        orgSize: string;
        regulatoryRegime: string;
        dataTypes: string[];
        cryptography: string[];
    };
    scores: {
        hndl: number;
        crqc: number;
        urgency: number;
    };
    recommendations: Array<{
        priority: string;
        title: string;
        description: string;
    }>;
    exposure: {
        harvestNowDecryptLater: {
            level: string;
            description: string;
            affectedSystems: string[];
        };
        cryptographicallyRelevantQuantumComputer: {
            level: string;
            description: string;
            affectedSystems: string[];
        };
    };
}

interface QuantumRiskReportProps {
    data: ReportData;
}

// SVG Gauge Chart Component
const RiskGauge: React.FC<{ score: number; label: string; sublabel?: string }> = ({ score, label, sublabel }) => {
    const radius = 60;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (score: number) => {
        if (score >= 70) return '#dc2626'; // Critical - Red
        if (score >= 40) return '#f59e0b'; // Medium - Amber
        return '#22c55e'; // Low - Green
    };

    const getLevel = (score: number) => {
        if (score >= 90) return 'Critical';
        if (score >= 70) return 'High';
        if (score >= 40) return 'Medium';
        return 'Low';
    };

    return (
        <div className="risk-gauge">
            <svg height={radius * 2} width={radius * 2} className="gauge-svg">
                {/* Background circle */}
                <circle
                    stroke="#e5e7eb"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                {/* Progress circle */}
                <circle
                    stroke={getColor(score)}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    transform={`rotate(-90 ${radius} ${radius})`}
                />
                {/* Score text */}
                <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    className="gauge-score"
                    fill={getColor(score)}
                >
                    {score}
                </text>
                <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    className="gauge-level"
                    fill="#6b7280"
                >
                    {getLevel(score)}
                </text>
            </svg>
            <div className="gauge-label">{label}</div>
            {sublabel && <div className="gauge-sublabel">{sublabel}</div>}
        </div>
    );
};

// Horizontal Risk Bar Component
const RiskBar: React.FC<{ score: number; label: string }> = ({ score, label }) => {
    const getColor = (score: number) => {
        if (score >= 70) return '#dc2626';
        if (score >= 40) return '#f59e0b';
        return '#22c55e';
    };

    return (
        <div className="risk-bar-container">
            <div className="risk-bar-header">
                <span className="risk-bar-label">{label}</span>
                <span className="risk-bar-score" style={{ color: getColor(score) }}>{score}/100</span>
            </div>
            <div className="risk-bar-track">
                <div
                    className="risk-bar-fill"
                    style={{ width: `${score}%`, backgroundColor: getColor(score) }}
                />
            </div>
        </div>
    );
};

const QuantumRiskReport: React.FC<QuantumRiskReportProps> = ({ data }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return '#dc2626';
            case 'high': return '#f59e0b';
            case 'medium': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    return (
        <div className="quantum-risk-report">
            {/* Header */}
            <header className="report-header">
                <div className="header-logo">
                    <img src="/QuantumVaultLogo.png" alt="QuantumVault" className="logo-image" />
                </div>
                <div className="header-title">
                    <h1>Quantum Risk Report</h1>
                    <p className="report-date">Generated: {formatDate(data.generatedAt)}</p>
                </div>
            </header>

            {/* Executive Summary */}
            <section className="report-section">
                <h2 className="section-title">Executive Summary</h2>
                <div className="summary-grid">
                    <RiskGauge score={data.scores.hndl} label="HNDL Risk" sublabel="Harvest Now, Decrypt Later" />
                    <RiskGauge score={data.scores.crqc} label="CRQC Risk" sublabel="Quantum Computer Threat" />
                    <RiskGauge score={data.scores.urgency} label="Migration Urgency" sublabel="Action Required" />
                </div>
            </section>

            {/* Organization Profile */}
            <section className="report-section">
                <h2 className="section-title">Organization Profile</h2>
                <table className="profile-table">
                    <tbody>
                        <tr>
                            <td className="profile-label">Industry</td>
                            <td className="profile-value">{data.organization.industry}</td>
                        </tr>
                        <tr>
                            <td className="profile-label">Region</td>
                            <td className="profile-value">{data.organization.region}</td>
                        </tr>
                        <tr>
                            <td className="profile-label">Organization Size</td>
                            <td className="profile-value">{data.organization.orgSize}</td>
                        </tr>
                        <tr>
                            <td className="profile-label">Regulatory Framework</td>
                            <td className="profile-value">{data.organization.regulatoryRegime}</td>
                        </tr>
                        <tr>
                            <td className="profile-label">Data Types</td>
                            <td className="profile-value">{data.organization.dataTypes.join(', ')}</td>
                        </tr>
                        <tr>
                            <td className="profile-label">Current Cryptography</td>
                            <td className="profile-value">{data.organization.cryptography.join(', ')}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Risk Analysis */}
            <section className="report-section page-break-before">
                <h2 className="section-title">Detailed Risk Analysis</h2>

                <div className="risk-detail-card">
                    <h3 className="risk-detail-title">Harvest Now, Decrypt Later (HNDL)</h3>
                    <RiskBar score={data.scores.hndl} label="HNDL Risk Score" />
                    <p className="risk-detail-description">{data.exposure.harvestNowDecryptLater.description}</p>
                    <div className="affected-systems">
                        <span className="affected-label">Affected Systems:</span>
                        <ul>
                            {data.exposure.harvestNowDecryptLater.affectedSystems.map((system, i) => (
                                <li key={i}>{system}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="risk-detail-card">
                    <h3 className="risk-detail-title">Cryptographically Relevant Quantum Computer (CRQC)</h3>
                    <RiskBar score={data.scores.crqc} label="CRQC Risk Score" />
                    <p className="risk-detail-description">{data.exposure.cryptographicallyRelevantQuantumComputer.description}</p>
                    <div className="affected-systems">
                        <span className="affected-label">Affected Systems:</span>
                        <ul>
                            {data.exposure.cryptographicallyRelevantQuantumComputer.affectedSystems.map((system, i) => (
                                <li key={i}>{system}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Recommendations */}
            <section className="report-section">
                <h2 className="section-title">Strategic Recommendations</h2>
                <div className="recommendations-list">
                    {data.recommendations.map((rec, index) => (
                        <div key={index} className="recommendation-item">
                            <div className="recommendation-header">
                                <span
                                    className="priority-badge"
                                    style={{
                                        backgroundColor: getPriorityColor(rec.priority),
                                        color: '#fff'
                                    }}
                                >
                                    {rec.priority}
                                </span>
                                <h4 className="recommendation-title">{rec.title}</h4>
                            </div>
                            <p className="recommendation-description">{rec.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="report-footer">
                <div className="footer-content">
                    <p className="footer-brand">QuantumVault by Dytallix</p>
                    <p className="footer-contact">www.dytallix.com</p>
                </div>
            </footer>
        </div>
    );
};

export default QuantumRiskReport;

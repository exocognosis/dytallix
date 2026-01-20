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

type RiskTone = 'light' | 'dark';

const getRiskMeta = (score: number) => {
    if (score >= 90) return { label: 'Critical', color: '#ff4d4d' };
    if (score >= 70) return { label: 'High', color: '#f97316' };
    if (score >= 40) return { label: 'Medium', color: '#fbbf24' };
    return { label: 'Low', color: '#22c55e' };
};

// SVG Gauge Chart Component
const RiskGauge: React.FC<{ score: number; label: string; sublabel?: string; tone?: RiskTone; showLabels?: boolean }> = ({
    score,
    label,
    sublabel,
    tone = 'light',
    showLabels = true
}) => {
    const radius = 60;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const meta = getRiskMeta(score);
    const levelColor = tone === 'dark' ? '#c7d6f1' : '#6b7280';

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
                    stroke={meta.color}
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
                    fill={meta.color}
                >
                    {score}
                </text>
                <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    className="gauge-level"
                    fill={levelColor}
                >
                    {meta.label}
                </text>
            </svg>
            {showLabels && <div className="gauge-label">{label}</div>}
            {showLabels && sublabel && <div className="gauge-sublabel">{sublabel}</div>}
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

    const threatBriefing = [
        {
            title: 'HNDL (Harvest Now, Decrypt Later)',
            description: 'Adversaries can capture encrypted traffic today and decrypt it later once CRQCs are available. Long-lived data is already exposed.'
        },
        {
            title: 'CRQC (Cryptographically Relevant Quantum Computer)',
            description: 'A CRQC can break RSA and ECC, undermining TLS, PKI, and digital signatures across critical systems.'
        },
        {
            title: "Shor's Algorithm",
            description: 'Efficiently factors large integers and computes discrete logs, rendering RSA and ECC insecure.'
        },
        {
            title: "Grover's Algorithm",
            description: 'Quadratically speeds brute-force search, effectively halving symmetric key strength (AES-256 -> AES-128).'
        }
    ];

    const riskCards = [
        {
            key: 'hndl',
            label: 'HNDL Risk',
            sublabel: 'Harvest Now, Decrypt Later',
            score: data.scores.hndl,
            description: 'Measures the likelihood that encrypted data is being harvested now for future decryption.'
        },
        {
            key: 'crqc',
            label: 'CRQC Risk',
            sublabel: 'Quantum Computer Threat',
            score: data.scores.crqc,
            description: 'Assesses exposure to a CRQC capable of breaking public-key cryptography.'
        },
        {
            key: 'urgency',
            label: 'Migration Urgency',
            sublabel: 'Action Priority',
            score: data.scores.urgency,
            description: 'Indicates how quickly your organization should begin a PQC transition.'
        }
    ];

    const strategySteps = [
        {
            title: 'Inventory Cryptography',
            description: 'Catalog algorithms, certificates, keys, and protocols across infrastructure, apps, and vendors.'
        },
        {
            title: 'Classify Data Longevity',
            description: 'Identify data that must remain confidential for 5-15+ years and prioritize it for PQC.'
        },
        {
            title: 'Prioritize High-Risk Systems',
            description: 'Focus first on TLS, PKI, authentication, and signing pipelines with external exposure.'
        },
        {
            title: 'Adopt NIST PQC + Hybrid',
            description: 'Pilot Kyber and Dilithium alongside existing algorithms to preserve compatibility.'
        },
        {
            title: 'Validate and Migrate',
            description: 'Run controlled pilots, test interoperability, and phase production migrations by risk tier.'
        },
        {
            title: 'Govern and Monitor',
            description: 'Create ownership, timelines, and continuous monitoring as quantum capabilities advance.'
        }
    ];

    return (
        <div className="quantum-risk-report">
            <section className="report-page page-one">
                {/* Header is now part of the static background image on page one
                <header className="report-header">
                    <div className="header-left">
                        <img src="/QuantumVaultLogo.png" alt="QuantumVault" className="logo-image" />
                        <div className="brand-block">
                            <div className="brand-title">QuantumVault</div>
                            <div className="brand-tagline">PQC Enterprise Security by Dytallix</div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="report-title">Quantum Risk Report</div>
                        <div className="report-date">Generated {formatDate(data.generatedAt)}</div>
                    </div>
                </header>
                */}
                <div className="report-date-overlay" style={{ position: 'absolute', top: '40px', right: '50px', fontSize: '11px', color: '#b7c7e6', textAlign: 'right' }}>
                    Generated {formatDate(data.generatedAt)}
                </div>

                <div className="page-content">
                    <div className="report-section">
                        <h2 className="section-title">Organization Profile</h2>
                        <div className="org-grid">
                            <div className="org-item">
                                <span className="org-label">Industry</span>
                                <span className="org-value">{data.organization.industry}</span>
                            </div>
                            <div className="org-item">
                                <span className="org-label">Region</span>
                                <span className="org-value">{data.organization.region}</span>
                            </div>
                            <div className="org-item">
                                <span className="org-label">Organization Size</span>
                                <span className="org-value">{data.organization.orgSize}</span>
                            </div>
                            <div className="org-item">
                                <span className="org-label">Regulatory Regime</span>
                                <span className="org-value">{data.organization.regulatoryRegime}</span>
                            </div>
                            <div className="org-item full">
                                <span className="org-label">Data Types</span>
                                <span className="org-value">{data.organization.dataTypes.join(', ')}</span>
                            </div>
                            <div className="org-item full">
                                <span className="org-label">Current Cryptography</span>
                                <span className="org-value">{data.organization.cryptography.join(', ')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="report-section">
                        <h2 className="section-title">Quantum Threat Briefing</h2>
                        <div className="briefing-grid">
                            {threatBriefing.map((item) => (
                                <div key={item.title} className="briefing-card">
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="page-footer">
                    <span>QuantumVault by Dytallix</span>
                    <span>www.dytallix.com</span>
                </footer>
            </section>

            <section className="report-page page-two">
                <div className="page-content">
                    <div className="page-title">
                        <h2>Risk Assessment Results</h2>
                        <p>Scores reflect your exposure and migration urgency based on the submitted profile.</p>
                    </div>

                    <div className="risk-grid">
                        {riskCards.map((risk) => {
                            const meta = getRiskMeta(risk.score);
                            return (
                                <div key={risk.key} className="risk-card">
                                    <div className="risk-card-header">
                                        <span className="risk-card-title">{risk.label}</span>
                                        <span className="risk-card-score" style={{ color: meta.color }}>
                                            {risk.score}/100
                                        </span>
                                    </div>
                                    <RiskGauge
                                        score={risk.score}
                                        label={risk.label}
                                        sublabel={risk.sublabel}
                                        tone="dark"
                                        showLabels={false}
                                    />
                                    <div className="risk-card-meta">
                                        <span className="risk-level" style={{ color: meta.color }}>{meta.label}</span>
                                        <span className="risk-sublabel">{risk.sublabel}</span>
                                    </div>
                                    <p className="risk-card-description">{risk.description}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="risk-explainer">
                        <h3 className="explainer-title">Understanding Your Results</h3>
                        <div className="explainer-grid">
                            <div className="explainer-item">
                                <h4>Harvest Now, Decrypt Later (HNDL)</h4>
                                <p>Adversaries are actively collecting encrypted data today to decrypt it once quantum computers are available. A high HNDL score indicates your long-lived sensitive data is currently at risk.</p>
                            </div>
                            <div className="explainer-item">
                                <h4>Risk Exposure & Timelines</h4>
                                <p>While the transition to Post-Quantum Cryptography (PQC) can present challenges, with expertise, intention, and effort, your organization can be fully prepared for Y2Q. High scores indicate areas to prioritize first.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="page-footer">
                    <span>QuantumVault by Dytallix</span>
                    <span>www.dytallix.com</span>
                </footer>
            </section>

            <section className="report-page page-three">
                <div className="page-content">
                    <div className="page-title">
                        <h2>Post-Quantum Migration Strategy</h2>
                        <p>A generalized framework for moving to quantum-safe cryptography.</p>
                    </div>

                    <div className="strategy-list">
                        {strategySteps.map((step, index) => (
                            <div key={step.title} className="strategy-item">
                                <div className="strategy-index">{index + 1}</div>
                                <div>
                                    <h3 className="strategy-title">{step.title}</h3>
                                    <p className="strategy-description">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cta-panel">
                        <h3 className="cta-title">Deploy QuantumVault to Secure Vulnerable Data and Systems</h3>
                        <p className="cta-text">
                            QuantumVault delivers enterprise-grade PQC readiness with visibility, migration tooling,
                            and cryptographic policy enforcement across your stack.
                        </p>
                        <div className="cta-actions">
                            <span>hello@dytallix.com</span>
                            <span>dytallix.com/quantumvault</span>
                        </div>
                    </div>
                </div>

                <footer className="page-footer">
                    <span>QuantumVault by Dytallix</span>
                    <span>www.dytallix.com</span>
                </footer>
            </section>
        </div>
    );
};

export default QuantumRiskReport;

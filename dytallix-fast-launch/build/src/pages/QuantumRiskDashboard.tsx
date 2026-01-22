import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RiskAssessmentForm, { type RiskAssessmentData } from '../components/dashboard/RiskAssessmentForm';
import RiskVisualization from '../components/dashboard/RiskVisualization';
import RiskExplanations from '../components/dashboard/RiskExplanations';
import QuantumRiskReport, { type ReportData } from '../components/dashboard/QuantumRiskReport';
import { Section } from '../components/layout/section';

/**
 * QuantumRiskDashboard
 * 
 * Supports two modes:
 * - Default: Interactive survey for risk assessment
 * - Report Mode (?mode=report): Renders print-grade PDF report
 * 
 * Report data is loaded from /report.json
 * To generate PDF: node generate-report-pdf.js
 */

const QuantumRiskDashboard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const isReportMode = searchParams.get('mode') === 'report';
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    // Note: Injected data check is now handled in the report loading useEffect below

    const [formData, setFormData] = useState<RiskAssessmentData>({
        industry: '',
        region: '',
        dataTypes: [],
        cryptography: [],
        regulatoryRegime: '',
        orgSize: ''
    });

    const [riskScores, setRiskScores] = useState({ hndl: 0, crqc: 0, urgency: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        calculateRisk();
    }, [formData]);

    const calculateRisk = () => {
        let hndl = 20; // Base risk
        let crqc = 40; // Base risk

        // Industry Impact
        if (['Finance & Banking', 'Government & Defense', 'Healthcare & Pharma'].includes(formData.industry)) {
            hndl += 30;
            crqc += 20;
        } else if (['Telecommunications', 'Technology', 'Energy & Utilities'].includes(formData.industry)) {
            hndl += 20;
            crqc += 20;
        }

        // Region Impact
        const highRiskRegions = ['United States', 'European Union', 'United Kingdom', 'Canada', 'Australia'];
        if (highRiskRegions.includes(formData.region)) {
            hndl += 10;
            crqc += 10;
        } else if (formData.region === 'Global / Other') {
            hndl += 5;
            crqc += 5;
        }

        // Data Sensitivity Impact
        const highRiskData = ['Government Secrets', 'PHI (Protected Health Information)', 'Intellectual Property'];
        const mediumRiskData = ['PII (Personally Identifiable Information)', 'Financial Records', 'Customer Data', 'Employee Records'];

        const hasHighRiskData = formData.dataTypes.some(t => highRiskData.includes(t));
        const hasMediumRiskData = formData.dataTypes.some(t => mediumRiskData.includes(t));

        if (hasHighRiskData) {
            hndl += 40;
            crqc += 30;
        } else if (hasMediumRiskData) {
            hndl += 20;
            crqc += 20;
        }

        // Cryptography Impact
        const weakCrypto = ['RSA-2048 (Legacy)', 'SHA-1']; // Example
        const pqcReady = ['Kyber / Dilithium (PQC Ready)'];

        const hasWeakCrypto = formData.cryptography.some(c => weakCrypto.includes(c));
        const hasPQC = formData.cryptography.some(c => pqcReady.includes(c));

        if (hasWeakCrypto) {
            crqc += 30; // High vulnerability to CRQC
            hndl += 10;
        }

        if (hasPQC) {
            crqc -= 40; // Significant reduction in CRQC risk
            hndl -= 10;
        }

        // Regulatory Impact
        const highRiskRegs = [
            'GDPR (EU)',
            'HIPAA (US Healthcare)',
            'NIST / FedRAMP (US Gov)',
            'DORA (EU Finance)',
            'FCA / PRA (UK Finance)',
            'SEC / NYDFS (US Finance)',
            'PCI DSS (Payments)'
        ];

        if (highRiskRegs.includes(formData.regulatoryRegime)) {
            hndl += 10;
        }

        // Organization Size Impact
        if (['Enterprise (500 - 5000 employees)', 'Large Enterprise (> 5000 employees)'].includes(formData.orgSize)) {
            hndl += 10;
            crqc += 10;
        }

        // Calculate Migration Urgency based on combined risk factors
        let urgency = 20; // Base urgency

        // High combined risk = high urgency
        const avgRisk = (hndl + crqc) / 2;
        if (avgRisk > 70) urgency += 40;
        else if (avgRisk > 50) urgency += 25;
        else if (avgRisk > 30) urgency += 10;

        // Regulated industries need to act faster
        if (highRiskRegs.includes(formData.regulatoryRegime)) urgency += 20;

        // Large orgs have more complex migrations
        if (['Enterprise (500 - 5000 employees)', 'Large Enterprise (> 5000 employees)'].includes(formData.orgSize)) {
            urgency += 15;
        }

        // PQC adoption reduces urgency
        if (hasPQC) urgency -= 30;

        // Cap at 100 and Floor at 0
        setRiskScores({
            hndl: Math.max(0, Math.min(100, hndl)),
            crqc: Math.max(0, Math.min(100, crqc)),
            urgency: Math.max(0, Math.min(100, urgency))
        });
    };

    // Load report data when in report mode - prioritize injected data from Playwright
    useEffect(() => {
        if (!isReportMode) return;

        // Check for injected data from Playwright FIRST
        if (typeof window !== 'undefined' && (window as any).__INJECTED_REPORT_DATA__) {
            console.log('Found injected report data:', (window as any).__INJECTED_REPORT_DATA__);
            setReportData((window as any).__INJECTED_REPORT_DATA__);
            return; // Don't fetch from report.json if we have injected data
        }

        // Only fetch from report.json if no injected data
        if (!reportData) {
            setReportLoading(true);
            fetch('/report.json')
                .then(res => {
                    if (!res.ok) throw new Error('Report data not found');
                    return res.json();
                })
                .then(data => {
                    setReportData(data);
                    setReportError(null);
                })
                .catch(err => {
                    console.error('Failed to load report data:', err);
                    setReportError(err.message);
                    // Fallback mock data for development
                    setReportData({
                        generatedAt: new Date().toISOString(),
                        organization: {
                            industry: 'Finance & Banking',
                            region: 'United Kingdom',
                            orgSize: 'Startup (< 50 employees)',
                            regulatoryRegime: 'FCA / PRA (UK Finance)',
                            dataTypes: ['Financial Records'],
                            cryptography: ['RSA-4096 (Standard)', 'AES-128 (Symmetric)']
                        },
                        scores: { hndl: 90, crqc: 90, urgency: 80 },
                        recommendations: [
                            { priority: 'Critical', title: 'Immediate PQC Assessment', description: 'Conduct an assessment of quantum-vulnerable systems.' }
                        ],
                        exposure: {
                            harvestNowDecryptLater: {
                                level: 'Critical',
                                description: 'Adversaries may be harvesting encrypted data for future decryption.',
                                affectedSystems: ['Customer databases', 'Transaction logs']
                            },
                            cryptographicallyRelevantQuantumComputer: {
                                level: 'Critical',
                                description: 'Current implementations will be vulnerable when CRQCs become available.',
                                affectedSystems: ['TLS/SSL', 'Digital signatures']
                            }
                        }
                    });
                })
                .finally(() => setReportLoading(false));
        }
    }, [isReportMode]);

    // Report Mode: Render print-grade report
    if (isReportMode) {
        if (reportLoading) {
            return (
                <div className="min-h-screen bg-white flex items-center justify-center">
                    <p className="text-gray-500">Loading report...</p>
                </div>
            );
        }
        if (reportData) {
            return <QuantumRiskReport data={reportData} />;
        }
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-red-500">Failed to load report: {reportError}</p>
            </div>
        );
    }

    // Default Mode: Survey UI
    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        Quantum Risk <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-red to-accent-blue">Dashboard</span>
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Assessment Form */}
                    <div className="lg:col-span-5">
                        <RiskAssessmentForm data={formData} onChange={setFormData} />
                    </div>

                    {/* Right Column: Visualization */}
                    <div className="lg:col-span-7">
                        <RiskVisualization hndlScore={riskScores.hndl} crqcScore={riskScores.crqc} urgencyScore={riskScores.urgency} />
                    </div>
                </div>

                {/* Explanations Section */}
                <RiskExplanations />

                {/* Email Capture CTA */}
                <div className="mt-16 text-center">
                    <p className="mb-4 text-sm text-muted-foreground">
                        Enter your email address to get your Quantum Risk Analysis
                    </p>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmitMessage(null);
                            const form = e.target as HTMLFormElement;
                            const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                            const email = emailInput.value;

                            setIsSubmitting(true);

                            try {
                                // Get API URL from environment with proper fallback
                                const apiUrl = import.meta.env.VITE_API_URL ||
                                    (typeof window !== 'undefined' && window.location.origin) ||
                                    'https://dytallix.com';
                                const response = await fetch(`${apiUrl}/api/quantum-risk/email`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        email,
                                        formData,
                                        riskScores
                                    })
                                });

                                const data = await response.json();

                                if (response.ok && data.success) {
                                    setSubmitMessage({
                                        type: 'success',
                                        text: `Success! Your Quantum Risk Analysis has been sent to ${email}`
                                    });
                                    form.reset();
                                } else {
                                    throw new Error(data.message || 'Failed to send email');
                                }
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'Failed to send email. Please try again.';
                                setSubmitMessage({
                                    type: 'error',
                                    text: errorMessage
                                });
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
                    >
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="Enter your email"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto flex-1 px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50"
                        />
                        <div className="p-[1px] rounded-lg bg-gradient-to-r from-accent-red via-accent-blue to-accent-red">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-lg bg-background text-foreground font-medium hover:bg-accent/10 transition-all whitespace-nowrap disabled:opacity-50"
                            >
                                {isSubmitting ? 'Sending...' : 'Get My Analysis'}
                            </button>
                        </div>
                    </form>
                    {submitMessage && (
                        <div className={`mt-4 p-4 rounded-lg ${submitMessage.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                            {submitMessage.text}
                        </div>
                    )}
                </div>
            </Section>
        </div>
    );
};

export default QuantumRiskDashboard;

import React, { useState, useEffect } from 'react';
import RiskAssessmentForm, { type RiskAssessmentData } from '../components/dashboard/RiskAssessmentForm';
import RiskVisualization from '../components/dashboard/RiskVisualization';
import RiskExplanations from '../components/dashboard/RiskExplanations';
import { Section } from '../components/layout/section';

const QuantumRiskDashboard: React.FC = () => {
    // NOTE: This dashboard is solely a marketing lead magnet.
    // Any directions to modify it must be explicitly stated.
    // It is not intended to be a functional part of the core product logic.
    const [formData, setFormData] = useState<RiskAssessmentData>({
        industry: '',
        region: '',
        dataTypes: [],
        cryptography: [],
        regulatoryRegime: '',
        orgSize: ''
    });

    const [riskScores, setRiskScores] = useState({ hndl: 0, crqc: 0 });

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

        // Cap at 100 and Floor at 0
        setRiskScores({
            hndl: Math.max(0, Math.min(100, hndl)),
            crqc: Math.max(0, Math.min(100, crqc))
        });
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        Quantum Risk <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-red to-accent-blue">Dashboard</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Assess your organization's vulnerability to current and future quantum threats.
                        Understand your exposure to "Harvest Now, Decrypt Later" attacks and the looming CRQC era.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Assessment Form */}
                    <div className="lg:col-span-5">
                        <RiskAssessmentForm data={formData} onChange={setFormData} />
                    </div>

                    {/* Right Column: Visualization */}
                    <div className="lg:col-span-7">
                        <RiskVisualization hndlScore={riskScores.hndl} crqcScore={riskScores.crqc} />
                    </div>
                </div>

                {/* Explanations Section */}
                <RiskExplanations />

                {/* CTA */}
                <div className="mt-16 text-center">
                    <div className="inline-block p-[1px] rounded-full bg-gradient-to-r from-accent-red via-accent-blue to-accent-red">
                        <button className="px-8 py-3 rounded-full bg-background text-foreground font-medium hover:bg-accent/10 transition-all">
                            Get a Detailed Risk Audit
                        </button>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        This tool provides a high-level estimate. Contact QuantumVault for a comprehensive analysis.
                    </p>
                </div>
            </Section>
        </div>
    );
};

export default QuantumRiskDashboard;

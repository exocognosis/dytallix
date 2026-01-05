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
                                              'http://localhost:3001';
                                const response = await fetch(`${apiUrl}/api/quantum-risk/submit-email`, {
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
                        <div className={`mt-4 p-4 rounded-lg ${
                            submitMessage.type === 'success' 
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

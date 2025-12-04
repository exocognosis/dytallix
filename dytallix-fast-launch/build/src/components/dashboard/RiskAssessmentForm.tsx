import React, { useEffect } from 'react';
import { GlassPanel } from '../ui/GlassPanel';

export interface RiskAssessmentData {
    industry: string;
    region: string;
    dataTypes: string[];
    cryptography: string[];
    regulatoryRegime: string;
    orgSize: string;
}

interface RiskAssessmentFormProps {
    data: RiskAssessmentData;
    onChange: (data: RiskAssessmentData) => void;
}

const INDUSTRIES = [
    'Finance & Banking',
    'Healthcare & Pharma',
    'Government & Defense',
    'Telecommunications',
    'Energy & Utilities',
    'Technology',
    'Retail & E-commerce',
    'Other'
];

const REGIONS = [
    'United States',
    'European Union',
    'United Kingdom',
    'Canada',
    'Australia',
    'Global / Other'
];

const DATA_TYPES = [
    'PII (Personally Identifiable Information)',
    'PHI (Protected Health Information)',
    'Intellectual Property',
    'Financial Records',
    'Government Secrets',
    'Customer Data',
    'Employee Records'
];

const CRYPTO_OPTIONS = [
    'RSA-2048 (Legacy)',
    'RSA-4096 (Standard)',
    'ECC / secp256k1 (Blockchain)',
    'AES-128 (Symmetric)',
    'AES-256 (Symmetric)',
    'SHA-256 (Hashing)',
    'Kyber / Dilithium (PQC Ready)'
];

// Map regions to relevant regulations
const REGIME_MAP: Record<string, string[]> = {
    'United States': ['HIPAA (US Healthcare)', 'NIST / FedRAMP (US Gov)', 'SEC / NYDFS (US Finance)', 'SOX (US Public Co)', 'CCPA (California)', 'PCI DSS (Payments)'],
    'European Union': ['GDPR (EU)', 'DORA (EU Finance)', 'PCI DSS (Payments)'],
    'United Kingdom': ['FCA / PRA (UK Finance)', 'GDPR (UK)', 'PCI DSS (Payments)'],
    'Canada': ['PIPEDA (Canada)', 'PCI DSS (Payments)'],
    'Australia': ['Privacy Act (Australia)', 'PCI DSS (Payments)'],
    'Global / Other': ['GDPR (EU)', 'PCI DSS (Payments)', 'None / General']
};

const ORG_SIZES = [
    'Startup (< 50 employees)',
    'SME (50 - 500 employees)',
    'Enterprise (500 - 5000 employees)',
    'Large Enterprise (> 5000 employees)'
];

const RiskAssessmentForm: React.FC<RiskAssessmentFormProps> = ({ data, onChange }) => {
    const handleChange = (field: keyof RiskAssessmentData, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const handleMultiSelectToggle = (field: 'dataTypes' | 'cryptography', value: string) => {
        const current = data[field];
        const updated = current.includes(value)
            ? current.filter(t => t !== value)
            : [...current, value];
        handleChange(field, updated);
    };

    // Reset regulatory regime if it's not valid for the new region
    useEffect(() => {
        if (data.region && REGIME_MAP[data.region]) {
            const validRegimes = REGIME_MAP[data.region];
            if (data.regulatoryRegime && !validRegimes.includes(data.regulatoryRegime)) {
                handleChange('regulatoryRegime', '');
            }
        }
    }, [data.region]);

    const availableRegimes = data.region ? (REGIME_MAP[data.region] || []) : [];

    return (
        <GlassPanel variant="card" hoverEffect={true} className="space-y-6 p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Organization Profile</h3>

            {/* 1. Industry */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">1. Industry Vertical</label>
                <select
                    value={data.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                    <option value="">Select Industry...</option>
                    {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                    ))}
                </select>
            </div>

            {/* 2. Region */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">2. Country / Region</label>
                <select
                    value={data.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                    <option value="">Select Region...</option>
                    {REGIONS.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                    ))}
                </select>
            </div>

            {/* 3. Data Types */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">3. Data & Digital Assets</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DATA_TYPES.map(type => (
                        <label key={type} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background hover:bg-accent/50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={data.dataTypes.includes(type)}
                                onChange={() => handleMultiSelectToggle('dataTypes', type)}
                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                            />
                            <span className="text-sm text-foreground">{type}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* 4. Cryptography */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">4. Current Cryptography</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CRYPTO_OPTIONS.map(crypto => (
                        <label key={crypto} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background hover:bg-accent/50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={data.cryptography.includes(crypto)}
                                onChange={() => handleMultiSelectToggle('cryptography', crypto)}
                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                            />
                            <span className="text-sm text-foreground">
                                {crypto.includes('PQC') ? (
                                    <span className="text-emerald-500 font-medium">{crypto}</span>
                                ) : crypto.includes('Legacy') ? (
                                    <span className="text-destructive font-medium">{crypto}</span>
                                ) : (
                                    crypto
                                )}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* 5. Regulatory Regime (Dynamic) */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">5. Regulatory Regime</label>
                <select
                    value={data.regulatoryRegime}
                    onChange={(e) => handleChange('regulatoryRegime', e.target.value)}
                    disabled={!data.region}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="">
                        {data.region ? "Select Regulation..." : "Select Region First..."}
                    </option>
                    {availableRegimes.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                    ))}
                </select>
            </div>

            {/* 6. Org Size */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">6. Organization Size</label>
                <select
                    value={data.orgSize}
                    onChange={(e) => handleChange('orgSize', e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                    <option value="">Select Size...</option>
                    {ORG_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
        </GlassPanel>
    );
};

export default RiskAssessmentForm;

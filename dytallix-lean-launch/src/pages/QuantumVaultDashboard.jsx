import React, { useState } from 'react';
import PqcRiskDashboard from '../components/quantum-vault/PqcRiskDashboard';
import AssetList from '../components/quantum-vault/AssetList';
import ScanManager from '../components/quantum-vault/ScanManager';
import AttestationManager from '../components/quantum-vault/AttestationManager';
import '../styles/global.css';

const QuantumVaultDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="section">
            <div className="container">
                <div className="section-header text-center mb-12">
                    <h2 className="section-title">QuantumVault Dashboard</h2>
                    <p className="section-subtitle">Manage your post-quantum cryptographic posture.</p>
                </div>

                <div className="flex gap-4 mb-6 border-b border-white/10 pb-1">
                    <button
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'overview' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'assets' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('assets')}
                    >
                        Assets
                    </button>
                    <button
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'scans' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('scans')}
                    >
                        Scans
                    </button>
                    <button
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'attestation' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('attestation')}
                    >
                        Attestation
                    </button>
                </div>

                <div className="mt-6">
                    {activeTab === 'overview' && <PqcRiskDashboard />}
                    {activeTab === 'assets' && <AssetList />}
                    {activeTab === 'scans' && <ScanManager />}
                    {activeTab === 'attestation' && <AttestationManager />}
                </div>
            </div>
        </div>
    );
};

export default QuantumVaultDashboard;

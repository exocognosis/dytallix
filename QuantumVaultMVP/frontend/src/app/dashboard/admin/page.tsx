'use client';

import React, { useState } from 'react';
import {
    Settings,
    FolderSearch,
    FileType,
    Calendar,
    FileCode,
    Save,
    Play,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { adminAPI } from '@/lib/api';

export default function AdminPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'saving' | 'scanning' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const [config, setConfig] = useState({
        sourceDirectories: '/opt/quantumvault-test/QuantumVaultTestData\n/var/www/html',
        destinationDirectories: '/opt/quantumvault/encrypted\n/backup/secure',
        fileTypes: '.pem, .crt, .key, .p12, .jks, .json, .csv, .pdf',
        excludePatterns: 'node_modules, .git, temp',
        minDate: '',
        maxDate: '',
        formats: 'PEM, DER, PKCS#12, CSV, JSON'
    });
    const [health, setHealth] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [algos, setAlgos] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchHealth = async () => {
            try {
                const data = await adminAPI.getHealth();
                setHealth(data);
            } catch (err: any) {
                console.warn('Backend offline, using fallback health data');
                // Fallback mock data for demo if backend fails
                setHealth({
                    vault: { status: 'offline', latency: '-', version: '-' },
                    blockchain: { status: 'offline', peers: 0, height: 0, sync: '0%' },
                    database: { status: 'offline', pool: '0/0', latency: '-' },
                    aiEngine: { status: 'offline', model: '-', load: '0%' }
                });
            }
        };

        const fetchLogs = async () => {
            try {
                const data = await adminAPI.getLogs();
                setLogs(data);
            } catch (err) {
                console.warn('Backend offline, using mock logs');
                // Fallback mock data for demo
                setLogs([
                    { id: '1', action: 'LOGIN_SUCCESS', details: 'User logged in successfully', user: 'admin@dytallix.com', ip: '192.168.1.42', timestamp: new Date().toISOString() },
                    { id: '2', action: 'CONFIG_UPDATE', details: 'Updated scan directory configuration', user: 'admin@dytallix.com', ip: '192.168.1.42', timestamp: new Date(Date.now() - 600000).toISOString() },
                    { id: '3', action: 'SCAN_COMPLETED', details: 'Scheduled scan completed. 24 assets found.', user: 'SYSTEM', ip: 'localhost', timestamp: new Date(Date.now() - 1200000).toISOString() },
                    { id: '4', action: 'KEY_ROTATION', details: 'Automated rotation for Policy #POL-882', user: 'SYSTEM', ip: 'localhost', timestamp: new Date(Date.now() - 1800000).toISOString() },
                ]);
            }
        };

        const fetchAlgos = async () => {
            try {
                const data = await adminAPI.getAlgos();
                setAlgos(data);
            } catch (err) {
                console.warn('Backend offline, using mock algorithms');
                // Fallback mock data for demo
                setAlgos([
                    { id: '1', name: 'Kyber-1024', type: 'KEM', securityLevel: 5, status: 'enabled' },
                    { id: '2', name: 'Dilithium3', type: 'Signature', securityLevel: 3, status: 'enabled' },
                    { id: '3', name: 'SPHINCS+', type: 'Signature', securityLevel: 5, status: 'warning' },
                    { id: '4', name: 'RSA-2048', type: 'Legacy', securityLevel: 0, status: 'disabled' },
                    { id: '5', name: 'ECC-256', type: 'Legacy', securityLevel: 1, status: 'warning' },
                ]);
            }
        };

        fetchHealth();
        fetchLogs();
        fetchAlgos();
    }, []);

    const toggleAlgo = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'enabled';
        try {
            await adminAPI.updateAlgo(id, !newStatus);
            setAlgos(algos.map(a => a.id === id ? { ...a, status: !newStatus ? 'enabled' : 'disabled' } : a));
        } catch (err) {
            console.error('Failed to update algo', err);
        }
    };

    const handleSave = async () => {
        setStatus('saving');
        try {
            await adminAPI.saveScanConfig(config);
            setStatus('success');
            setStatusMessage('Configuration saved successfully');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error('Failed to save config:', error);
            setStatus('error');
            setStatusMessage('Failed to save configuration');
        }
    };

    const handleScan = async () => {
        setStatus('scanning');
        try {
            const result = await adminAPI.runDiscovery(config);
            setStatus('success');
            setStatusMessage(result.message || 'Asset discovery scan complete');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (error) {
            console.error('Scan failed:', error);
            setStatus('error');
            setStatusMessage('Scan failed to execute');
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 shrink-0">
                    <Settings className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Administrator Console</h1>
                    <p className="text-white/60">Manage system configurations and asset identification parameters.</p>
                </div>
            </div>

            {/* System Health Card */}
            <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">System Health</h2>
                        <p className="text-sm text-white/50">Real-time status of critical components</p>
                    </div>
                </div>

                {
                    health ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(health).map(([key, val]: [string, any]) => (
                                <div key={key} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="capitalize text-white/70 font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <div className={`w-2 h-2 rounded-full ${val.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                                    </div>
                                    <div className="space-y-1">
                                        {Object.entries(val).filter(([k]) => k !== 'status').map(([k, v]: [string, any]) => (
                                            <div key={k} className="flex justify-between text-xs">
                                                <span className="text-white/40 capitalize">{k}</span>
                                                <span className="text-white/80 font-mono">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-white/40 text-sm animate-pulse">Loading system health...</div>
                    )
                }
            </GlassPanel >

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Algorithm Governance */}
                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <FileCode className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">PQC Governance</h2>
                            <p className="text-sm text-white/50">Manage approved cryptographic algorithms</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {algos.map((algo) => (
                            <div key={algo.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{algo.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">{algo.type}</span>
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">Security Level: {algo.securityLevel}</div>
                                </div>
                                <button
                                    onClick={() => toggleAlgo(algo.id, algo.status)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${algo.status === 'enabled'
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : algo.status === 'warning'
                                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                        }`}
                                >
                                    {algo.status.toUpperCase()}
                                </button>
                            </div>
                        ))}
                    </div>
                </GlassPanel>

                {/* Audit Logs */}
                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <FileCode className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Audit Logs</h2>
                            <p className="text-sm text-white/50">Recent system activities and security events</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {logs.map((log) => (
                            <div key={log.id} className="text-sm border-l-2 border-white/10 pl-3 py-1">
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className={`font-mono ${log.action.includes('FAILED') ? 'text-red-400' :
                                        log.action.includes('SUCCESS') ? 'text-green-400' : 'text-blue-400'
                                        }`}>
                                        {log.action}
                                    </span>
                                    <span className="text-white/30">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-white/80">{log.details}</p>
                                <div className="flex gap-2 text-xs text-white/30 mt-1">
                                    <span>{log.user}</span>
                                    <span>•</span>
                                    <span>{log.ip}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassPanel>
            </div>

            {/* Scan Configuration Card (Existing) */}
            <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <FolderSearch className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Asset Identification</h2>
                        <p className="text-sm text-white/50">Configure scanning parameters for crypto-asset discovery</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source Directories */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                            <FolderSearch className="w-4 h-4" />
                            Source Directories
                        </label>
                        <textarea
                            value={config.sourceDirectories}
                            onChange={(e) => setConfig({ ...config, sourceDirectories: e.target.value })}
                            className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 font-mono text-sm"
                            placeholder="/path/to/source"
                        />
                        <p className="text-xs text-white/40 mt-1">One path per line</p>
                    </div>

                    {/* Destination Directories */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                            <FolderSearch className="w-4 h-4" />
                            Destination Directories
                        </label>
                        <textarea
                            value={config.destinationDirectories}
                            onChange={(e) => setConfig({ ...config, destinationDirectories: e.target.value })}
                            className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 font-mono text-sm"
                            placeholder="/path/to/destination"
                        />
                        <p className="text-xs text-white/40 mt-1">One path per line</p>
                    </div>

                    {/* File Types */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                            <FileType className="w-4 h-4" />
                            File Types
                        </label>
                        <input
                            type="text"
                            value={config.fileTypes}
                            onChange={(e) => setConfig({ ...config, fileTypes: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                            placeholder=".pem, .crt, .key"
                        />
                    </div>

                    {/* Formats */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                            <FileCode className="w-4 h-4" />
                            Formats
                        </label>
                        <input
                            type="text"
                            value={config.formats}
                            onChange={(e) => setConfig({ ...config, formats: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                            placeholder="PEM, DER, PKCS#12"
                        />
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Creation Date (From)
                        </label>
                        <input
                            type="date"
                            value={config.minDate}
                            onChange={(e) => setConfig({ ...config, minDate: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Creation Date (To)
                        </label>
                        <input
                            type="date"
                            value={config.maxDate}
                            onChange={(e) => setConfig({ ...config, maxDate: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                    <div className="flex items-center gap-3">
                        {status === 'success' && (
                            <span className="text-green-400 text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {statusMessage}
                            </span>
                        )}
                        {status === 'error' && (
                            <span className="text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {statusMessage}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={status === 'saving' || status === 'scanning'}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            Save Configuration
                        </button>
                        <button
                            onClick={handleScan}
                            disabled={status === 'saving' || status === 'scanning'}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                        >
                            <Play className="w-4 h-4" />
                            Run Discovery
                        </button>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}

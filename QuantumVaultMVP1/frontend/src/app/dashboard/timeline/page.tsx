'use client';

import { useState, useEffect } from 'react';
import {
    Clock,
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    Shield,
    FileCheck,
    Search,
    Filter
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { dashboardAPI } from '@/lib/api';
import { TimelineChart } from './TimelineChart';
import { TimelineConfig } from './TimelineConfig';

interface TimelineEvent {
    id: string;
    assetName: string;
    discoveredAt: string;
    scannedAt: string | null;
    wrappedAt: string | null;
    attestedAt: string | null;
    status: string;
    riskLevel: string;
}

export default function TimelinePage() {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'pending'>('all');

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                setLoading(true);
                const data = await dashboardAPI.getMigrationTimeline();

                // Map backend response to local interface
                const mappedEvents: TimelineEvent[] = data.map((item: any) => ({
                    id: item.assetId,
                    assetName: item.assetName,
                    discoveredAt: item.discoveredAt ? new Date(item.discoveredAt).toLocaleString() : '',
                    scannedAt: item.scannedAt ? new Date(item.scannedAt).toLocaleString() : null,
                    wrappedAt: item.wrappedAt ? new Date(item.wrappedAt).toLocaleString() : null,
                    attestedAt: item.attestedAt ? new Date(item.attestedAt).toLocaleString() : null,
                    status: item.status,
                    riskLevel: item.riskLevel
                }));

                setEvents(mappedEvents);
            } catch (error) {
                console.error('Failed to fetch timeline:', error);
                // Fallback for demo if needed, or just empty list
                setEvents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, []);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.assetName.toLowerCase().includes(searchQuery.toLowerCase());
        // Simplified status matching logic
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'completed' && event.status === 'ATTESTED') ||
            (statusFilter === 'in-progress' && (event.status === 'WRAPPED_PQC' || event.status === 'DISCOVERED')) ||
            (statusFilter === 'pending' && event.status === 'PENDING');

        return matchesSearch && matchesStatus;
    });

    const getStepStatus = (event: TimelineEvent, step: 'scan' | 'wrap' | 'attest') => {
        if (step === 'attest' && event.attestedAt) return 'completed';
        if (step === 'wrap' && (event.wrappedAt || event.attestedAt)) return 'completed';
        if (step === 'scan' && (event.scannedAt || event.wrappedAt || event.attestedAt)) return 'completed';
        return 'pending';
    };

    const [showConfig, setShowConfig] = useState(false);

    // Default PQC Phases (Date-Based)
    // Setup some sensible defaults for demo: 
    // Start 1 month ago. 
    // Phases roughly 1-3 months, with some overlaps.
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 1);

    // Helpers for default date strings
    const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000).toISOString().split('T')[0];
    const startDateStr = start.toISOString().split('T')[0];

    const [timelineConfig, setTimelineConfig] = useState({
        targetCompletionDate: addDays(start, 365) as string | null, // 1 year target
        phases: [
            { id: '1', name: 'Risk Assessment', startDate: startDateStr, endDate: addDays(start, 45), color: 'bg-red-500' },
            { id: '2', name: 'Classification', startDate: addDays(start, 30), endDate: addDays(start, 90), color: 'bg-orange-500' }, // Overlaps
            { id: '3', name: 'Deployment', startDate: addDays(start, 80), endDate: addDays(start, 200), color: 'bg-blue-500' },
            { id: '4', name: 'Monitoring', startDate: addDays(start, 180), endDate: addDays(start, 365), color: 'bg-green-500' }
        ] as any[]
    });

    const handleSaveConfig = (newPhases: any[], newTarget: string | null) => {
        setTimelineConfig({
            targetCompletionDate: newTarget,
            phases: newPhases
        });
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <TimelineConfig
                isOpen={showConfig}
                onClose={() => setShowConfig(false)}
                phases={timelineConfig.phases}
                targetCompletionDate={timelineConfig.targetCompletionDate}
                onSave={handleSaveConfig}
            />

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                        <Clock className="w-8 h-8 text-cyan-400" />
                        Implementation Timeline
                    </h1>
                    <p className="text-white/60 mt-1">
                        Track asset migration journey to <Tooltip term="PQC">PQC</Tooltip> compliance
                    </p>
                </div>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowConfig(true)}>
                    <Filter className="w-4 h-4" />
                    Configure Timeline
                </Button>
            </div>

            {/* Chart */}
            <TimelineChart phases={timelineConfig.phases} targetCompletionDate={timelineConfig.targetCompletionDate} />

            {/* Filters */}
            <GlassPanel className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        >
                            <option value="all">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="in-progress">In Progress</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
            </GlassPanel>

            {/* Timeline List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-white/50 animate-pulse">Loading timeline data...</div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-white/50">No migration events found matching your criteria.</div>
                ) : (
                    filteredEvents.map((event) => (
                        <GlassPanel key={event.id} className="p-6">
                            <div className="flex flex-col lg:flex-row gap-6 lg:items-center">

                                {/* Asset Info */}
                                <div className="lg:w-1/4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-mono text-cyan-400">#{event.id.substring(0, 8)}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${event.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                            event.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {event.riskLevel} Risk
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">{event.assetName}</h3>
                                    <p className="text-sm text-white/50 mt-1">Discovered: {event.discoveredAt}</p>
                                </div>

                                {/* Progress Steps */}
                                <div className="lg:flex-1 relative">
                                    {/* Connecting Line */}
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 hidden lg:block" />

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">

                                        {/* Step 1: Scan */}
                                        <div className={`flex items-center gap-3 lg:justify-center p-3 rounded-lg border transition-colors ${getStepStatus(event, 'scan') === 'completed'
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : 'bg-white/5 border-white/10 opacity-50'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getStepStatus(event, 'scan') === 'completed' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/30'
                                                }`}>
                                                <Search className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">Analysis</div>
                                                <div className="text-xs text-white/50">
                                                    {event.scannedAt || 'Pending'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 2: Wrap */}
                                        <div className={`flex items-center gap-3 lg:justify-center p-3 rounded-lg border transition-colors ${getStepStatus(event, 'wrap') === 'completed'
                                            ? 'bg-purple-500/10 border-purple-500/30'
                                            : 'bg-white/5 border-white/10 opacity-50'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getStepStatus(event, 'wrap') === 'completed' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/30'
                                                }`}>
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">Wrapping</div>
                                                <div className="text-xs text-white/50">
                                                    {event.wrappedAt ? 'Encapsulated' : 'Pending'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 3: Attest */}
                                        <div className={`flex items-center gap-3 lg:justify-center p-3 rounded-lg border transition-colors ${getStepStatus(event, 'attest') === 'completed'
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-white/5 border-white/10 opacity-50'
                                            }`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getStepStatus(event, 'attest') === 'completed' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/30'
                                                }`}>
                                                <FileCheck className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">Attestation</div>
                                                <div className="text-xs text-white/50">
                                                    {event.attestedAt ? 'Verified' : 'Pending'}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="lg:w-1/6 flex justify-end">
                                    <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${event.status === 'ATTESTED'
                                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                        : event.status.includes('WRAPPED') || event.status === 'DISCOVERED'
                                            ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                            : 'bg-white/5 border-white/10 text-white/40'
                                        }`}>
                                        {event.status === 'ATTESTED' ? 'Complete' : event.status === 'PENDING' ? 'Pending' : 'In Progress'}
                                    </div>
                                </div>

                            </div>
                        </GlassPanel>
                    ))
                )}
            </div>
        </div>
    );
}

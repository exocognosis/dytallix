'use client';

import {
    Calendar,
    CheckCircle,
    Clock,
    Play,
    Circle
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { implementationTimeline, type TimelinePhase } from '@/lib/mockData';

export default function TimelinePage() {
    const getStatusIcon = (status: TimelinePhase['status']) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'in-progress': return <Play className="w-5 h-5 text-cyan-400" />;
            case 'upcoming': return <Circle className="w-5 h-5 text-white/30" />;
        }
    };

    const getStatusClass = (status: TimelinePhase['status']) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 border-green-500/30';
            case 'in-progress': return 'bg-cyan-500/20 border-cyan-500/30 quantum-glow';
            case 'upcoming': return 'bg-white/5 border-white/10';
        }
    };

    const getBarClass = (status: TimelinePhase['status']) => {
        switch (status) {
            case 'completed': return 'bg-gradient-to-r from-green-500 to-green-400';
            case 'in-progress': return 'bg-gradient-to-r from-cyan-500 to-blue-500';
            case 'upcoming': return 'bg-white/20';
        }
    };

    const completedPhases = implementationTimeline.filter(p => p.status === 'completed').length;
    const totalPhases = implementationTimeline.length;
    const progressPercent = Math.round((completedPhases / totalPhases) * 100);

    const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-cyan-400" />
                    Implementation Timeline
                </h1>
                <p className="text-white/60 mt-1">
                    6-month PQC deployment roadmap
                </p>
            </div>

            {/* Progress Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold quantum-gradient-text">{progressPercent}%</div>
                    <div className="text-xs text-white/50">Overall Progress</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{completedPhases}</div>
                    <div className="text-xs text-white/50">Phases Completed</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                        {implementationTimeline.filter(p => p.status === 'in-progress').length}
                    </div>
                    <div className="text-xs text-white/50">In Progress</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-white/50">
                        {implementationTimeline.filter(p => p.status === 'upcoming').length}
                    </div>
                    <div className="text-xs text-white/50">Upcoming</div>
                </GlassPanel>
            </div>

            {/* Gantt Chart */}
            <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    Deployment Gantt Chart
                </h3>

                {/* Timeline Header */}
                <div className="grid grid-cols-12 gap-1 mb-4 px-4">
                    <div className="col-span-3" />
                    {months.map((month, i) => (
                        <div key={i} className="col-span-1-5 text-center">
                            <span className="text-xs text-white/50">{month}</span>
                        </div>
                    ))}
                </div>

                {/* Month markers - background grid */}
                <div className="relative">
                    <div className="absolute inset-0 grid grid-cols-12 gap-1 px-4">
                        <div className="col-span-3" />
                        {months.map((_, i) => (
                            <div
                                key={i}
                                className="col-span-1-5 border-l border-white/5"
                                style={{ gridColumn: `span 1.5 / span 1.5` }}
                            />
                        ))}
                    </div>

                    {/* Phase rows */}
                    <div className="relative space-y-3">
                        {implementationTimeline.map((phase) => (
                            <div key={phase.id} className="grid grid-cols-12 gap-1 items-center">
                                {/* Phase name */}
                                <div className="col-span-3 pr-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(phase.status)}
                                        <span className="text-sm font-medium text-white truncate">
                                            {phase.name}
                                        </span>
                                    </div>
                                </div>

                                {/* Gantt bar */}
                                <div className="col-span-9 relative h-8">
                                    <div
                                        className={`absolute h-full rounded-md flex items-center px-3 text-xs font-medium text-white ${getBarClass(phase.status)}`}
                                        style={{
                                            left: `${((phase.startMonth - 1) / 6) * 100}%`,
                                            width: `${(phase.duration / 6) * 100}%`,
                                        }}
                                    >
                                        <span className="truncate opacity-80">{phase.name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-400" />
                        <span className="text-sm text-white/60">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gradient-to-r from-cyan-500 to-blue-500" />
                        <span className="text-sm text-white/60">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-white/20" />
                        <span className="text-sm text-white/60">Upcoming</span>
                    </div>
                </div>
            </GlassPanel>

            {/* Phase Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {implementationTimeline.map((phase) => (
                    <GlassPanel
                        key={phase.id}
                        className={`p-5 border ${getStatusClass(phase.status)}`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            {getStatusIcon(phase.status)}
                            <span className="text-xs text-white/50">
                                Month {phase.startMonth} - {phase.startMonth + phase.duration - 1}
                            </span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">{phase.name}</h4>
                        <p className="text-sm text-white/60">{phase.description}</p>
                    </GlassPanel>
                ))}
            </div>
        </div>
    );
}

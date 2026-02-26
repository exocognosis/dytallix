import React, { useMemo } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';

export interface Phase {
    id: string;
    name: string;
    startDate: string; // ISO Date string YYYY-MM-DD
    endDate: string;   // ISO Date string YYYY-MM-DD
    color: string;
}

interface TimelineChartProps {
    phases: Phase[];
    targetCompletionDate?: string | null;
}

export function TimelineChart({ phases, targetCompletionDate }: TimelineChartProps) {
    const today = new Date();

    // Determine chart bounds
    const dates = useMemo(() => {
        const allDates = [
            today.getTime(),
            ...(targetCompletionDate ? [new Date(targetCompletionDate).getTime()] : []),
            ...phases.flatMap(p => [new Date(p.startDate).getTime(), new Date(p.endDate).getTime()])
        ];
        return {
            min: Math.min(...allDates),
            max: Math.max(...allDates)
        };
    }, [phases, targetCompletionDate]);

    // Add some padding to the timeline (5% on each side)
    const timeRange = dates.max - dates.min;
    const padding = timeRange * 0.05;
    const startTimestamp = dates.min - padding;
    const endTimestamp = dates.max + padding;
    const totalDuration = endTimestamp - startTimestamp;

    const getPositionPercentage = (date: string | Date | number) => {
        const time = new Date(date).getTime();
        return ((time - startTimestamp) / totalDuration) * 100;
    };

    // Generate Month Markers
    const markers = useMemo(() => {
        const markers = [];
        const startDate = new Date(startTimestamp);
        const endDate = new Date(endTimestamp);
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

        while (current <= endDate) {
            markers.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }
        return markers;
    }, [startTimestamp, endTimestamp]);

    // Calculate Overall Status
    const calculateStatus = () => {
        const isPastTarget = targetCompletionDate && today > new Date(targetCompletionDate);
        if (isPastTarget) return { label: 'Overdue', color: 'text-red-400 border-red-500/30 bg-red-500/10', icon: AlertTriangle };

        // Check if any active phase is overdue
        const currentPhaseObj = phases.find(p => today >= new Date(p.startDate) && today <= new Date(p.endDate));
        if (currentPhaseObj) {
            // In a phase. Simple check: if we are > 90% through phase time? 
            // Without progress data, we default to On Track.
            return { label: 'On Track', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', icon: Clock };
        }

        // If between phases or before start
        return { label: 'Pending', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: Calendar };
    };

    const status = calculateStatus();

    return (
        <GlassPanel className="p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-semibold text-white">Project Roadmap</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                        <span>Started {new Date(phases[0]?.startDate || Date.now()).toLocaleDateString()}</span>
                        {targetCompletionDate && (
                            <span>Target: {new Date(targetCompletionDate).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.color}`}>
                    <status.icon className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">{status.label}</span>
                </div>
            </div>

            <div className="relative min-h-[200px] border-l border-white/5 border-b border-white/5">

                {/* Grid Lines (Months) */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {markers.map((date, i) => {
                        const left = getPositionPercentage(date);
                        if (left < 0 || left > 100) return null;
                        return (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-white/5 flex flex-col justify-end pb-2 pl-2"
                                style={{ left: `${left}%` }}
                            >
                                <span className="text-[10px] text-white/20 whitespace-nowrap -ml-2 translate-y-6">
                                    {date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Phases Rows */}
                <div className="relative py-4 space-y-6 z-10">
                    {phases.map((phase) => {
                        const start = getPositionPercentage(phase.startDate);
                        const end = getPositionPercentage(phase.endDate);
                        const width = end - start;

                        return (
                            <div key={phase.id} className="relative h-10 w-full flex items-center group">
                                {/* Label Column (could be separate, but here purely visual on top/left) */}
                                <div
                                    className="absolute h-8 rounded-md flex items-center px-3 text-xs font-semibold text-white shadow-lg transition-all hover:brightness-110 cursor-pointer overflow-hidden whitespace-nowrap"
                                    style={{
                                        left: `${start}%`,
                                        width: `${width}%`,
                                        backgroundColor: phase.color.replace('bg-', '').replace('/80', '') // Hack to get color value if classes used, or rely on style
                                    }}
                                >
                                    {/* If using tailwind classes in config, we need actual style or consistent mapping. 
                                       For now, let's assume the config passes simplified color names or we map them.
                                       Actually, the config passes 'bg-red-500/80'. We can apply that class directly. */}
                                    <div className={`absolute inset-0 ${phase.color} opacity-80`} />
                                    <span className="relative z-10 truncate">{phase.name}</span>
                                    <span className="relative z-10 ml-auto opacity-60 text-[10px] hidden sm:block">
                                        {new Date(phase.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(phase.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Today Marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-20 flex flex-col items-center pointer-events-none"
                    style={{ left: `${getPositionPercentage(today)}%` }}
                >
                    <div className="w-2 h-2 bg-white rounded-full -mt-1 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    <div className="mt-1 bg-white/10 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded border border-white/20 uppercase font-bold tracking-wider whitespace-nowrap">
                        Today
                    </div>
                </div>

                {/* Target Date Marker */}
                {targetCompletionDate && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-red-500/50 z-10 flex flex-col items-center pointer-events-none"
                        style={{ left: `${getPositionPercentage(targetCompletionDate)}%` }}
                    >
                        <div className="mt-8 bg-red-500/10 backdrop-blur-md text-red-300 text-[10px] px-1.5 py-0.5 rounded border border-red-500/20 uppercase font-bold tracking-wider whitespace-nowrap">
                            Deadline
                        </div>
                    </div>
                )}
            </div>

            {/* Axis Labels Spacer */}
            <div className="h-8" />
        </GlassPanel>
    );
}

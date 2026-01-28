import React, { useEffect, useState } from 'react';
import { Phase } from './TimelineChart';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { X } from 'lucide-react';

interface TimelineConfigProps {
    isOpen: boolean;
    onClose: () => void;
    phases: Phase[];
    targetCompletionDate?: string | null;
    onSave: (phases: Phase[], targetCompletionDate: string | null) => void;
}

export function TimelineConfig({ isOpen, onClose, phases, targetCompletionDate, onSave }: TimelineConfigProps) {
    const [localPhases, setLocalPhases] = useState<Phase[]>(phases);
    const [localTarget, setLocalTarget] = useState<string>(targetCompletionDate || '');

    useEffect(() => {
        setLocalPhases(phases);
        setLocalTarget(targetCompletionDate || '');
    }, [phases, targetCompletionDate, isOpen]);

    if (!isOpen) return null;

    const handleUpdatePhase = (index: number, field: keyof Phase, value: string) => {
        const newPhases = [...localPhases];
        newPhases[index] = { ...newPhases[index], [field]: value };
        setLocalPhases(newPhases);
    };

    const handleSave = () => {
        onSave(localPhases, localTarget || null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <GlassPanel className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5 text-white/60" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Configure Project Timeline</h2>

                <div className="space-y-8">
                    {/* Overall Settings */}
                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                        <label className="block text-sm font-semibold text-white mb-2">Overall Target Completion Date</label>
                        <p className="text-xs text-white/40 mb-3">Optional deadine for the entire PQC migration project.</p>
                        <input
                            type="date"
                            value={localTarget}
                            onChange={(e) => setLocalTarget(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>

                    {/* Phases */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Project Phases</h3>
                                <p className="text-sm text-white/50">Define start and end dates for each phase. Overlaps are allowed.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {localPhases.map((phase, index) => (
                                <div key={phase.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white/5 p-4 rounded-lg border border-white/5">
                                    <div className="sm:col-span-4">
                                        <label className="text-xs text-white/40 block mb-1">Phase Name</label>
                                        <input
                                            type="text"
                                            value={phase.name}
                                            onChange={(e) => handleUpdatePhase(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-cyan-400/50 font-medium"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="text-xs text-white/40 block mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={phase.startDate}
                                            onChange={(e) => handleUpdatePhase(index, 'startDate', e.target.value)}
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-cyan-400/50"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="text-xs text-white/40 block mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={phase.endDate}
                                            onChange={(e) => handleUpdatePhase(index, 'endDate', e.target.value)}
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-cyan-400/50"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 pt-4 flex justify-center items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full border border-white/20 ${phase.color}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Configuration</Button>
                </div>
            </GlassPanel>
        </div>
    );
}

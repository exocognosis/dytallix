import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface RiskVisualizationProps {
    hndlScore: number; // 0-100
    crqcScore: number; // 0-100
}

const RiskVisualization: React.FC<RiskVisualizationProps> = ({ hndlScore, crqcScore }) => {
    const data = [
        {
            name: 'HNDL Risk',
            score: hndlScore,
            description: 'Harvest Now, Decrypt Later',
        },
        {
            name: 'CRQC Risk',
            score: crqcScore,
            description: 'Quantum Computer Attack',
        },
    ];

    const getRiskLevel = (score: number) => {
        if (score < 30) return { label: 'Low', color: '#10b981' }; // Emerald 500
        if (score < 70) return { label: 'Medium', color: '#f59e0b' }; // Amber 500
        if (score < 90) return { label: 'High', color: '#ef4444' }; // Red 500
        return { label: 'Critical', color: '#7f1d1d' }; // Red 900
    };

    return (
        <GlassPanel variant="card" hoverEffect={true} className="p-6 flex flex-col h-full">
            <h3 className="text-xl font-semibold text-foreground mb-2">Quantum Risk Profile</h3>
            <p className="text-muted-foreground text-sm mb-6">
                Based on your organization's profile, here is your estimated exposure to quantum threats.
            </p>

            <div className="flex-grow min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--popover-foreground))'
                            }}
                            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                        />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={60}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getRiskLevel(entry.score).color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-lg bg-accent/20 border border-border text-center">
                    <div className="text-sm text-muted-foreground mb-1">HNDL Risk Level</div>
                    <div className="text-2xl font-bold" style={{ color: getRiskLevel(hndlScore).color }}>
                        {getRiskLevel(hndlScore).label}
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-accent/20 border border-border text-center">
                    <div className="text-sm text-muted-foreground mb-1">CRQC Risk Level</div>
                    <div className="text-2xl font-bold" style={{ color: getRiskLevel(crqcScore).color }}>
                        {getRiskLevel(crqcScore).label}
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
};

export default RiskVisualization;

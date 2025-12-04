import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ArrowRight, Vote, Coins, Activity, Lock, Users } from "lucide-react"

export function Tokenomics() {
    const initialDistributionData = [
        { name: "Ecosystem Growth", value: 30, color: "#3b82f6" },
        { name: "Team & Advisors", value: 20, color: "#8b5cf6" },
        { name: "Public Sale", value: 15, color: "#10b981" },
        { name: "Private Sale", value: 15, color: "#f59e0b" },
        { name: "Reserve", value: 20, color: "#64748b" },
    ]

    const rewardDistributionData = [
        { name: "Validator Rewards", value: 40, color: "#3b82f6" },
        { name: "Staker Rewards", value: 30, color: "#10b981" },
        { name: "Treasury", value: 30, color: "#f59e0b" },
    ]

    // Simulate adaptive emission curve: higher utilization -> higher emission (up to a cap)
    const emissionData = Array.from({ length: 11 }, (_, i) => {
        const utilization = i * 10; // 0 to 100%
        // Base 1000, max 5000. Simple linear-ish adaptation for demo
        const rate = utilization > 50 ? 1000 + (utilization - 50) * 80 : 1000;
        return { utilization: `${utilization}%`, rate: Math.min(rate, 5000) };
    });

    return (
        <>
            <Section title="Tokenomics" subtitle="Dual-token economy designed for sustainability and governance.">
                {/* Token Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    <GlassPanel hoverEffect={true} className="p-8 border-l-4 border-l-primary relative overflow-hidden">
                        <div className="absolute top-4 right-4 p-2 bg-primary/10 rounded-lg">
                            <Vote className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">DGT (Governance)</h3>
                        <p className="text-muted-foreground mb-6">
                            The Dytallix Governance Token is used for voting on protocol upgrades, parameter changes, and treasury allocation.
                        </p>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div>Fixed Supply: 1,000,000,000 DGT</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div>Staking for Voting Power</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div>Deflationary Burn Mechanism</li>
                        </ul>
                    </GlassPanel>

                    <GlassPanel hoverEffect={true} className="p-8 border-l-4 border-l-secondary relative overflow-hidden">
                        <div className="absolute top-4 right-4 p-2 bg-secondary/10 rounded-lg">
                            <Coins className="w-6 h-6 text-secondary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">DRT (Reward)</h3>
                        <p className="text-muted-foreground mb-6">
                            The Dytallix Reward Token is used for gas fees, validator rewards, and AI service payments.
                        </p>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>Dynamic Supply based on usage</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>Gas Fee Payments</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>Validator Emissions</li>
                        </ul>
                    </GlassPanel>
                </div>

                {/* Initial Distribution (Existing) */}
                <div className="mb-16">
                    <GlassPanel hoverEffect={true} className="p-8">
                        <h3 className="text-xl font-bold mb-8 text-center">Initial Token Distribution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={initialDistributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={2}
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {initialDistributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number, name: string) => [`${value}%`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-4">
                                {initialDistributionData.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                            <span className="font-medium">{entry.name}</span>
                                        </div>
                                        <span className="font-bold">{entry.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                {/* Adaptive Emission & Reward Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                    {/* Adaptive Emission Chart */}
                    <GlassPanel hoverEffect={true} className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Activity className="w-6 h-6 text-blue-400" />
                            <h3 className="text-xl font-bold">Adaptive Emission</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Emission rates adapt automatically based on network utilization. Higher usage triggers increased emission to incentivize validators, capped at a maximum rate.
                        </p>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={emissionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="utilization" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#888' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="rate" name="Emission Rate (DRT/block)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassPanel>

                    {/* Reward Distribution Chart */}
                    <GlassPanel hoverEffect={true} className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Users className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-bold">Block Reward Distribution</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Each block's emission is distributed to key stakeholders to ensure network security and continuous development.
                        </p>
                        <div className="h-[300px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={rewardDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {rewardDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value: number, name: string) => [`${value}%`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="text-3xl font-bold">100%</span>
                                    <p className="text-xs text-muted-foreground">Emission</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-center">
                            {rewardDistributionData.map((entry, index) => (
                                <div key={index} className="flex flex-col items-center gap-1">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="font-medium">{entry.name}</span>
                                    <span className="text-muted-foreground">{entry.value}%</span>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>

                {/* Governance & Staking Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassPanel hoverEffect={true} className="p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <Lock className="w-6 h-6 text-purple-400" />
                            <h3 className="text-xl font-bold">Staking Mechanics</h3>
                        </div>
                        <p className="text-muted-foreground">
                            Staking uses a global reward index to track proportional rewards efficiently.
                        </p>
                        <div className="bg-black/30 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                            reward_index += (staking_rewards * REWARD_SCALE) / total_stake
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <ArrowRight className="w-4 h-4 mt-0.5 text-purple-400" />
                                <span><strong>DGT</strong> is staked for voting power.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight className="w-4 h-4 mt-0.5 text-purple-400" />
                                <span><strong>DRT</strong> is earned as rewards (never DGT).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight className="w-4 h-4 mt-0.5 text-purple-400" />
                                <span>Rewards accrue automatically per block.</span>
                            </li>
                        </ul>
                    </GlassPanel>

                    <GlassPanel hoverEffect={true} className="p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <Vote className="w-6 h-6 text-orange-400" />
                            <h3 className="text-xl font-bold">Governance Flow</h3>
                        </div>
                        <p className="text-muted-foreground">
                            The DAO controls emission parameters through a transparent proposal lifecycle.
                        </p>
                        <div className="space-y-4">
                            {[
                                { step: "1", title: "Proposal Creation", desc: "Community submits tokenomics proposal" },
                                { step: "2", title: "Voting Period", desc: "DGT holders vote (weighted by stake)" },
                                { step: "3", title: "Execution", desc: "Passed proposals update smart contracts" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-sm">
                                        {item.step}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{item.title}</h4>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>
            </Section>
        </>
    )
}

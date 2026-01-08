import { Section } from "../components/ui/Section"
import { GlassPanel } from "../components/ui/GlassPanel"
import { Check, Shield, Server, Settings, Lock, Activity, FileCheck, Layers } from "lucide-react"



export function Deploy() {
    return (
        <>
            <Section className="pt-32 pb-12">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500">
                        QuantumVault Deployment
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Secure your infrastructure with enterprise-grade post-quantum protection.
                    </p>
                </div>
            </Section>

            <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {/* Standard Plan */}
                    <GlassPanel hoverEffect={true} className="p-8 flex flex-col h-full border-t-4 border-t-blue-500">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold mb-2">Standard Deployment</h3>
                            <p className="text-muted-foreground mb-6">Essential protection for modern enterprises.</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">$50,000</span>
                                <span className="text-muted-foreground">/ one time</span>
                            </div>
                        </div>


                        <div className="space-y-4 flex-grow">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <Server className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Environment Setup</span>
                                    <p className="text-sm text-muted-foreground">Complete provisioning and configuration.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <Settings className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Core Service Config</span>
                                    <p className="text-sm text-muted-foreground">Standardized service orchestration.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <Shield className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Security Hardening</span>
                                    <p className="text-sm text-muted-foreground">Baseline security protocols applied.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Access Control</span>
                                    <p className="text-sm text-muted-foreground">Key-management initialization.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Logging & Audit</span>
                                    <p className="text-sm text-muted-foreground">Pipeline activation for compliance.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Dytallix Integration</span>
                                    <p className="text-sm text-muted-foreground">Seamless connection to standard components.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-blue-500/10 p-1 rounded text-blue-500">
                                    <FileCheck className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Validation</span>
                                    <p className="text-sm text-muted-foreground">Operational readiness checks.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <a
                                href="https://buy.stripe.com/dRmbJ1gJUdOpd6paiH3cc00"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center font-bold rounded-md transition-colors"
                            >
                                Purchase Standard Deployment
                            </a>
                        </div>
                    </GlassPanel>

                    {/* Bespoke Plan */}
                    <GlassPanel hoverEffect={true} className="p-8 flex flex-col h-full border-t-4 border-t-purple-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            ENTERPRISE
                        </div>
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold mb-2">Bespoke Deployment</h3>
                            <p className="text-muted-foreground mb-6">Tailored architecture for complex requirements.</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">$115,000</span>
                                <span className="text-muted-foreground">/ starting at</span>
                            </div>
                        </div>

                        <div className="space-y-4 flex-grow">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Custom Architecture</span>
                                    <p className="text-sm text-muted-foreground">Aligned specifically to client infrastructure.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Non-Standard Config</span>
                                    <p className="text-sm text-muted-foreground">Custom vault services and storage layers.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Tailored Security</span>
                                    <p className="text-sm text-muted-foreground">Specific controls, policies, and compliance mappings.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Deep Integration</span>
                                    <p className="text-sm text-muted-foreground">Client systems, data pipelines, and IAM providers.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Advanced Automation</span>
                                    <p className="text-sm text-muted-foreground">Custom key-management workflows.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Custom Monitoring</span>
                                    <p className="text-sm text-muted-foreground">Bespoke logging and audit routing.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">Performance Tuning</span>
                                    <p className="text-sm text-muted-foreground">Optimized for specific workload patterns.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-purple-500/10 p-1 rounded text-purple-500">
                                    <Check className="h-4 w-4" />
                                </div>
                                <div>
                                    <span className="font-medium">End-to-End Validation</span>
                                    <p className="text-sm text-muted-foreground">Rigorous testing of all bespoke components.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <a
                                href="https://buy.stripe.com/5kQbJ1gJUfWx8Q976v3cc01"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white text-center font-bold rounded-md transition-colors"
                            >
                                Purchase Bespoke Deployment
                            </a>
                        </div>
                    </GlassPanel>
                </div>
            </Section>
        </>
    )
}

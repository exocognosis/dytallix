'use client';

import { CheckCircle2 } from 'lucide-react';

type WizardStep = {
    id: number;
    title: string;
    subtitle: string;
};

type Props = {
    steps: WizardStep[];
    currentStep: number;
    onNavigate: (stepId: number) => void;
};

export function WizardStepIndicator({ steps, currentStep, onNavigate }: Props) {
    return (
        <nav aria-label="Wizard progress" className="w-full mb-6">
            <ol className="flex items-start">
                {steps.map((step, idx) => {
                    const isActive = step.id === currentStep;
                    const isComplete = step.id < currentStep;
                    const isLast = idx === steps.length - 1;
                    const canClick = isComplete; // only allow jumping back to completed steps

                    return (
                        <li key={step.id} className={`flex items-start ${isLast ? 'flex-none' : 'flex-1'}`}>
                            {/* Pip + label */}
                            <button
                                type="button"
                                onClick={() => canClick && onNavigate(step.id)}
                                disabled={!canClick && !isActive}
                                title={step.subtitle}
                                className={`flex flex-col items-center group ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                {/* Circle */}
                                <span
                                    className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${isComplete
                                            ? 'bg-green-500/30 border-green-400 text-green-300'
                                            : isActive
                                                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                                                : 'bg-white/5 border-white/20 text-white/30'
                                        }`}
                                >
                                    {isComplete ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                        <span className="text-sm font-semibold">{step.id}</span>
                                    )}
                                </span>

                                {/* Label */}
                                <span
                                    className={`mt-1.5 text-xs font-medium text-center leading-tight max-w-[72px] hidden sm:block transition-colors ${isActive ? 'text-cyan-300' : isComplete ? 'text-green-400' : 'text-white/30'
                                        }`}
                                >
                                    {step.title}
                                </span>
                            </button>

                            {/* Connector line */}
                            {!isLast && (
                                <div className="flex-1 mt-4 mx-1 h-0.5 relative">
                                    <div className="absolute inset-0 rounded-full bg-white/10" />
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all duration-500"
                                        style={{ width: isComplete ? '100%' : '0%' }}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

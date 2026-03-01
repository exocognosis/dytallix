'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: LucideIcon;
    trend?: {
        value: number;
        label?: string;
    };
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}

export function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default',
    className
}: MetricCardProps) {
    const variantStyles = {
        default: {
            icon: 'text-cyan-400',
            glow: 'rgba(0, 191, 255, 0.1)',
        },
        success: {
            icon: 'text-green-400',
            glow: 'rgba(16, 185, 129, 0.1)',
        },
        warning: {
            icon: 'text-amber-400',
            glow: 'rgba(245, 158, 11, 0.1)',
        },
        danger: {
            icon: 'text-red-400',
            glow: 'rgba(239, 68, 68, 0.1)',
        },
        info: {
            icon: 'text-blue-400',
            glow: 'rgba(59, 130, 246, 0.1)',
        },
    };

    const style = variantStyles[variant];

    const TrendIcon = trend
        ? trend.value > 0
            ? TrendingUp
            : trend.value < 0
                ? TrendingDown
                : Minus
        : null;

    const trendColor = trend
        ? trend.value > 0
            ? 'text-green-400'
            : trend.value < 0
                ? 'text-red-400'
                : 'text-white/50'
        : '';

    return (
        <div
            className={cn(
                "glass-card p-5 relative overflow-hidden group",
                className
            )}
        >
            {/* Subtle glow effect */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${style.glow} 0%, transparent 70%)`,
                }}
            />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-sm text-white/60 font-medium">{title}</p>
                    {Icon && (
                        <div className="hex-icon w-10 h-10">
                            <Icon className={cn("hex-icon-inner w-5 h-5", style.icon)} />
                        </div>
                    )}
                </div>

                <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-white tracking-tight">
                        {value}
                    </span>
                    {trend && TrendIcon && (
                        <div className={cn("flex items-center gap-1 text-sm pb-1", trendColor)}>
                            <TrendIcon className="w-4 h-4" />
                            <span>{Math.abs(trend.value)}%</span>
                            {trend.label && (
                                <span className="text-white/40 text-xs">{trend.label}</span>
                            )}
                        </div>
                    )}
                </div>

                {subtitle && (
                    <p className="text-xs text-white/40 mt-2">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

// Compact variant for smaller displays
interface CompactMetricProps {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    color?: string;
}

export function CompactMetric({ label, value, icon: Icon, color = 'text-cyan-400' }: CompactMetricProps) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            {Icon && <Icon className={cn("w-5 h-5 shrink-0", color)} />}
            <div className="min-w-0 flex-1">
                <p className="text-xs text-white/50 truncate">{label}</p>
                <p className="text-lg font-semibold text-white">{value}</p>
            </div>
        </div>
    );
}

'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'card' | 'dark';
    hoverEffect?: boolean;
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
    ({ className, variant = 'default', hoverEffect = false, ...props }, ref) => {
        const baseClasses = 'rounded-xl border backdrop-blur-md transition-all duration-300';

        const variantClasses = {
            default: 'glass-panel',
            card: 'glass-card',
            dark: 'glass-dark',
        };

        const hoverClasses = hoverEffect && variant !== 'card'
            ? 'hover:-translate-y-1 hover:shadow-xl'
            : '';

        return (
            <div
                ref={ref}
                className={cn(baseClasses, variantClasses[variant], hoverClasses, className)}
                {...props}
            />
        );
    }
);
GlassPanel.displayName = 'GlassPanel';

export { GlassPanel };

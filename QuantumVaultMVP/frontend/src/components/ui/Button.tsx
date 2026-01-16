'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const baseClasses = 'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none';

        const variantClasses = {
            primary: 'btn-primary',
            outline: 'btn-outline',
            ghost: 'btn-ghost',
        };

        const sizeClasses = {
            sm: 'h-8 px-3 text-xs rounded-md',
            md: 'h-10 px-4 text-sm rounded-md',
            lg: 'h-12 px-6 text-base rounded-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };

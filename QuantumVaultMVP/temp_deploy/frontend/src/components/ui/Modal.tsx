'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, className, size = 'md' }: ModalProps) {
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={cn(
                    "modal-content w-full mx-4 animate-in fade-in zoom-in-95 duration-200",
                    sizeClasses[size],
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>
                )}
                <div className={cn("p-6", !title && "pt-12")}>
                    {!title && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}

// Confirmation Modal variant
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default'
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-white/70 mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={onClose}>
                    {cancelLabel}
                </Button>
                <Button
                    variant="primary"
                    onClick={() => { onConfirm(); onClose(); }}
                    className={variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}

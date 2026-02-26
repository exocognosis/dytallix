'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

// Quantum terminology definitions
const QUANTUM_TERMS: Record<string, string> = {
    'CRQC': 'Cryptographically Relevant Quantum Computer - A quantum computer powerful enough to break current encryption standards.',
    'HNDL': 'Harvest Now, Decrypt Later - Attack strategy where encrypted data is collected today for future quantum decryption.',
    'Y2Q': 'Years to Quantum - Estimated timeline until quantum computers can break current cryptography (~2030-2035).',
    'ML-KEM': 'Module-Lattice Key Encapsulation Mechanism (FIPS 203) - NIST-standardized post-quantum key exchange algorithm.',
    'ML-DSA': 'Module-Lattice Digital Signature Algorithm (FIPS 204) - NIST-standardized post-quantum signature algorithm.',
    'SLH-DSA': 'Stateless Hash-Based Digital Signature Algorithm (FIPS 205) - NIST-standardized post-quantum signature using hash functions.',
    'PQC': 'Post-Quantum Cryptography - Cryptographic algorithms believed to be secure against quantum computer attacks.',
    'Shor\'s Algorithm': 'Quantum algorithm that can efficiently factor large integers, breaking RSA and ECC encryption.',
    'Grover\'s Algorithm': 'Quantum search algorithm that provides quadratic speedup, effectively halving symmetric key security.',
    'KEX': 'Key Exchange - Protocol for securely establishing shared cryptographic keys between parties.',
    'KEM': 'Key Encapsulation Mechanism - Asymmetric encryption primitive for securely transmitting symmetric keys.',
    'Lattice': 'Mathematical structure used in many PQC algorithms, believed resistant to quantum attacks.',
    'NIST': 'National Institute of Standards and Technology - U.S. agency that standardized PQC algorithms.',
};

interface TooltipProps {
    term: string;
    children: React.ReactNode;
    className?: string;
}

export function Tooltip({ term, children, className }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ left: 0, top: 0 });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const definition = QUANTUM_TERMS[term] || term;

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportPadding = 16;
            const clampedLeft = Math.min(
                Math.max(rect.left + rect.width / 2, viewportPadding),
                window.innerWidth - viewportPadding,
            );
            setCoords({
                left: clampedLeft,
                top: rect.bottom + 8,
            });
            setIsVisible(true);
        }
    };

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsVisible(false)}
                className={cn(
                    "cursor-help border-b border-dashed border-cyan-400/50 text-cyan-400",
                    className
                )}
            >
                {children}
            </span>
            {mounted && isVisible && createPortal(
                <div
                    className="quantum-tooltip text-left"
                    style={{
                        position: 'fixed',
                        left: `${coords.left}px`,
                        top: `${coords.top}px`,
                        transform: 'translateX(-50%)',
                        marginTop: '0',
                        zIndex: 100000,
                        maxWidth: 'min(360px, calc(100vw - 32px))',
                        width: 'max-content',
                        pointerEvents: 'none',
                    }}
                >
                    <div className="rounded-lg border border-cyan-400/30 bg-black/90 backdrop-blur-md px-3 py-2 shadow-2xl">
                        <div className="font-semibold text-cyan-400 mb-1">{term}</div>
                        <div className="text-white/80 leading-relaxed text-sm break-words whitespace-normal">{definition}</div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

// Simple text tooltip without quantum term lookup
interface SimpleTooltipProps {
    content: string;
    children: React.ReactNode;
    className?: string;
}

export function SimpleTooltip({ content, children, className }: SimpleTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ left: 0, top: 0 });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportPadding = 16;
            const clampedLeft = Math.min(
                Math.max(rect.left + rect.width / 2, viewportPadding),
                window.innerWidth - viewportPadding,
            );
            setCoords({
                left: clampedLeft,
                top: rect.bottom + 8,
            });
            setIsVisible(true);
        }
    };

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsVisible(false)}
                className={cn("cursor-help", className)}
            >
                {children}
            </span>
            {mounted && isVisible && createPortal(
                <div
                    className="quantum-tooltip text-left"
                    style={{
                        position: 'fixed',
                        left: `${coords.left}px`,
                        top: `${coords.top}px`,
                        transform: 'translateX(-50%)',
                        marginTop: '0',
                        zIndex: 100000,
                        maxWidth: 'min(360px, calc(100vw - 32px))',
                        width: 'max-content',
                        pointerEvents: 'none',
                    }}
                >
                    <div className="rounded-lg border border-cyan-400/30 bg-black/90 backdrop-blur-md px-3 py-2 shadow-2xl text-sm text-white/90 break-words whitespace-normal">
                        {content}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

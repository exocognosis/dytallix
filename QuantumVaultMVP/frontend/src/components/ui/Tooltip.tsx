'use client';

import * as React from 'react';
import { useState } from 'react';
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
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const triggerRef = React.useRef<HTMLSpanElement>(null);

    const definition = QUANTUM_TERMS[term] || term;

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 8,
            });
        }
        setIsVisible(true);
    };

    return (
        <span className="relative inline-block">
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
            {isVisible && (
                <div
                    className="quantum-tooltip"
                    style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: '100%',
                        marginTop: '8px',
                    }}
                >
                    <div className="font-semibold text-cyan-400 mb-1">{term}</div>
                    <div className="text-white/80 leading-relaxed">{definition}</div>
                </div>
            )}
        </span>
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

    return (
        <span className="relative inline-block">
            <span
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                className={cn("cursor-help", className)}
            >
                {children}
            </span>
            {isVisible && (
                <div
                    className="quantum-tooltip"
                    style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: '100%',
                        marginTop: '8px',
                    }}
                >
                    {content}
                </div>
            )}
        </span>
    );
}

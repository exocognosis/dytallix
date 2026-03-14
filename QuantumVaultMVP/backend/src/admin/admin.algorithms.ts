import {
    ML_KEM_1024_ALGORITHM,
    ML_KEM_512_ALGORITHM,
    ML_KEM_768_ALGORITHM,
    normalizeKemAlgorithmName,
} from '../crypto/mlkem';
import { ML_DSA_65_ALGORITHM } from '../crypto/mldsa';
import { SLH_DSA_SHAKE_128S_ALGORITHM } from '../crypto/slhdsa';
import { PipelineWrapLevel } from './admin.types';

export function parsePipelineLevel(value: unknown): PipelineWrapLevel {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'baseline' || normalized === 'low' || normalized === 'level1') return 'baseline';
    if (normalized === 'maximum' || normalized === 'max' || normalized === 'high' || normalized === 'level3') return 'maximum';
    return 'enhanced';
}

export function kemAlgorithmForLevel(level: PipelineWrapLevel): string {
    if (level === 'baseline') return ML_KEM_512_ALGORITHM;
    if (level === 'maximum') return ML_KEM_1024_ALGORITHM;
    return ML_KEM_768_ALGORITHM;
}

export function normalizeKemAlgorithm(
    value: unknown,
    fallback: string = ML_KEM_1024_ALGORITHM,
): string {
    const normalized = normalizeKemAlgorithmName(value, fallback);
    const compact = normalized.replace(/[^A-Z0-9]/g, '');

    if (compact.includes('MLKEM512') || compact.includes('KYBER512')) {
        return ML_KEM_512_ALGORITHM;
    }
    if (compact.includes('MLKEM768') || compact.includes('KYBER768')) {
        return ML_KEM_768_ALGORITHM;
    }
    if (compact.includes('MLKEM1024') || compact.includes('KYBER1024')) {
        return ML_KEM_1024_ALGORITHM;
    }

    return normalized;
}

export function normalizeSignatureAlgorithm(value: unknown): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return '';
    if (normalized.includes('DILITHIUM') || normalized.includes('ML-DSA') || normalized.includes('MLDSA')) {
        return ML_DSA_65_ALGORITHM;
    }
    if (normalized.includes('SPHINCS') || normalized.includes('SLH-DSA') || normalized.includes('SLHDSA')) {
        return SLH_DSA_SHAKE_128S_ALGORITHM;
    }
    return '';
}

export function signatureAlgorithmsForLevel(level: PipelineWrapLevel): string[] {
    if (level === 'baseline') return [];
    if (level === 'maximum') return [ML_DSA_65_ALGORITHM, SLH_DSA_SHAKE_128S_ALGORITHM];
    return [ML_DSA_65_ALGORITHM];
}

export function canonicalAlgorithm(value: unknown): string {
    const signature = normalizeSignatureAlgorithm(value);
    if (signature) {
        return signature;
    }

    const raw = String(value || '').trim();
    return normalizeKemAlgorithm(raw, raw || ML_KEM_1024_ALGORITHM);
}

export function algorithmToId(algorithm: string): string {
    return algorithm
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function algorithmMeta(algorithm: string): {
    canonical: string;
    name: string;
    type: 'KEM' | 'Signature' | 'Legacy';
    securityLevel: number;
} {
    const canonical = canonicalAlgorithm(algorithm);
    switch (canonical) {
        case ML_KEM_512_ALGORITHM:
            return {
                canonical,
                name: 'ML-KEM-512 (FIPS 203)',
                type: 'KEM',
                securityLevel: 1,
            };
        case ML_KEM_768_ALGORITHM:
            return {
                canonical,
                name: 'ML-KEM-768 (FIPS 203)',
                type: 'KEM',
                securityLevel: 3,
            };
        case ML_KEM_1024_ALGORITHM:
            return {
                canonical,
                name: 'ML-KEM-1024 (FIPS 203)',
                type: 'KEM',
                securityLevel: 5,
            };
        case ML_DSA_65_ALGORITHM:
            return {
                canonical,
                name: 'ML-DSA-65 (FIPS 204)',
                type: 'Signature',
                securityLevel: 3,
            };
        case SLH_DSA_SHAKE_128S_ALGORITHM:
            return {
                canonical,
                name: 'SLH-DSA-SHAKE-128s (FIPS 205)',
                type: 'Signature',
                securityLevel: 5,
            };
        default:
            return {
                canonical,
                name: canonical,
                type: 'Legacy',
                securityLevel: 0,
            };
    }
}

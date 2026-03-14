import { ClassificationLevel } from '@prisma/client';
import { randomUUID } from 'crypto';

export function inferDataDomain(relativePath: string): string {
    const lower = relativePath.toLowerCase();
    if (lower.includes('genomic') || lower.includes('dna') || lower.includes('fasta') || lower.includes('vcf')) return 'GENOMIC';
    if (lower.includes('patient') || lower.includes('phi') || lower.includes('medical')) return 'PHI';
    if (lower.includes('imaging') || lower.includes('dicom') || lower.includes('scan')) return 'IMAGING';
    if (lower.includes('derived') || lower.includes('analytics') || lower.includes('report')) return 'DERIVED';
    if (lower.includes('audit') || lower.includes('log')) return 'AUDIT';
    if (lower.includes('cert') || lower.includes('key') || lower.includes('pem') || lower.includes('crt')) return 'CRYPTO_MATERIAL';
    if (lower.includes('config') || lower.includes('settings')) return 'CONFIGURATION';
    return 'OPERATIONAL';
}

export function inferCryptoDomain(relativePath: string): string {
    const lower = relativePath.toLowerCase();
    if (lower.includes('key') || lower.includes('secret') || lower.includes('private')) return 'HIGH';
    if (lower.includes('cert') || lower.includes('pem') || lower.includes('crt')) return 'MEDIUM';
    return 'STANDARD';
}

export function deriveClassificationLevel(
    metadata: Record<string, any>,
    nistLevel?: number,
): ClassificationLevel {
    const explicit = String(
        metadata?.classification_level
        || metadata?.classificationLevel
        || metadata?.clearance_level
        || metadata?.clearanceLevel
        || '',
    ).trim().toUpperCase();

    if (explicit.startsWith('L4') || explicit.includes('CRITICAL')) return 'L4_CRITICAL';
    if (explicit.startsWith('L3') || explicit.includes('RESTRICTED')) return 'L3_RESTRICTED';
    if (explicit.startsWith('L2') || explicit.includes('CONFIDENTIAL')) return 'L2_CONFIDENTIAL';
    if (explicit.startsWith('L1') || explicit.includes('SENSITIVE')) return 'L1_SENSITIVE';
    if (explicit.startsWith('L0') || explicit.includes('INTERNAL')) return 'L0_INTERNAL';

    const dataDomain = String(metadata?.data_domain || metadata?.dataDomain || '').toLowerCase();
    if (nistLevel && nistLevel >= 5) return 'L4_CRITICAL';
    if (dataDomain.includes('genomic') || dataDomain.includes('phi')) return 'L4_CRITICAL';
    if ((nistLevel && nistLevel >= 4) || dataDomain.includes('imaging') || dataDomain.includes('crypto')) return 'L3_RESTRICTED';
    if ((nistLevel && nistLevel >= 3) || dataDomain.includes('audit') || dataDomain.includes('configuration')) return 'L2_CONFIDENTIAL';
    if (nistLevel && nistLevel >= 2) return 'L1_SENSITIVE';
    return 'L0_INTERNAL';
}

export function inferOwnerDepartment(dataDomain: string): string {
    const normalized = String(dataDomain || '').trim().toUpperCase();
    if (normalized === 'GENOMIC' || normalized === 'PHI' || normalized === 'IMAGING') return 'BIOSECURITY';
    if (normalized === 'AUDIT') return 'COMPLIANCE';
    if (normalized === 'CRYPTO_MATERIAL' || normalized === 'CONFIGURATION') return 'PLATFORM_SECURITY';
    if (normalized === 'DERIVED') return 'DATA_SCIENCE';
    return 'OPERATIONS';
}

export function deriveAuthorizedRoles(
    metadata: Record<string, any>,
    classificationLevel: ClassificationLevel,
): string[] {
    const raw = metadata?.authorized_roles || metadata?.authorizedRoles;
    const parsed = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
            ? raw.split(',')
            : [];

    const normalized = parsed
        .map((entry) => String(entry).trim().toUpperCase())
        .filter(Boolean);

    if (normalized.length > 0) {
        return Array.from(new Set(normalized));
    }

    if (classificationLevel === 'L4_CRITICAL' || classificationLevel === 'L3_RESTRICTED') {
        return ['ADMIN', 'SECURITY_ENGINEER'];
    }

    return ['ADMIN', 'SECURITY_ENGINEER', 'VIEWER'];
}

export function deriveRetentionPolicy(metadata: Record<string, any>, dataDomain: string): string {
    const explicit = String(
        metadata?.retention_policy
        || metadata?.retentionPolicy
        || metadata?.retention_tag
        || metadata?.retentionTag
        || '',
    ).trim();

    if (explicit) {
        return explicit;
    }

    const normalized = String(dataDomain || '').trim().toUpperCase();
    if (normalized === 'GENOMIC' || normalized === 'PHI') return '7y';
    if (normalized === 'AUDIT') return '10y';
    if (normalized === 'CRYPTO_MATERIAL') return '3y';
    return '2y';
}

export function deriveNistLevel(metadata: Record<string, any>): number {
    const explicit = Number(metadata?.nist_level ?? metadata?.nistLevel);
    if (Number.isFinite(explicit) && explicit > 0) {
        return Math.min(Math.max(Math.floor(explicit), 1), 5);
    }

    const domain = String(metadata?.data_domain || '').toLowerCase();
    const cryptoDomain = String(metadata?.crypto_domain || '').toLowerCase();

    if (domain.includes('genomic') || domain.includes('phi') || domain.includes('patient')) return 5;
    if (domain.includes('imaging') || domain.includes('media') || domain.includes('legal')) return 4;
    if (cryptoDomain.includes('high')) return 4;
    if (domain.includes('derived') || domain.includes('de-identified')) return 2;
    if (domain.includes('operational') || domain.includes('audit')) return 3;
    return 3;
}

export function buildDiscoveryManifestEntry(relativePath: string, fileSizeBytes: number, plaintextSha256: string) {
    const dataDomain = inferDataDomain(relativePath);
    const cryptoDomain = inferCryptoDomain(relativePath);
    const classificationLevel = deriveClassificationLevel({
        data_domain: dataDomain,
        crypto_domain: cryptoDomain,
    });

    return {
        object_id: randomUUID(),
        relative_path: relativePath,
        plaintext_sha256: plaintextSha256,
        file_size_bytes: fileSizeBytes,
        data_domain: dataDomain,
        crypto_domain: cryptoDomain,
        classification_level: classificationLevel,
        owner_department: inferOwnerDepartment(dataDomain),
        retention_policy: deriveRetentionPolicy({}, dataDomain),
        authorized_roles: deriveAuthorizedRoles({}, classificationLevel),
        pqc_status: 'UNPROTECTED',
        pqc_protected: false,
        expected_policy_outcome: 'WRAP_PQC',
        discovered_at: new Date().toISOString(),
    };
}

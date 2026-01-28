import { Injectable } from '@nestjs/common';

@Injectable()
export class ThreatsService {
    getMappings() {
        return [
            {
                id: 'threat-001',
                threatVector: 'HNDL Attack',
                failureWithoutControl: 'Encrypted data harvested today becomes vulnerable when quantum computers break RSA/ECC',
                quantumVaultControl: 'PQC encryption ensures data remains protected against future quantum decryption',
                severity: 'critical',
                highlighted: true,
            },
            {
                id: 'threat-002',
                threatVector: 'Key Recovery Attack',
                failureWithoutControl: 'Private keys extracted from compromised systems enable mass decryption',
                quantumVaultControl: 'HSM-backed keys with quantum-resistant algorithms prevent extraction',
                severity: 'critical',
                highlighted: true,
            },
            {
                id: 'threat-003',
                threatVector: 'PKI Collapse',
                failureWithoutControl: 'Entire certificate chain becomes untrusted when root CA is compromised',
                quantumVaultControl: 'Hybrid certificates with PQC backup maintain trust during transition',
                severity: 'critical',
                highlighted: true,
            },
            {
                id: 'threat-004',
                threatVector: 'Signature Forgery',
                failureWithoutControl: 'Digital signatures can be forged, enabling document tampering',
                quantumVaultControl: 'ML-DSA/SLH-DSA signatures are quantum-resistant',
                severity: 'high',
            },
            {
                id: 'threat-005',
                threatVector: 'Session Hijacking',
                failureWithoutControl: 'TLS session keys compromised via quantum attack on key exchange',
                quantumVaultControl: 'PQC-hardened TLS with ML-KEM key exchange',
                severity: 'high',
            },
            {
                id: 'threat-006',
                threatVector: 'Cryptographic Oracle',
                failureWithoutControl: 'Side-channel leaks expose key material over time',
                quantumVaultControl: 'Constant-time PQC implementations with hardware isolation',
                severity: 'medium',
            },
        ];
    }
}

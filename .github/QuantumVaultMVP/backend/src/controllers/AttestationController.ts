import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AttestationService } from '../services/blockchain/AttestationService';

const prisma = new PrismaClient();
const attestationService = new AttestationService();

export const createAttestationJob = async (req: Request, res: Response) => {
    try {
        const { assetIds } = req.body; // List of asset IDs to attest
        if (!assetIds || !Array.isArray(assetIds)) {
            return res.status(400).json({ error: 'assetIds array required' });
        }

        // Create Job
        // For MVP assuming default 'Active' anchor or just null anchor
        // We need an anchor to satisfy schema? Schema says anchorId is required.
        // We'll Create a dummy anchor if none exists or fetch first.
        let anchor = await prisma.encryptionAnchor.findFirst();
        if (!anchor) {
            // Auto-seed for MVP
            anchor = await prisma.encryptionAnchor.create({
                data: {
                    name: "Default Anchor",
                    anchorType: "ROOT_OF_TRUST",
                    rootKeyAlgorithm: "KYBER1024",
                    rootPublicKeyReference: "vault/anchor/1",
                    associatedPolicyIds: [],
                    isActive: true
                }
            });
        }

        const job = await prisma.blockchainAttestationJob.create({
            data: {
                anchorId: anchor.id,
                blockchainNetwork: 'ethereum-local',
                status: 'PENDING',
                totalAssets: assetIds.length
            }
        });

        // Create Attestation Records
        const promises = assetIds.map(id => prisma.blockchainAttestation.create({
            data: {
                jobId: job.id,
                anchorId: anchor!.id,
                assetId: id,
                payloadHash: 'PENDING'
            }
        }));
        await Promise.all(promises);

        // Run Async
        attestationService.runAttestationJob(job.id).catch(console.error);

        res.json(job);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const getAttestationJobs = async (req: Request, res: Response) => {
    const jobs = await prisma.blockchainAttestationJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    res.json(jobs);
};

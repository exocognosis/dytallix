import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAssets = async (req: Request, res: Response) => {
    try {
        const assets = await prisma.asset.findMany({
            orderBy: { quantumRiskScore: 'desc' }
        });
        res.json(assets);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getAsset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const asset = await prisma.asset.findUnique({
            where: { id },
            include: {
                keyMaterial: true,
                policyAssets: { include: { policy: true } },
                blockchainAttestations: true
            }
        });
        if (!asset) return res.status(404).json({ error: 'Not found' });
        res.json(asset);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

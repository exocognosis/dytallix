import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ScannerService } from '../services/scanner/ScannerService';

const prisma = new PrismaClient();
const scanner = new ScannerService();

export const createScan = async (req: Request, res: Response) => {
    try {
        const { targets, type } = req.body; // targets: string[]

        if (!targets || !Array.isArray(targets)) {
            return res.status(400).json({ error: 'targets array required' });
        }

        const scan = await prisma.scan.create({
            data: {
                scanType: type || 'DISCOVERY',
                status: 'RUNNING'
            }
        });

        // Run async
        scanner.runDiscoveryScan(scan.id, targets).catch(err => console.error(err));

        res.json(scan);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getScans = async (req: Request, res: Response) => {
    try {
        const scans = await prisma.scan.findMany({
            orderBy: { startedAt: 'desc' },
            take: 20
        });
        res.json(scans);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getScan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const scan = await prisma.scan.findUnique({
            where: { id },
            include: { scanAssets: { include: { asset: true } } }
        });
        res.json(scan);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

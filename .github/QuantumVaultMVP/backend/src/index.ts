import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import assetRoutes from './routes/assetRoutes';
import scanRoutes from './routes/scanRoutes';
import attestationRoutes from './routes/attestationRoutes';

app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/scans', scanRoutes);
app.use('/api/v1/attestations', attestationRoutes);

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;

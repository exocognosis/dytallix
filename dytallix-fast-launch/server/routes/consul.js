import express from 'express/lib/express.js';
import { logError, logInfo } from '../logger.js';
import {
    getConsulSnapshot,
    runConsulCycle,
    fetchConsulProposals,
    fileManualDispute,
    queryOnChainAttestations,
    queryOnChainDisputes,
    queryOnChainQuorum,
} from '../services/consul/agent.js';

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const snapshot = await getConsulSnapshot();
        res.json(snapshot);
    } catch (error) {
        logError('Consul status endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load Consul status',
            message: error.message,
        });
    }
});

router.post('/run', async (req, res) => {
    try {
        const result = await runConsulCycle({ manual: true });
        const status = result.success ? 200 : result.skipped ? 409 : 500;
        res.status(status).json(result);
    } catch (error) {
        logError('Consul run endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Consul cycle failed',
            message: error.message,
        });
    }
});

router.get('/proposals', async (req, res) => {
    try {
        const proposals = await fetchConsulProposals();
        res.json({
            success: true,
            count: proposals.length,
            proposals,
        });
    } catch (error) {
        logError('Consul proposals endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load proposals',
            message: error.message,
        });
    }
});

router.get('/attestations', async (req, res) => {
    try {
        const proposalId = req.query.proposal_id ? Number(req.query.proposal_id) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const payload = await queryOnChainAttestations({ proposalId, limit });
        res.json({
            success: true,
            ...payload,
        });
    } catch (error) {
        logError('Consul attestations endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load on-chain attestations',
            message: error.message,
        });
    }
});

router.get('/quorum/:proposalId', async (req, res) => {
    try {
        const proposalId = Number(req.params.proposalId);
        if (!Number.isFinite(proposalId) || proposalId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid proposal id',
            });
        }

        const payload = await queryOnChainQuorum(proposalId);
        res.json({
            success: true,
            ...payload,
        });
    } catch (error) {
        logError('Consul quorum endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load quorum snapshot',
            message: error.message,
        });
    }
});

router.get('/disputes', async (req, res) => {
    try {
        const proposalId = req.query.proposal_id ? Number(req.query.proposal_id) : undefined;
        const status = req.query.status ? String(req.query.status) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const payload = await queryOnChainDisputes({ proposalId, status, limit });
        res.json({
            success: true,
            ...payload,
        });
    } catch (error) {
        logError('Consul disputes endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load disputes',
            message: error.message,
        });
    }
});

router.post('/disputes', async (req, res) => {
    try {
        const { proposal_id, reason, severity, against_oracle_id, evidence } = req.body || {};
        if (!proposal_id || !reason) {
            return res.status(400).json({
                success: false,
                error: 'proposal_id and reason are required',
            });
        }

        const payload = await fileManualDispute({
            proposal_id,
            reason,
            severity,
            against_oracle_id,
            evidence,
            filer_oracle_id: req.body?.filer_oracle_id,
        });

        logInfo('Consul manual dispute filed', { proposal_id, reason });
        res.json({
            success: true,
            dispute: payload,
        });
    } catch (error) {
        logError('Consul dispute submission failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to submit dispute',
            message: error.message,
        });
    }
});

export default router;

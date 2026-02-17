import express from 'express/lib/express.js';
import { logError, logInfo } from '../logger.js';
import {
    enqueueGarrisonJob,
    getGarrisonSnapshot,
    listGarrisonJobs,
    queryOnChainAuditAttestation,
    queryOnChainAuditAttestations,
    runGarrisonCycle,
    runImmediateAudit,
    runImmediateRemediation,
} from '../services/garrison/agent.js';

const router = express.Router();

const mapServiceStatus = (error, fallback = 500) => {
    const status = Number(error?.status);
    if (Number.isFinite(status) && status >= 400 && status <= 599) {
        return status;
    }
    return fallback;
};

const badRequest = (res, error) => {
    return res.status(400).json({
        success: false,
        error,
    });
};

router.post('/audit', async (req, res) => {
    try {
        const { contract_code, contract_hash } = req.body || {};
        if (!contract_code || !String(contract_code).trim()) {
            return badRequest(res, 'contract_code is required');
        }
        const payload = await runImmediateAudit({
            contract_code,
            contract_hash,
        });
        return res.json(payload);
    } catch (error) {
        const status = mapServiceStatus(error, 502);
        logError('Garrison /audit failed', { error: error.message, status });
        return res.status(status).json({
            success: false,
            error: 'Garrison audit failed',
            message: error.message,
            details: error.payload || null,
        });
    }
});

router.post('/audit/remediate', async (req, res) => {
    try {
        const { contract_code, contract_hash } = req.body || {};
        if (!contract_code || !String(contract_code).trim()) {
            return badRequest(res, 'contract_code is required');
        }
        const payload = await runImmediateRemediation({
            contract_code,
            contract_hash,
        });
        return res.json(payload);
    } catch (error) {
        const status = mapServiceStatus(error, 502);
        logError('Garrison /audit/remediate failed', { error: error.message, status });
        return res.status(status).json({
            success: false,
            error: 'Garrison remediation failed',
            message: error.message,
            details: error.payload || null,
        });
    }
});

router.get('/garrison/status', async (req, res) => {
    try {
        const includeOnChain = String(req.query.include_onchain || 'true') !== 'false';
        const snapshot = await getGarrisonSnapshot({ includeOnChain });
        res.json(snapshot);
    } catch (error) {
        logError('Garrison status endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load Garrison status',
            message: error.message,
        });
    }
});

router.post('/garrison/run', async (req, res) => {
    try {
        const maxJobs = req.body?.max_jobs;
        const result = await runGarrisonCycle({ manual: true, maxJobs });
        const status = result.success ? 200 : result.skipped ? 409 : 500;
        res.status(status).json(result);
    } catch (error) {
        logError('Garrison run endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to run Garrison cycle',
            message: error.message,
        });
    }
});

router.post('/garrison/jobs', async (req, res) => {
    try {
        const { contract_code, contract_hash, source, metadata } = req.body || {};
        if (!contract_code || !String(contract_code).trim()) {
            return badRequest(res, 'contract_code is required');
        }
        const job = enqueueGarrisonJob({
            contract_code,
            contract_hash,
            source: source || 'api',
            metadata,
        });
        logInfo('Garrison job queued', { id: job.id, source: job.source });
        return res.status(202).json({
            success: true,
            job,
        });
    } catch (error) {
        const status = mapServiceStatus(error, 500);
        logError('Garrison queue endpoint failed', { error: error.message });
        return res.status(status).json({
            success: false,
            error: 'Failed to queue Garrison job',
            message: error.message,
        });
    }
});

router.get('/garrison/jobs', async (req, res) => {
    try {
        const status = req.query.status ? String(req.query.status) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const jobs = listGarrisonJobs({ status, limit });
        res.json({
            success: true,
            count: jobs.length,
            jobs,
        });
    } catch (error) {
        logError('Garrison jobs listing failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to list Garrison jobs',
            message: error.message,
        });
    }
});

router.get('/garrison/attestations', async (req, res) => {
    try {
        const contractPrefix = req.query.contract_prefix ? String(req.query.contract_prefix) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const payload = await queryOnChainAuditAttestations({ contractPrefix, limit });
        res.json({
            success: true,
            ...payload,
        });
    } catch (error) {
        const status = mapServiceStatus(error, 502);
        logError('Garrison attestations endpoint failed', { error: error.message, status });
        res.status(status).json({
            success: false,
            error: 'Failed to load on-chain audit attestations',
            message: error.message,
        });
    }
});

router.get('/garrison/attestations/:contractHash', async (req, res) => {
    try {
        const payload = await queryOnChainAuditAttestation(req.params.contractHash);
        res.json({
            success: true,
            ...payload,
        });
    } catch (error) {
        const status = mapServiceStatus(error, 502);
        logError('Garrison attestation lookup failed', {
            contract_hash: req.params.contractHash,
            error: error.message,
            status,
        });
        res.status(status).json({
            success: false,
            error: 'Failed to load on-chain audit attestation',
            message: error.message,
        });
    }
});

export default router;


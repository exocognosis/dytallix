import { CONFIG } from '../../config/environment.js';
import { logError, logInfo, logWarn } from '../../logger.js';

const ORACLE_BATCH_PATH = process.env.AEGIS_ORACLE_BATCH_PATH || '/oracle/ai_risk_batch';

const relayEnabled = () => process.env.AEGIS_ORACLE_RELAY_ENABLED !== 'false';

export const submitAiRiskBatch = async (records) => {
    if (!relayEnabled()) {
        return {
            success: false,
            skipped: true,
            reason: 'AEGIS_ORACLE_RELAY_ENABLED=false'
        };
    }

    if (!Array.isArray(records) || records.length === 0) {
        return {
            success: false,
            skipped: true,
            reason: 'No records'
        };
    }

    const endpoint = `${CONFIG.chain.blockchainNode}${ORACLE_BATCH_PATH}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ records })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            logWarn('Oracle relayer submission failed', {
                endpoint,
                status: response.status,
                payload
            });

            return {
                success: false,
                endpoint,
                status: response.status,
                payload
            };
        }

        logInfo('Oracle relayer submission successful', {
            endpoint,
            processed: payload.processed ?? records.length,
            failed: payload.failed ?? 0
        });

        return {
            success: true,
            endpoint,
            payload
        };
    } catch (error) {
        logError('Oracle relayer request error', {
            endpoint,
            error: error.message
        });

        return {
            success: false,
            endpoint,
            error: error.message
        };
    }
};

export default {
    submitAiRiskBatch
};

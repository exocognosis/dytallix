import crypto from 'crypto';

export const DYT_ATTESTATION_CTX = 'dytallix-oracle-attestation-v1';
export const DYT_ATTESTATION_VERSION = 'dytallix-attestation-v1';
export const DYT_ATTESTATION_KIND_TX_RISK = 'tx_risk';

export const normalizeRiskScore01 = (riskScore) => {
    const parsed = Number(riskScore);
    if (!Number.isFinite(parsed)) return 0;

    if (parsed > 1) {
        return Math.max(0, Math.min(1, parsed / 100));
    }

    return Math.max(0, Math.min(1, parsed));
};

export const formatRiskScore01 = (riskScore01) => {
    const value = Math.max(0, Math.min(1, Number(riskScore01) || 0));
    const fixed = value.toFixed(6);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return trimmed.includes('.') ? trimmed : `${trimmed}.0`;
};

export const buildOraclePayload = ({ tx_hash, model_id, score_str }) => {
    return {
        kind: DYT_ATTESTATION_KIND_TX_RISK,
        tx_hash,
        model_id,
        score_str
    };
};

export const serializeOraclePayload = (payload) => {
    return `${payload.tx_hash}:${payload.score_str}:${payload.model_id}`;
};

export const hashOraclePayload = (payload) => {
    return crypto.createHash('sha256').update(serializeOraclePayload(payload)).digest('hex');
};

export const buildOracleAttestation = ({
    tx_hash,
    model_id,
    risk_score_0_1,
    confidence,
    signature_b64,
    oracle_pubkey_b64,
    expires_at,
    nonce,
    source_oracle_id,
    submitter,
    score_str,
    issued_at,
    ctx,
    kind,
    from_address
}) => {
    const riskScore01 = normalizeRiskScore01(risk_score_0_1);
    const scoreString = score_str || formatRiskScore01(riskScore01);
    const issuedAt = Number.isFinite(Number(issued_at))
        ? Number(issued_at)
        : Math.floor(Date.now() / 1000);
    const expiresAt = Number.isFinite(Number(expires_at))
        ? Number(expires_at)
        : issuedAt + 300;
    const payload = buildOraclePayload({
        tx_hash,
        model_id,
        score_str: scoreString
    });
    const attestationCtx = ctx || DYT_ATTESTATION_CTX;
    const ttlSec = Math.max(1, expiresAt - issuedAt);

    return {
        kind: kind || DYT_ATTESTATION_KIND_TX_RISK,
        ctx: attestationCtx,
        payload,
        payload_str: serializeOraclePayload(payload),
        payload_hash: hashOraclePayload(payload),
        issued_at: issuedAt,
        ttl_sec: ttlSec,
        tx_hash,
        model_id,
        risk_score_0_1: riskScore01,
        risk_score: riskScore01,
        score_str: scoreString,
        confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
        signature_b64,
        signature: signature_b64,
        oracle_pubkey_b64,
        oracle_pubkey: oracle_pubkey_b64,
        expires_at: expiresAt,
        nonce: nonce || crypto.randomUUID(),
        source_oracle_id: source_oracle_id || 'aegis',
        submitter: submitter || 'aegis-relayer',
        attestation_version: DYT_ATTESTATION_VERSION,
        from_address
    };
};

export default {
    DYT_ATTESTATION_CTX,
    DYT_ATTESTATION_VERSION,
    DYT_ATTESTATION_KIND_TX_RISK,
    normalizeRiskScore01,
    formatRiskScore01,
    buildOraclePayload,
    serializeOraclePayload,
    hashOraclePayload,
    buildOracleAttestation
};

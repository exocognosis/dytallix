/**
 * Blockchain Client Service
 * Handles communication with the blockchain node
 */

import { CONFIG } from '../config/environment.js';

/**
 * Fetch blockchain node status
 */
export async function fetchNodeStatus() {
    // Try our blockchain node first
    try {
        const nodeResponse = await fetch(`${CONFIG.chain.blockchainNode}/stats`);
        if (nodeResponse.ok) {
            const nodeData = await nodeResponse.json().catch(() => ({}));
            const network = 'dytallix-local';
            const height = nodeData?.height || nodeData?.data?.height || 0;
            return { network, height, raw: nodeData, source: 'dytallix-node' };
        }
    } catch (err) {
        console.log('Dytallix node not available, trying Cosmos RPC...');
    }

    // Fallback to Cosmos RPC if available
    if (!CONFIG.chain.rpcHttp) {
        const e = new Error('RPC_NOT_CONFIGURED');
        e.status = 500;
        throw e;
    }

    const r = await fetch(`${CONFIG.chain.rpcHttp}/status`);
    if (!r.ok) {
        const e = new Error(`RPC_STATUS_FAILED_${r.status}`);
        e.status = 502;
        throw e;
    }

    const j = await r.json().catch(() => ({}));
    const network = j?.result?.node_info?.network || null;
    const heightStr = j?.result?.sync_info?.latest_block_height;
    const height = Number(heightStr || 0);
    return { network, height, raw: j, source: 'cosmos-rpc' };
}

/**
 * Get blockchain node base URL
 */
export function getNodeBase() {
    return CONFIG.chain.blockchainNode;
}

/**
 * Make a GET request to the blockchain node
 */
export async function nodeGet(path) {
    const r = await fetch(getNodeBase() + path);
    if (!r.ok) {
        const e = new Error(`NODE_${r.status}`);
        e.status = r.status;
        throw e;
    }
    return r.json();
}

/**
 * Validate bech32 address format
 */
export function isBech32Address(addr) {
    // Accept standard bech32 (prefix1...) or PQC demo addresses (prefix + 40 hex of RIPEMD160)
    if (typeof addr !== 'string') return false;
    const a = addr.trim();
    if (a.startsWith(`${CONFIG.chain.prefix}1`) && a.length >= (CONFIG.chain.prefix.length + 10)) return true;
    const hexRe = new RegExp(`^${CONFIG.chain.prefix}[0-9a-f]{40}$`);
    if (hexRe.test(a)) return true;
    return false;
}

/**
 * Sanitize token symbol
 */
export function sanitizeToken(t) {
    return typeof t === 'string' ? t.trim().toUpperCase() : '';
}

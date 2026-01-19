/**
 * Explorer Routes
 * Blockchain explorer endpoints for blocks, transactions, and addresses
 */

import express from 'express';
import { nodeGet, getNodeBase } from '../services/blockchain-client.js';
import { getDemoBalances } from '../services/demo-ledger.js';
import { CONFIG } from '../config/environment.js';
import { logWarn } from '../logger.js';

const router = express.Router();

// Recent blocks
router.get('/blocks', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit || 10), 50);
        const list = await nodeGet(`/blocks?limit=${limit}`);
        // Enrich with timestamps by fetching full blocks in parallel (bounded)
        const blocks = await Promise.all((list.blocks || []).map(async (b) => {
            try {
                const full = await nodeGet(`/block/${b.height}`);
                return {
                    height: full.height,
                    hash: full.hash,
                    time: full.timestamp || full.time || null,
                    txCount: Array.isArray(full.txs) ? full.txs.length : (Array.isArray(b.txs) ? b.txs.length : 0),
                };
            } catch {
                return {
                    height: b.height,
                    hash: b.hash,
                    time: null,
                    txCount: Array.isArray(b.txs) ? b.txs.length : 0,
                };
            }
        }));
        res.json({ blocks });
    } catch (err) {
        next(err);
    }
});

// Block by height/hash
router.get('/blocks/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const b = await nodeGet(`/block/${encodeURIComponent(id)}`);
        const txs = Array.isArray(b.txs) ? b.txs.map((t) => ({
            hash: t.hash,
            from: t.from,
            to: t.to,
            amount: t.amount,
            fee: t.fee,
            status: 'confirmed',
        })) : [];
        res.json({ hash: b.hash, height: b.height, time: b.timestamp, txs });
    } catch (err) {
        next(err);
    }
});

// Transactions (flatten recent blocks)
router.get('/transactions', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit || 20), 200);
        // Fetch last ~5 blocks and flatten txs until we collect limit
        const head = await nodeGet('/blocks?limit=8');
        const heights = (head.blocks || []).map((b) => b.height);
        const out = [];
        for (const h of heights) {
            if (out.length >= limit) break;
            try {
                const b = await nodeGet(`/block/${h}`);
                for (const t of (b.txs || [])) {
                    if (out.length >= limit) break;
                    out.push({
                        hash: t.hash,
                        from: t.from,
                        to: t.to,
                        amount: t.amount,
                        height: b.height,
                        time: b.timestamp || null,
                        status: 'confirmed',
                    });
                }
            } catch {
                /* ignore per-block errors */
            }
        }
        res.json({ transactions: out });
    } catch (err) {
        next(err);
    }
});

// Transaction by hash
router.get('/transactions/:hash', async (req, res, next) => {
    try {
        const h = req.params.hash;
        const r = await nodeGet(`/tx/${encodeURIComponent(h)}`);
        res.json(r);
    } catch (err) {
        // Graceful fallback: return minimal structure instead of 500
        logWarn('api.transactions.hash.fetch_failed', { hash: req.params.hash, error: err?.message });
        res.json({ hash: req.params.hash, status: 'unknown' });
    }
});

// Address overview + balances
router.get('/addresses/:addr', async (req, res, next) => {
    try {
        const a = req.params.addr;
        let udgt = 0;
        let udrt = 0;

        // 1. Check Demo Ledger (if enabled)
        if (CONFIG.demoMode) {
            const demo = getDemoBalances(a);
            if (demo) {
                udgt = Number(demo.udgt || 0);
                udrt = Number(demo.udrt || 0);
            }
        }

        // 2. Check Real Node (if available)
        let acc = {};
        let balancesRaw = {};

        try {
            // Fetch account info (nonce, etc)
            try {
                acc = await nodeGet(`/account/${encodeURIComponent(a)}`);
            } catch (e) {
                /* ignore account fetch error */
            }

            // Fetch balances
            const b = await nodeGet(`/balance/${encodeURIComponent(a)}`);
            balancesRaw = b?.balances || {};

            // Handle Cosmos SDK format (Array of { denom, amount })
            if (Array.isArray(balancesRaw)) {
                const dgtItem = balancesRaw.find(i => i.denom === 'udgt');
                const drtItem = balancesRaw.find(i => i.denom === 'udrt');
                udgt = Math.max(udgt, Number(dgtItem?.amount || 0));
                udrt = Math.max(udrt, Number(drtItem?.amount || 0));
            }
            // Handle Legacy/Custom format (Object { udgt: { balance: X } })
            else {
                const dgtVal = Number(balancesRaw?.udgt?.balance || balancesRaw?.udgt || 0);
                const drtVal = Number(balancesRaw?.udrt?.balance || balancesRaw?.udrt || 0);
                udgt = Math.max(udgt, dgtVal);
                udrt = Math.max(udrt, drtVal);
            }
        } catch (e) {
            // Node offline or request failed
            if (!CONFIG.demoMode) logWarn('Node balance fetch failed', { address: a, error: e.message });
        }

        res.json({
            address: a,
            balance: `${Math.floor(udgt / 1_000_000)} DGT / ${Math.floor(udrt / 1_000_000)} DRT`,
            balances: balancesRaw,
            nonce: acc?.nonce || 0,
            firstSeen: null,
            lastSeen: null,
        });
    } catch (err) {
        next(err);
    }
});

// Address tx history (scan recent blocks)
router.get('/addresses/:addr/transactions', async (req, res, next) => {
    try {
        const a = req.params.addr;
        const limit = Math.min(Number(req.query.limit || 20), 200);
        const head = await nodeGet('/blocks?limit=20');
        const heights = (head.blocks || []).map((b) => b.height);
        const out = [];
        for (const h of heights) {
            if (out.length >= limit) break;
            try {
                const b = await nodeGet(`/block/${h}`);
                for (const t of (b.txs || [])) {
                    if (out.length >= limit) break;
                    if (t.from === a || t.to === a) {
                        out.push({ hash: t.hash, to: t.to, from: t.from, amount: t.amount, height: b.height, time: b.timestamp, status: 'confirmed' });
                    }
                }
            } catch {
                /* continue */
            }
        }
        res.json({ transactions: out });
    } catch (err) {
        next(err);
    }
});

// Search helper (block|transaction|address)
router.get('/search/:q', async (req, res) => {
    const q = String(req.params.q || '').trim();
    const results = [];

    // Support for Block Height (allow optional # prefix)
    let heightQuery = q;
    if (heightQuery.startsWith('#')) {
        heightQuery = heightQuery.substring(1);
    }

    if (/^\d+$/.test(heightQuery)) {
        const height = Number(heightQuery);
        try {
            const nodeUrl = getNodeBase();
            const blockRes = await fetch(`${nodeUrl}/block/${height}`);
            if (blockRes.ok) {
                const blockData = await blockRes.json();
                let txCount = 0;
                if (Array.isArray(blockData.txs)) {
                    txCount = blockData.txs.length;
                } else if (blockData.data && Array.isArray(blockData.data.txs)) {
                    txCount = blockData.data.txs.length;
                }

                const hash = blockData.hash || (blockData.header ? blockData.header.hash : 'Unknown');
                const time = blockData.time || (blockData.header ? blockData.header.time : null);
                const validator = blockData.validator || (blockData.header ? blockData.header.proposer : 'Validator-01');

                results.push({
                    type: 'block',
                    data: {
                        height: height,
                        hash: hash,
                        validator: validator,
                        txs: txCount,
                        time: time,
                    },
                });
            } else {
                results.push({ type: 'block', data: { height } });
            }
        } catch (e) {
            results.push({ type: 'block', data: { height } });
        }
    }

    // Transaction hash (0x + 64 hex)
    if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
        results.push({ type: 'transaction', data: { hash: q } });
    }

    // Address (bech32 or hex)
    if (/^[a-z0-9]{30,}$/.test(q)) {
        results.push({ type: 'address', data: { address: q } });
    }

    res.json({ results });
});

export default router;

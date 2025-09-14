import fetch from 'node-fetch';
export class DytClient {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
    }
    async getBalance(address) {
        const r = await fetch(`${this.rpc}/balance/${encodeURIComponent(address)}`);
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async getStats() {
        const r = await fetch(`${this.rpc}/api/stats`);
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async getAccount(address) {
        const r = await fetch(`${this.rpc}/account/${encodeURIComponent(address)}`);
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async getGovParams() {
        const r = await fetch(`${this.rpc}/gov/config`);
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async govSubmitProposal(input) {
        const r = await fetch(`${this.rpc}/gov/submit`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input)
        });
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async govDeposit(input) {
        const r = await fetch(`${this.rpc}/gov/deposit`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input)
        });
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async govVote(input) {
        const r = await fetch(`${this.rpc}/gov/vote`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input)
        });
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async govListProposals() {
        const r = await fetch(`${this.rpc}/api/governance/proposals`);
        if (!r.ok)
            throw new Error(`RPC ${r.status}`);
        return r.json();
    }
    async submitSignedTx(signed) {
        const r = await fetch(`${this.rpc}/submit`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ signed_tx: signed })
        });
        if (!r.ok) {
            const t = await r.text().catch(() => '');
            throw new Error(`submit ${r.status} ${t}`);
        }
        return r.json();
    }
}
//# sourceMappingURL=client.js.map
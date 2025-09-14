export type Msg = {
    type: 'send';
    from: string;
    to: string;
    denom: 'DGT' | 'DRT';
    amount: string;
};
export interface Tx {
    chain_id: string;
    nonce: number;
    msgs: Array<{
        type: 'send';
        from: string;
        to: string;
        denom: string;
        amount: string;
    }>;
    fee: string;
    memo: string;
}
export declare function buildSendTx(chainId: string, nonce: number, from: string, to: string, denom: 'DGT' | 'DRT', amountMicro: string, memo?: string): Tx;
export declare function canonicalJson(obj: any): Uint8Array;
export declare function signTxMock(tx: Tx, sk: Uint8Array, pk: Uint8Array): {
    tx: {
        chain_id: string;
        nonce: number;
        msgs: {
            type: string;
            from: string;
            to: string;
            denom: string;
            amount: string;
        }[];
        fee: string;
        memo: string;
    };
    public_key: string;
    signature: string;
    algorithm: string;
    version: number;
};
//# sourceMappingURL=tx.d.ts.map
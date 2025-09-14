export declare class DytClient {
    rpc: string;
    constructor(rpc: string);
    getBalance(address: string): Promise<unknown>;
    getStats(): Promise<unknown>;
    getAccount(address: string): Promise<unknown>;
    getGovParams(): Promise<unknown>;
    govSubmitProposal(input: {
        title: string;
        description: string;
        key: string;
        value: string;
    }): Promise<unknown>;
    govDeposit(input: {
        depositor: string;
        proposal_id: number;
        amount: number;
    }): Promise<unknown>;
    govVote(input: {
        voter: string;
        proposal_id: number;
        option: 'yes' | 'no' | 'abstain' | 'no_with_veto';
    }): Promise<unknown>;
    govListProposals(): Promise<unknown>;
    submitSignedTx(signed: any): Promise<unknown>;
}
//# sourceMappingURL=client.d.ts.map
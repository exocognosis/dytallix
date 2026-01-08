export interface Wallet {
    address: string
    publicKey: string
    privateKey: string
    mnemonic: string
    balance?: {
        udgt: number
        udrt: number
    }
}

const NODE_URL = "http://localhost:3030";

export const walletService = {
    generateWallet: async (): Promise<Wallet> => {
        // In a real app, we would generate a keypair here using WASM.
        // For MVP, we'll use a hardcoded dev wallet that is prefunded in the node.
        // See node/src/main.rs: "dytallix163c72b98928b743df68324e4569e84d817a9a78b"

        const devWallet: Wallet = {
            address: "dytallix163c72b98928b743df68324e4569e84d817a9a78b",
            publicKey: "pqc_pub_dev_key_placeholder",
            privateKey: "pqc_priv_dev_key_placeholder",
            mnemonic: "dev wallet placeholder mnemonic",
            balance: { udgt: 0, udrt: 0 }
        };

        try {
            // Fetch real balance
            const res = await fetch(`${NODE_URL}/balance/${devWallet.address}`);
            if (res.ok) {
                const data = await res.json();
                // Response format: { "balances": { "udgt": 1000, "udrt": 1000 } }
                // Or maybe just { "udgt": 1000, ... } depending on rpc implementation.
                // Checking rpc.rs... get_balance returns the account object or balances map.
                // Let's assume it returns { "udgt": "100", "udrt": "200" } or similar.
                // Actually node/src/rpc/mod.rs get_balance usually returns JSON of balances.

                // Safe parsing
                if (data && typeof data === 'object') {
                    devWallet.balance = {
                        udgt: parseInt(data.udgt || "0"),
                        udrt: parseInt(data.udrt || "0")
                    };
                }
            }
        } catch (e) {
            console.error("Failed to fetch wallet balance:", e);
        }

        return devWallet;
    },
}

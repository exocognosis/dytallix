export const faucetService = {
    requestTokens: async (address: string, token: "DGT" | "DRT" | "BOTH"): Promise<{ success: boolean; txHash?: string; message?: string }> => {
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (!address.startsWith("dyt1")) {
            return { success: false, message: "Invalid Dytallix address format" }
        }

        return {
            success: true,
            txHash: "0x" + Math.random().toString(16).substring(2, 40),
            message: `Successfully sent 100 ${token} to ${address.substring(0, 8)}...`,
        }
    },
}

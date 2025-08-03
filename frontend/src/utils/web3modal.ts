import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, polygon } from '@reown/appkit/networks'

// Get projectId from https://cloud.reown.com
const projectId = process.env.VITE_WALLET_CONNECT_PROJECT_ID || 'dytallix-demo-project-id'

const networks = [mainnet, arbitrum, polygon]

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
})

// Create the AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Dytallix dApp',
    description: 'Dytallix Post-Quantum Blockchain dApp',
    url: window.location.origin,
    icons: ['https://dytallix.com/favicon.ico']
  },
  features: {
    analytics: true,
    email: false,
    socials: [],
    emailShowWallets: true
  }
})

export { networks }
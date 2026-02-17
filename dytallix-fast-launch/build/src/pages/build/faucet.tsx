import { Link } from "react-router-dom"
import { ArrowLeft, Coins, ExternalLink } from "lucide-react"

import { Section } from "../../components/ui/Section"
import { GlassPanel } from "../../components/ui/GlassPanel"
import { Button } from "../../components/ui/Button"

export function FaucetPage() {
  const apiUrl = import.meta.env.VITE_API_URL || "https://dytallix.com"
  const faucetStatusUrl = `${apiUrl.replace(/\/$/, "")}/api/status`

  return (
    <>
      <Section title="Testnet Faucet" subtitle="Request testnet funds and verify faucet availability.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassPanel variant="card" className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Faucet Status</h3>
                <p className="text-sm text-muted-foreground">Health/status endpoint proxied via the backend API.</p>
              </div>
            </div>

            <code className="block bg-black/20 rounded p-3 text-sm font-mono text-muted-foreground overflow-x-auto whitespace-nowrap">
              {faucetStatusUrl}
            </code>

            <div className="mt-4 flex gap-3">
              <Button variant="outline" asChild>
                <a href={faucetStatusUrl} target="_blank" rel="noreferrer">
                  Open <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/build">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Link>
              </Button>
            </div>
          </GlassPanel>

          <GlassPanel variant="card" className="p-6">
            <h3 className="text-lg font-bold mb-2">Get Tokens</h3>
            <p className="text-muted-foreground">
              Use the wallet page to generate an address and request DGT/DRT test tokens.
            </p>
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link to="/build/wallet">Open Wallet</Link>
              </Button>
            </div>
          </GlassPanel>
        </div>
      </Section>
    </>
  )
}

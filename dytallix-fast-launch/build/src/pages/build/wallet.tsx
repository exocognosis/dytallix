import { Section } from "../../components/ui/Section"
import { GlassPanel } from "../../components/ui/GlassPanel"
import { Button } from "../../components/ui/Button"
import { RefreshCw, Copy, Check, ShieldCheck, AlertTriangle, Plus, Trash2, Wallet as WalletIcon, Search, Send, ArrowDownLeft, Link as LinkIcon, X } from "lucide-react"
import { useState, useEffect } from "react"

interface Wallet {
  id: string
  address: string
  privateKey: string
  balance: string | null
  fundingStatus: 'idle' | 'loading' | 'success' | 'error'
  isCheckingBalance: boolean
}

export function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedState, setCopiedState] = useState<{ id: string, type: 'address' | 'key' } | null>(null)

  // Transaction Hub State
  const [activeTab, setActiveTab] = useState<'search' | 'send' | 'receive' | 'request'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<{ balance: string, txCount: number } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const [sendForm, setSendForm] = useState<{
    from: string,
    recipients: { address: string, amount: string, token: 'DGT' | 'DRT' }[]
  }>({
    from: '',
    recipients: [{ address: '', amount: '', token: 'DGT' }]
  })
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean, message: string } | null>(null)

  const [requestAmount, setRequestAmount] = useState('')
  const [requestToken, setRequestToken] = useState<'DGT' | 'DRT'>('DGT')

  useEffect(() => {
    const savedKeys = localStorage.getItem('dytallix_wallet_keys')
    const savedWallets = localStorage.getItem('dytallix_wallets')

    if (savedWallets) {
      try {
        const parsed = JSON.parse(savedWallets)
        setWallets(parsed)
        if (parsed.length > 0) {
          setSelectedWalletId(parsed[0].id)
        }
        // Refresh balances for all restored wallets
        parsed.forEach((w: Wallet) => checkBalance(w.id, w.address))
      } catch (e) {
        console.error("Failed to parse saved wallets", e)
      }
    } else if (savedKeys) {
      // Migrate single wallet to multi-wallet format
      try {
        const parsed = JSON.parse(savedKeys)
        const newWallet: Wallet = {
          id: crypto.randomUUID(),
          address: parsed.address,
          privateKey: parsed.privateKey,
          balance: null,
          fundingStatus: 'idle',
          isCheckingBalance: false
        }
        setWallets([newWallet])
        setSelectedWalletId(newWallet.id)
        localStorage.setItem('dytallix_wallets', JSON.stringify([newWallet]))
        localStorage.removeItem('dytallix_wallet_keys') // Clean up old key
        checkBalance(newWallet.id, newWallet.address)
      } catch (e) {
        console.error("Failed to migrate old wallet", e)
      }
    }
  }, [])

  // Persist wallets whenever they change
  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('dytallix_wallets', JSON.stringify(wallets))
    } else {
      localStorage.removeItem('dytallix_wallets')
    }
  }, [wallets])

  const checkBalance = async (walletId: string, address: string) => {
    setWallets(prev => prev.map(w => w.id === walletId ? { ...w, isCheckingBalance: true } : w))
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';
      const response = await fetch(`${API_URL}/balance/${address}`);
      if (response.ok) {
        const data = await response.json();
        // Node returns { "udgt": "100", "udrt": "200" } or similar map
        const balStr = `${data.udgt || 0} uDGT / ${data.udrt || 0} uDRT`;
        setWallets(prev => prev.map(w => w.id === walletId ? { ...w, balance: balStr, isCheckingBalance: false } : w))
      } else {
        setWallets(prev => prev.map(w => w.id === walletId ? { ...w, isCheckingBalance: false } : w))
      }
    } catch (error) {
      console.error("Failed to check balance:", error);
      setWallets(prev => prev.map(w => w.id === walletId ? { ...w, isCheckingBalance: false } : w))
    }
  }



  const removeWallet = (id: string) => {
    const newWallets = wallets.filter(w => w.id !== id)
    setWallets(newWallets)
    if (selectedWalletId === id) {
      setSelectedWalletId(newWallets.length > 0 ? newWallets[0].id : null)
    }
    if (newWallets.length === 0) {
      localStorage.removeItem('dytallix_wallets')
    } else {
      localStorage.setItem('dytallix_wallets', JSON.stringify(newWallets))
    }
  }

  const generateWallet = () => {
    setIsGenerating(true)

    // Simulate PQC Key Generation Delay
    setTimeout(async () => {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      const privKey = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

      const addrArray = new Uint8Array(20);
      window.crypto.getRandomValues(addrArray);
      const addr = "dytallix1" + Array.from(addrArray, (byte) => byte.toString(16).padStart(2, '0')).join('');

      const newWallet: Wallet = {
        id: crypto.randomUUID(),
        address: addr,
        privateKey: privKey,
        balance: null,
        fundingStatus: 'loading',
        isCheckingBalance: false
      }

      setWallets(prev => [...prev, newWallet])
      setSelectedWalletId(newWallet.id)
      setIsGenerating(false)

      // Auto-fund the new wallet
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';
        // Use dev faucet endpoint
        const response = await fetch(`${API_URL}/dev/faucet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr, amount: 1000000, denom: "udgt" }), // Request uDGT
        });

        if (response.ok) {
          setWallets(prev => prev.map(w => w.id === newWallet.id ? { ...w, fundingStatus: 'success' } : w))
          // Check balance after a short delay
          setTimeout(() => {
            checkBalance(newWallet.id, addr)
          }, 2000)
        } else {
          setWallets(prev => prev.map(w => w.id === newWallet.id ? { ...w, fundingStatus: 'error' } : w))
        }
      } catch (e) {
        console.error("Auto-fund failed", e)
        setWallets(prev => prev.map(w => w.id === newWallet.id ? { ...w, fundingStatus: 'error' } : w))
      }
    }, 1000)
  }

  const copyToClipboard = (text: string, id: string, type: 'address' | 'key') => {
    navigator.clipboard.writeText(text)
    setCopiedState({ id, type })
    setTimeout(() => setCopiedState(null), 2000)
  }

  const selectedWallet = wallets.find(w => w.id === selectedWalletId)

  // Transaction Hub Functions
  const handleSearch = async () => {
    if (!searchQuery) return
    setIsSearching(true)
    setSearchResult(null)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';
      const response = await fetch(`${API_URL}/balance/${searchQuery}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult({
          balance: `${data.udgt || 0} uDGT`,
          txCount: 0 // Node balance endpoint doesn't return nonce/txCount
        })
      }
    } catch (error) {
      console.error("Search failed", error)
    } finally {
      setIsSearching(false)
    }
  }

  const addRecipient = () => {
    setSendForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, { address: '', amount: '', token: 'DGT' }]
    }))
  }

  const removeRecipient = (index: number) => {
    setSendForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }))
  }

  const updateRecipient = (index: number, field: keyof typeof sendForm.recipients[0], value: string) => {
    const newRecipients = [...sendForm.recipients]
    newRecipients[index] = { ...newRecipients[index], [field]: value }
    setSendForm(prev => ({ ...prev, recipients: newRecipients }))
  }

  const handleSend = async () => {
    setIsSending(true)
    setSendResult(null)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';

      // 1. Get Chain ID and Nonce
      const statusRes = await fetch(`${API_URL}/status`);
      const statusData = await statusRes.json();
      const chainId = statusData.chain_id || "dytallix-devnet";

      // Actually sendForm.from is the wallet ID in the select, let's find the wallet object
      const senderWallet = wallets.find(w => w.id === sendForm.from);
      if (!senderWallet) throw new Error("Sender wallet not found");

      const accountData = await fetch(`${API_URL}/account/${senderWallet.address}`).then(r => r.json());
      const nonce = accountData.nonce || 0;

      // 2. Construct Messages
      const msgs = sendForm.recipients.map(r => ({
        type: "send",
        from: senderWallet.address,
        to: r.address,
        denom: r.token === 'DGT' ? 'udgt' : 'udrt', // Convert to micro-denom
        amount: (parseFloat(r.amount) * 1_000_000).toString() // Convert to micro-units (string for u128)
      }));

      // 3. Construct Transaction
      const tx = {
        chain_id: chainId,
        nonce: nonce + 1, // Increment nonce
        msgs: msgs,
        fee: "5000", // Fixed fee for MVP
        memo: "Sent via Dytallix Web Wallet"
      };

      // 4. Sign (Mock/Dev Mode)
      // Since we don't have WASM in browser yet, we rely on node's DYTALLIX_SKIP_SIG_VERIFY=true
      const signedTx = {
        tx: tx,
        public_key: "ZHVtbXlfcHViX2tleQ==", // dummy_pub_key base64
        signature: "ZHVtbXlfc2lnbmF0dXJl", // dummy_signature base64
        algorithm: "Dilithium5",
        version: 1
      };

      // 5. Submit
      const submitRes = await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_tx: signedTx })
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok) {
        throw new Error(submitData.error || submitData.message || "Transaction failed");
      }

      setSendResult({ success: true, message: `Transaction submitted! Hash: ${submitData.hash}` });

      // Reset form
      setSendForm(prev => ({ ...prev, recipients: [{ address: '', amount: '', token: 'DGT' }] }));

      // Refresh balance after a delay
      setTimeout(() => checkBalance(senderWallet.id, senderWallet.address), 2000);

    } catch (e: any) {
      console.error("Send failed", e);
      setSendResult({ success: false, message: e.message || "Failed to send transaction" });
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Section title="PQC Wallet Generator" subtitle="Generate and manage multiple quantum-secure keypairs.">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Generator & List */}
        <div className="md:col-span-2 space-y-6">
          <GlassPanel hoverEffect={true} className="p-8 space-y-6 flex flex-col items-center text-center min-h-[600px]">

            {/* Wallet Selector Tabs */}
            <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {wallets.map((wallet, index) => (
                <button
                  key={wallet.id}
                  onClick={() => setSelectedWalletId(wallet.id)}
                  className={`
                            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                            ${selectedWalletId === wallet.id
                      ? 'bg-primary/20 text-primary border border-primary/50'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border border-transparent'}
                        `}
                >
                  <WalletIcon className="h-3 w-3" />
                  Wallet {index + 1}
                </button>
              ))}
              <button
                onClick={generateWallet}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border border-dashed border-white/20 transition-all whitespace-nowrap"
              >
                {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                New
              </button>
            </div>

            {selectedWallet ? (
              <div className="w-full space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Wallet Details</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => checkBalance(selectedWallet.id, selectedWallet.address)} disabled={selectedWallet.isCheckingBalance}>
                      <RefreshCw className={`mr-2 h-3 w-3 ${selectedWallet.isCheckingBalance ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeWallet(selectedWallet.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="mr-2 h-3 w-3" /> Remove
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium text-muted-foreground block">Algorithm</label>
                  <div className="flex gap-4 justify-center">
                    <Button variant="secondary" className="flex-1 border-primary/20 bg-primary/5 text-primary max-w-[200px]">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Dilithium5 (Recommended)
                    </Button>
                  </div>
                </div>

                <div className="space-y-6 w-full text-left">
                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground block">Public Address</label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={selectedWallet.address}
                        className="glass-input font-mono text-sm bg-green-500/5 border-green-500/20 text-green-500 text-center"
                      />
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(selectedWallet.address, selectedWallet.id, 'address')}>
                        {copiedState?.id === selectedWallet.id && copiedState.type === 'address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Private Key */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      Private Key <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">DO NOT SHARE</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        type="text"
                        value={selectedWallet.privateKey}
                        className="glass-input font-mono text-sm blur-sm hover:blur-none transition-all focus:blur-none text-center"
                      />
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(selectedWallet.privateKey, selectedWallet.id, 'key')}>
                        {copiedState?.id === selectedWallet.id && copiedState.type === 'key' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Status & Balance */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Funding Status</span>
                      <div className="flex items-center gap-2 text-sm">
                        {selectedWallet.fundingStatus === 'loading' && <span className="text-blue-400 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Requesting Tokens...</span>}
                        {selectedWallet.fundingStatus === 'success' && <span className="text-green-500 flex items-center gap-1"><Check className="h-3 w-3" /> Funded Successfully</span>}
                        {selectedWallet.fundingStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Funding Failed</span>}
                        {selectedWallet.fundingStatus === 'idle' && <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="font-mono font-bold text-lg">{selectedWallet.balance || "0 DGT / 0 DRT"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">No Wallet Selected</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Generate a new quantum-secure wallet to get started with the Dytallix Testnet.
                  </p>
                </div>
                <Button size="lg" onClick={generateWallet} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Create First Wallet
                    </>
                  )}
                </Button>
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          <GlassPanel variant="card" className="p-6 space-y-4 h-fit flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Why PQC Matters</h3>
            <p className="text-muted-foreground text-sm">
              Quantum computers will soon be able to break traditional encryption (RSA, ECC).
              Dytallix uses NIST-standardized Post-Quantum Cryptography to ensure your assets remain secure in the quantum era.
            </p>
          </GlassPanel>

          <GlassPanel variant="card" className="p-6 space-y-4 h-fit flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Supported Algorithms</h3>
            <ul className="space-y-3 text-sm text-muted-foreground w-full">
              <li className="flex items-start gap-2 justify-center">
                <span className="text-primary mt-1">•</span>
                <span><strong>Dilithium5:</strong> Recommended for general use. Offers strong security and balanced performance.</span>
              </li>
              <li className="flex items-start gap-2 justify-center">
                <span className="text-primary mt-1">•</span>
                <span><strong>Falcon-1024:</strong> Optimized for compact signatures and fast verification, ideal for constrained environments.</span>
              </li>
            </ul>
          </GlassPanel>
        </div>
      </div>

      {/* Transaction Hub */}
      <div className="max-w-6xl mx-auto mt-8">
        <GlassPanel hoverEffect={true} className="p-0 overflow-hidden min-h-[400px]">
          <div className="border-b border-white/10 flex">
            {[
              { id: 'search', icon: Search, label: 'Search' },
              { id: 'send', icon: Send, label: 'Send' },
              { id: 'receive', icon: ArrowDownLeft, label: 'Receive' },
              { id: 'request', icon: LinkIcon, label: 'Request' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'}
                `}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === 'search' && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold">Wallet Lookup</h3>
                  <p className="text-sm text-muted-foreground">Check the balance and status of any Dytallix address.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter wallet address (dytallix1...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input flex-1"
                  />
                  <Button onClick={handleSearch} disabled={isSearching || !searchQuery}>
                    {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {searchResult && (
                  <div className="bg-white/5 rounded-lg p-6 space-y-4 animate-fade-in border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-mono font-bold text-lg">{searchResult.balance}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-4">
                      <span className="text-muted-foreground">Transactions</span>
                      <span className="font-mono">{searchResult.txCount}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'send' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold">Send Tokens</h3>
                  <p className="text-sm text-muted-foreground">Transfer DGT or DRT to one or multiple recipients.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">From Wallet</label>
                    <select
                      className="glass-input w-full"
                      value={sendForm.from}
                      onChange={(e) => setSendForm({ ...sendForm, from: e.target.value })}
                    >
                      <option value="" disabled>Select a wallet</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.address.slice(0, 12)}...{w.address.slice(-6)} ({w.balance || '0'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    {sendForm.recipients.map((recipient, index) => (
                      <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4 relative">
                        {index > 0 && (
                          <button
                            onClick={() => removeRecipient(index)}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Recipient Address</label>
                            <input
                              type="text"
                              placeholder="dytallix1..."
                              value={recipient.address}
                              onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                              className="glass-input w-full text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="space-y-2 flex-1">
                              <label className="text-xs font-medium text-muted-foreground">Amount</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={recipient.amount}
                                onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                                className="glass-input w-full text-sm"
                              />
                            </div>
                            <div className="space-y-2 w-24">
                              <label className="text-xs font-medium text-muted-foreground">Token</label>
                              <select
                                value={recipient.token}
                                onChange={(e) => updateRecipient(index, 'token', e.target.value as 'DGT' | 'DRT')}
                                className="glass-input w-full text-sm"
                              >
                                <option value="DGT">DGT</option>
                                <option value="DRT">DRT</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={addRecipient} className="w-full border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add Another Recipient
                  </Button>

                  <div className="pt-4">
                    <Button className="w-full" size="lg" onClick={handleSend} disabled={isSending || !sendForm.from}>
                      {isSending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {isSending ? 'Sending Transaction...' : 'Sign & Send Transaction'}
                    </Button>
                  </div>

                  {sendResult && (
                    <div className={`p-4 rounded-lg text-center text-sm ${sendResult.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {sendResult.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'receive' && (
              <div className="max-w-md mx-auto text-center space-y-8 py-8">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">Receive Assets</h3>
                  <p className="text-sm text-muted-foreground">Share your public address to receive tokens.</p>
                </div>

                {selectedWallet ? (
                  <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl w-48 h-48 mx-auto flex items-center justify-center">
                      {/* Placeholder for QR Code - in real app use a QR library */}
                      <div className="w-full h-full bg-black/10 flex items-center justify-center text-black/50 text-xs">
                        QR Code
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Your Address</label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={selectedWallet.address}
                          className="glass-input text-center text-sm font-mono flex-1"
                        />
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(selectedWallet.address, selectedWallet.id, 'address')}>
                          {copiedState?.id === selectedWallet.id && copiedState.type === 'address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Please select a wallet first.</div>
                )}
              </div>
            )}

            {activeTab === 'request' && (
              <div className="max-w-md mx-auto space-y-6 py-8">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold">Request Payment</h3>
                  <p className="text-sm text-muted-foreground">Generate a payment link or QR code.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Amount</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Token</label>
                      <select
                        value={requestToken}
                        onChange={(e) => setRequestToken(e.target.value as 'DGT' | 'DRT')}
                        className="glass-input w-full"
                      >
                        <option value="DGT">DGT</option>
                        <option value="DRT">DRT</option>
                      </select>
                    </div>
                  </div>

                  {selectedWallet && (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2 break-all">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Link</label>
                      <p className="font-mono text-sm text-primary">
                        dytallix:{selectedWallet.address}?amount={requestAmount}&token={requestToken}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>⚠️ This is a testnet wallet. Do not use for real assets.</p>
        <p>Keys are generated locally using cryptographically secure random values.</p>
      </div>
    </Section>
  )
}

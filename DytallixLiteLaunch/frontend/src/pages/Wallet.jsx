import React, { useState, useEffect } from 'react';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient, GasPrice, coins } from '@cosmjs/stargate';
import * as bip39 from 'bip39';

const REST = import.meta.env.VITE_NODE_REST_URL || 'http://localhost:1317';
const RPC = import.meta.env.VITE_NODE_RPC_URL || 'http://localhost:26657';
const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || 'dytallix-testnet-1';
const BECH32 = import.meta.env.VITE_BECH32_PREFIX || 'dytallix';
const DENOM_DGT = import.meta.env.VITE_GOVERNANCE_DENOM || 'udgt';
const DENOM_DRT = import.meta.env.VITE_REWARD_DENOM || 'udrt';
const GAS_PRICE = import.meta.env.VITE_GAS_PRICE || `0.025${DENOM_DGT}`;
const PQC = (import.meta.env.VITE_ENABLE_PQC === 'true') || (import.meta.env.PQC_ENABLED === 'true');

const Wallet = () => {
  const [mnemonic, setMnemonic] = useState('');
  const [address, setAddress] = useState('');
  const [balances, setBalances] = useState({ DGT: '0', DRT: '0' });
  const [sendForm, setSendForm] = useState({ to: '', amount: '', token: 'DGT' });
  const [loading, setLoading] = useState(false);
  const [txHistory, setTxHistory] = useState([]);

  // Persist wallet in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dyt_wallet');
    if (saved) {
      const w = JSON.parse(saved);
      setMnemonic(w.mnemonic || '');
      if (w.address) setAddress(w.address);
    }
  }, []);

  useEffect(() => {
    if (address) {
      refreshBalance();
      refreshTxHistory();
    }
  }, [address]);

  const saveWallet = (mn, addr) => {
    localStorage.setItem('dyt_wallet', JSON.stringify({ mnemonic: mn, address: addr }));
  };

  const generateWallet = async () => {
    if (PQC) {
      alert('PQC mode enabled. CosmJS wallet generation is disabled in this build.');
      return;
    }
    const mn = bip39.generateMnemonic(256);
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mn, { prefix: BECH32 });
    const [acc] = await wallet.getAccounts();
    setMnemonic(mn);
    setAddress(acc.address);
    saveWallet(mn, acc.address);
  };

  const importWallet = async () => {
    if (PQC) {
      alert('PQC mode enabled. Import via PQC keypair UI.');
      return;
    }
    if (!mnemonic || !bip39.validateMnemonic(mnemonic)) {
      alert('Enter a valid 24-word mnemonic');
      return;
    }
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: BECH32 });
    const [acc] = await wallet.getAccounts();
    setAddress(acc.address);
    saveWallet(mnemonic, acc.address);
  };

  const refreshBalance = async () => {
    try {
      const r = await fetch(`${REST}/cosmos/bank/v1beta1/balances/${address}`);
      if (!r.ok) throw new Error('REST error');
      const data = await r.json();
      const arr = data.balances || [];
      const dgt = arr.find((b) => b.denom === DENOM_DGT)?.amount || '0';
      const drt = arr.find((b) => b.denom === DENOM_DRT)?.amount || '0';
      setBalances({ DGT: toDisplay(dgt), DRT: toDisplay(drt) });
    } catch (_) {
      // keep old
    }
  };

  const refreshTxHistory = async () => {
    try {
      const r = await fetch(`${SERVER}/txs?address=${encodeURIComponent(address)}&limit=20`);
      if (!r.ok) return;
      const data = await r.json();
      const rows = data.data || [];
      const mapped = rows.map((t) => ({
        hash: t.hash,
        type: t.from_addr === address ? 'send' : 'receive',
        amount: t.amount ? `${toDisplay(t.amount)} ${t.denom === DENOM_DGT ? 'DGT' : 'DRT'}` : '-',
        to: t.to_addr,
        from: t.from_addr,
        timestamp: t.timestamp || new Date().toISOString(),
      }));
      setTxHistory(mapped);
    } catch (_) {}
  };

  const toDisplay = (micro) => (Number(micro) / 1_000_000).toFixed(6);
  const toMicro = (display) => Math.round(Number(display) * 1_000_000).toString();

  const handleSend = async (e) => {
    e.preventDefault();
    if (PQC) {
      alert('PQC mode enabled. Use PQC signing flow.');
      return;
    }
    if (!mnemonic) { alert('Generate or import a wallet first'); return; }
    if (!address) { alert('No address'); return; }

    setLoading(true);
    try {
      const denom = sendForm.token === 'DGT' ? DENOM_DGT : DENOM_DRT;
      const amountMicro = toMicro(sendForm.amount);

      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: BECH32 });
      const [acc] = await wallet.getAccounts();

      const client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
        gasPrice: GasPrice.fromString(GAS_PRICE),
      });

      const result = await client.sendTokens(
        acc.address,
        sendForm.to,
        coins(amountMicro, denom),
        'auto',
        'dytallix-wallet'
      );

      if (result.code !== 0) {
        throw new Error(result.rawLog || 'Broadcast failed');
      }

      setTxHistory((h) => [
        { hash: result.transactionHash, type: 'send', amount: `${sendForm.amount} ${sendForm.token}`, to: sendForm.to, timestamp: new Date().toISOString() },
        ...h,
      ]);

      setSendForm({ to: '', amount: '', token: sendForm.token });
      await refreshBalance();
      await refreshTxHistory();
      alert('Transaction broadcasted');
    } catch (err) {
      alert('Transaction failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Wallet {PQC && <span className="ml-2 text-xs px-2 py-1 rounded bg-green-100 text-green-700">PQC: Dilithium3</span>}</h1>

        {/* Wallet Management */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Management</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={generateWallet} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Generate New Wallet</button>
            <div className="flex gap-2">
              <input value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} placeholder="paste 24-word mnemonic" className="flex-1 border rounded px-3 py-2" />
              <button onClick={importWallet} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Import</button>
            </div>
          </div>
          {address && (
            <div className="mt-4">
              <div className="font-mono text-sm bg-gray-100 rounded p-3 break-all">{address}</div>
              <div className="text-xs text-gray-500 mt-1">Prefix: {BECH32} | Chain: {CHAIN_ID}</div>
            </div>
          )}
        </div>
        
        {/* Balances & Send */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Balances */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Token Balances</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">DGT</div>
                  <div>
                    <div className="font-semibold text-gray-900">Dytallix Governance Token</div>
                    <div className="text-sm text-gray-500">Governance & Staking</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-indigo-600">{balances.DGT}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">DRT</div>
                  <div>
                    <div className="font-semibold text-gray-900">Dytallix Reward Token</div>
                    <div className="text-sm text-gray-500">Rewards & Incentives</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">{balances.DRT}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button onClick={() => window.open('/faucet', '_blank')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">Get Testnet Tokens</button>
              <button onClick={refreshBalance} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Refresh Balance</button>
            </div>
          </div>

          {/* Send Tokens */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Send Tokens</h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
                <select value={sendForm.token} onChange={(e) => setSendForm({ ...sendForm, token: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="DGT">DGT - Governance Token</option>
                  <option value="DRT">DRT - Reward Token</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
                <input type="text" value={sendForm.to} onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })} placeholder="dytallix1..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input type="number" step="0.000001" value={sendForm.amount} onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })} placeholder="0.000000" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                <div className="text-sm text-gray-500 mt-1">Available: {sendForm.token === 'DGT' ? balances.DGT : balances.DRT} {sendForm.token}</div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? 'Sending...' : 'Send Transaction'}
              </button>
            </form>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h2>
          {txHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No transactions yet</div>
          ) : (
            <div className="space-y-4">
              {txHistory.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mr-4 ${tx.type === 'send' ? 'bg-red-500' : 'bg-green-500'}`}>{tx.type === 'send' ? '↗' : '↙'}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{tx.type === 'send' ? 'Sent' : 'Received'} {tx.amount}</div>
                      <div className="text-sm text-gray-500">{tx.type === 'send' ? `To: ${tx.to}` : `From: ${tx.from}`}</div>
                      <div className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-blue-600">{tx.hash}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
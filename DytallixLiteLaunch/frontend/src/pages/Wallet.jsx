import React, { useState, useEffect } from 'react';

const Wallet = () => {
  const [address, setAddress] = useState('');
  const [balances, setBalances] = useState({ DGT: '0', DRT: '0' });
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    token: 'DGT'
  });
  const [loading, setLoading] = useState(false);
  const [txHistory, setTxHistory] = useState([]);

  useEffect(() => {
    // Simulate loading wallet data
    setAddress('dytallix1example123456789012345678901234567890');
    setBalances({ DGT: '1.500000', DRT: '0.750000' });
    setTxHistory([
      {
        hash: '0x1234...abcd',
        type: 'receive',
        amount: '1.000000 DGT',
        from: 'Faucet',
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add to transaction history
      const newTx = {
        hash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
        type: 'send',
        amount: `${sendForm.amount} ${sendForm.token}`,
        to: sendForm.to,
        timestamp: new Date().toISOString()
      };
      
      setTxHistory([newTx, ...txHistory]);
      
      // Update balance (simplified)
      const currentBalance = parseFloat(balances[sendForm.token]);
      const sendAmount = parseFloat(sendForm.amount);
      if (currentBalance >= sendAmount) {
        setBalances({
          ...balances,
          [sendForm.token]: (currentBalance - sendAmount).toFixed(6)
        });
      }
      
      setSendForm({ to: '', amount: '', token: 'DGT' });
      alert('Transaction sent successfully!');
    } catch (error) {
      alert('Transaction failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Wallet</h1>
        
        {/* Wallet Address */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Address</h2>
          <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm break-all">
            {address}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Balances */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Token Balances</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    DGT
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Dytallix Governance Token</div>
                    <div className="text-sm text-gray-500">Governance & Staking</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-indigo-600">
                  {balances.DGT}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    DRT
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Dytallix Reward Token</div>
                    <div className="text-sm text-gray-500">Rewards & Incentives</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {balances.DRT}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.open('/faucet', '_blank')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Get Testnet Tokens
              </button>
              <button 
                onClick={() => setBalances({ DGT: '1.500000', DRT: '0.750000' })}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Refresh Balance
              </button>
            </div>
          </div>

          {/* Send Tokens */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Send Tokens</h2>
            
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token
                </label>
                <select
                  value={sendForm.token}
                  onChange={(e) => setSendForm({...sendForm, token: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DGT">DGT - Governance Token</option>
                  <option value="DRT">DRT - Reward Token</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) => setSendForm({...sendForm, to: e.target.value})}
                  placeholder="dytallix1..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({...sendForm, amount: e.target.value})}
                  placeholder="0.000000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <div className="text-sm text-gray-500 mt-1">
                  Available: {balances[sendForm.token]} {sendForm.token}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send Transaction'}
              </button>
            </form>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h2>
          
          {txHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-4">
              {txHistory.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mr-4 ${
                      tx.type === 'send' ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                      {tx.type === 'send' ? '↗' : '↙'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {tx.type === 'send' ? 'Sent' : 'Received'} {tx.amount}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tx.type === 'send' ? `To: ${tx.to}` : `From: ${tx.from}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-blue-600">
                    {tx.hash}
                  </div>
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
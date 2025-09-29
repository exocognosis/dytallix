import React, { useState } from 'react';

const Faucet = () => {
  const [address, setAddress] = useState('');
  const [selectedTokens, setSelectedTokens] = useState(['DGT']);
  const [loading, setLoading] = useState(false);
  const [lastRequest, setLastRequest] = useState(null);

  const handleTokenToggle = (token) => {
    if (selectedTokens.includes(token)) {
      setSelectedTokens(selectedTokens.filter(t => t !== token));
    } else {
      setSelectedTokens([...selectedTokens, token]);
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (selectedTokens.length === 0) {
      alert('Please select at least one token');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8787/dispense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          tokens: selectedTokens
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setLastRequest({
          success: true,
          tokens: data.tokens,
          txHashes: data.transaction_hashes,
          timestamp: data.timestamp
        });
        alert('Tokens dispensed successfully!');
      } else {
        throw new Error(data.error || 'Request failed');
      }
    } catch (error) {
      setLastRequest({
        success: false,
        error: error.message
      });
      alert('Request failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Testnet Faucet
            </h1>
            <p className="text-lg text-gray-600">
              Get free DGT and DRT tokens for testing on Dytallix testnet
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleRequest} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Testnet Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="dytallix1..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Dytallix testnet address (starts with "dytallix1")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Select Tokens to Request
                </label>
                
                <div className="space-y-3">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTokens.includes('DGT') 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTokenToggle('DGT')}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTokens.includes('DGT')}
                        onChange={() => handleTokenToggle('DGT')}
                        className="mr-3 h-4 w-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">DGT - Governance Token</h3>
                            <p className="text-sm text-gray-600">Used for governance and staking</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-indigo-600">1.000000 DGT</div>
                            <div className="text-xs text-gray-500">per request</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTokens.includes('DRT') 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTokenToggle('DRT')}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTokens.includes('DRT')}
                        onChange={() => handleTokenToggle('DRT')}
                        className="mr-3 h-4 w-4 text-green-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">DRT - Reward Token</h3>
                            <p className="text-sm text-gray-600">Used for rewards and incentives</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">0.500000 DRT</div>
                            <div className="text-xs text-gray-500">per request</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || selectedTokens.length === 0}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Requesting Tokens...' : 'Request Tokens'}
              </button>
            </form>

            {/* Rate Limit Info */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Rate Limits</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 1 request per hour per address</li>
                <li>• 10 requests per hour per IP</li>
                <li>• Maximum 50 requests per day</li>
              </ul>
            </div>

            {/* Last Request Result */}
            {lastRequest && (
              <div className={`mt-6 p-4 rounded-lg ${
                lastRequest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  lastRequest.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {lastRequest.success ? 'Request Successful!' : 'Request Failed'}
                </h4>
                
                {lastRequest.success ? (
                  <div className="text-sm text-green-700">
                    <p className="mb-2">Tokens dispensed:</p>
                    <ul className="space-y-1">
                      {lastRequest.tokens.map((token, index) => (
                        <li key={index}>
                          • {token.formatted_amount}
                          <span className="font-mono text-xs ml-2">
                            (tx: {lastRequest.txHashes[index]})
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">
                      Time: {new Date(lastRequest.timestamp).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">{lastRequest.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Don't have a testnet address?</strong> Use the wallet page to generate one or connect your existing wallet.
              </p>
              <p>
                <strong>Tokens not appearing?</strong> Check the explorer or refresh your wallet balance. Testnet transactions may take a few seconds.
              </p>
              <p>
                <strong>Rate limited?</strong> You can request tokens once per hour. If you need more tokens for testing, contact the development team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faucet;
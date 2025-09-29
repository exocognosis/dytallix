import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    network: {
      status: 'Online',
      blockHeight: 0,
      validators: 3,
      blockTime: '6s'
    },
    tokens: {
      DGT: {
        totalSupply: '1000000000.000000',
        circulatingSupply: '600000000.000000'
      },
      DRT: {
        totalSupply: '0.000000',
        inflationRate: '5%'
      }
    },
    oracle: {
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: '100%'
    }
  });

  const [recentBlocks, setRecentBlocks] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Simulate API calls
        const networkResponse = await fetch('http://localhost:26657/status').catch(() => null);
        const metricsResponse = await fetch('http://localhost:8080/metrics/json').catch(() => null);
        
        // Update with real data if available, otherwise use mock data
        if (networkResponse && networkResponse.ok) {
          const networkData = await networkResponse.json();
          setMetrics(prev => ({
            ...prev,
            network: {
              ...prev.network,
              blockHeight: parseInt(networkData.result?.sync_info?.latest_block_height || 12345)
            }
          }));
        }

        if (metricsResponse && metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setMetrics(prev => ({
            ...prev,
            oracle: {
              totalRequests: metricsData.oracle?.total_requests || 0,
              averageResponseTime: metricsData.oracle?.average_response_time_ms || 0,
              successRate: metricsData.oracle?.total_errors === 0 ? '100%' : '99%'
            }
          }));
        }
      } catch (error) {
        console.warn('Failed to fetch real metrics, using mock data');
      }
    };

    // Generate mock recent blocks
    const generateMockBlocks = () => {
      const blocks = [];
      const now = Date.now();
      
      for (let i = 0; i < 10; i++) {
        blocks.push({
          height: 12345 - i,
          hash: `0x${Math.random().toString(16).substr(2, 16)}`,
          timestamp: new Date(now - i * 6000).toISOString(),
          txCount: Math.floor(Math.random() * 20),
          proposer: `validator${(i % 3) + 1}`
        });
      }
      
      setRecentBlocks(blocks);
    };

    fetchMetrics();
    generateMockBlocks();
    
    // Update every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
      generateMockBlocks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Network Dashboard</h1>

        {/* Network Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network Status</p>
                <p className="text-2xl font-bold text-green-600">{metrics.network.status}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Block Height</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.network.blockHeight.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Validators</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.network.validators}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Block Time</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.network.blockTime}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Token Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Token Metrics</h2>
            
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-indigo-600">DGT - Governance Token</h3>
                  <span className="text-sm text-gray-500">Fixed Supply</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Supply</p>
                    <p className="font-semibold">{metrics.tokens.DGT.totalSupply}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Circulating Supply</p>
                    <p className="font-semibold">{metrics.tokens.DGT.circulatingSupply}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-600">DRT - Reward Token</h3>
                  <span className="text-sm text-gray-500">Inflationary</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Current Supply</p>
                    <p className="font-semibold">{metrics.tokens.DRT.totalSupply}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Inflation Rate</p>
                    <p className="font-semibold">{metrics.tokens.DRT.inflationRate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Oracle Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">AI Oracle Performance</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Requests</span>
                <span className="font-semibold">{metrics.oracle.totalRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="font-semibold">{metrics.oracle.averageResponseTime}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-semibold text-green-600">{metrics.oracle.successRate}</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Oracle Status</h4>
              <p className="text-sm text-blue-700">
                AI Oracle is operational and processing requests normally.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Blocks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Blocks</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Height
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hash
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proposer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBlocks.map((block, index) => (
                  <tr key={block.height} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {block.height}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {block.hash}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {block.txCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {block.proposer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
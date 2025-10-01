import React, { useState, useEffect } from 'react';

const NODE_API = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3030';
const SERVER_API = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    network: {
      status: 'Online',
      blockHeight: 0,
      validators: 1,
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
    let ws;

    const fetchMetrics = async () => {
      try {
        const [statusRes, statsRes, metricsRes] = await Promise.all([
          // /status is optional on the Rust node; ignore failures
          fetch(`${NODE_API}/status`).catch(() => null),
          fetch(`${NODE_API}/stats`).catch(() => null),
          fetch(`${SERVER_API}/metrics/json`).catch(() => null),
        ]);

        if (statsRes && statsRes.ok) {
          const stats = await statsRes.json();
          // Stats endpoint returns { success, data }
          const s = stats.data || stats; // tolerate either shape
          setMetrics((prev) => ({
            ...prev,
            network: {
              ...prev.network,
              blockHeight: s.height ?? prev.network.blockHeight,
              validators: s.active_validators ?? prev.network.validators,
            },
          }));
        } else if (statusRes && statusRes.ok) {
          const status = await statusRes.json();
          setMetrics((prev) => ({
            ...prev,
            network: {
              ...prev.network,
              blockHeight: status.latest_height ?? status.height ?? prev.network.blockHeight,
            },
          }));
        }

        if (metricsRes && metricsRes.ok) {
          const m = await metricsRes.json();
          setMetrics((prev) => ({
            ...prev,
            oracle: {
              totalRequests: m.oracle?.total_requests || 0,
              averageResponseTime: m.oracle?.average_response_time_ms || 0,
              successRate: m.oracle?.total_errors === 0 ? '100%' : '99%',
            },
            tokens: m.tokens
              ? {
                  DGT: {
                    totalSupply: m.tokens.DGT?.totalSupply || prev.tokens.DGT.totalSupply,
                    circulatingSupply:
                      m.tokens.DGT?.circulatingSupply || prev.tokens.DGT.circulatingSupply,
                  },
                  DRT: {
                    totalSupply: prev.tokens.DRT.totalSupply,
                    inflationRate:
                      m.tokens.DRT?.inflationRate !== undefined
                        ? `${m.tokens.DRT.inflationRate * 100}%`
                        : prev.tokens.DRT.inflationRate,
                  },
                }
              : prev.tokens,
          }));
        }
      } catch (error) {
        console.warn('Failed to fetch real metrics, using mock data');
      }
    };

    const fetchRecentBlocks = async () => {
      try {
        const res = await fetch(`${NODE_API}/blocks?limit=10`).catch(() => null);
        if (res && res.ok) {
          const body = await res.json();
          // Node returns { success, data: [{ number, hash, timestamp, tx_count }] }
          const rows = body.data || body.blocks || [];
          const blocks = rows.map((b) => ({
            height: b.number ?? b.height,
            hash: b.hash,
            timestamp: (b.timestamp && Number(b.timestamp)) || Date.now(),
            txCount: b.tx_count ?? (Array.isArray(b.txs) ? b.txs.length : 0),
            proposer: 'validator1',
          }));
          setRecentBlocks(blocks);
        }
      } catch (_) {
        // ignore
      }
    };

    const connectWs = () => {
      try {
        ws = new WebSocket(NODE_API.replace('http', 'ws') + '/ws');
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            // Shape: { message_type: 'new_block', data: { number, hash, timestamp, transactions: [] } }
            const type = msg.message_type || msg.type;
            if (type === 'new_block') {
              const d = msg.data || msg;
              setMetrics((prev) => ({
                ...prev,
                network: {
                  ...prev.network,
                  blockHeight: d.number ?? d.height ?? prev.network.blockHeight + 1,
                },
              }));
              setRecentBlocks((prev) => [
                {
                  height: d.number ?? d.height,
                  hash: d.hash,
                  timestamp: (d.timestamp && Number(d.timestamp)) || Date.now(),
                  txCount: Array.isArray(d.transactions) ? d.transactions.length : 0,
                  proposer: 'validator1',
                },
                ...prev.slice(0, 9),
              ]);
            }
          } catch (_) {}
        };
        ws.onerror = () => {};
      } catch (_) {}
    };

    fetchMetrics();
    fetchRecentBlocks();
    connectWs();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchRecentBlocks();
    }, Number(import.meta.env.VITE_METRICS_REFRESH_INTERVAL) || 30000);

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
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
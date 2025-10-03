import React, { useState } from 'react';

const API = import.meta.env.VITE_EXPLORER_API_URL || 'http://localhost:3000/api';

const Explorer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('block');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      if (searchType === 'block') {
        const r = await fetch(`${API}/blocks?limit=20`);
        const data = await r.json();
        setResults({ type: 'blocks', data: data.data || [] });
      } else if (searchType === 'tx') {
        const r = await fetch(`${API}/transactions/${encodeURIComponent(searchTerm)}`);
        const data = await r.json();
        setResults({ type: 'tx', data: data.data });
      } else if (searchType === 'address') {
        const r = await fetch(`${API}/transactions?limit=50`);
        const data = await r.json();
        const filtered = (data.data || []).filter((t) => t.from === searchTerm || t.to === searchTerm);
        setResults({ type: 'txs', data: filtered });
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Blockchain Explorer</h1>
        
        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="block">Block</option>
              <option value="tx">Transaction</option>
              <option value="address">Address</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search by ${searchType}...`}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {error && <div className="text-red-600 mt-3">{error}</div>}
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {!results && (
            <div className="text-center text-gray-600">Use the search above to query blocks or transactions.</div>
          )}
          {results?.type === 'blocks' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Height</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Txs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.data.map((b) => (
                    <tr key={b.height}>
                      <td className="px-6 py-4 text-blue-600">{b.height}</td>
                      <td className="px-6 py-4 font-mono text-gray-600">{b.hash}</td>
                      <td className="px-6 py-4 text-gray-600">{b.tx_count}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(b.time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results?.type === 'tx' && results.data && (
            <div className="space-y-2">
              <div className="font-mono text-blue-700">Hash: {results.data.hash}</div>
              <div>Status: {results.data.status}</div>
              <div>Height: {results.data.height}</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{results.data.raw}</pre>
            </div>
          )}
          {results?.type === 'txs' && (
            <ul className="list-disc pl-5">
              {results.data.map((t) => (
                <li key={t.hash} className="font-mono text-gray-700">{t.hash} @ {t.height}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explorer;
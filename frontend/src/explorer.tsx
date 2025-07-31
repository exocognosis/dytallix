// Dytallix Blockchain Explorer UI (React/TypeScript)
// Block, transaction, and address lookup
import React, { useState, useEffect } from 'react';

interface BlockInfo {
  hash: string;
  height: number;
  timestamp: number;
  transactions: string[];
  previous_hash: string;
  merkle_root: string;
  difficulty: number;
  nonce: number;
  size: number;
}

interface TransactionInfo {
  hash: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: number;
  block_hash: string;
  block_height: number;
  signature: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmations: number;
}

interface AddressInfo {
  address: string;
  balance: number;
  transaction_count: number;
  first_seen: number;
  last_activity: number;
  recent_transactions: string[];
}

interface SearchResult {
  type: 'block' | 'transaction' | 'address' | 'error';
  data: BlockInfo | TransactionInfo | AddressInfo | null;
  error?: string;
}

interface ExplorerState {
  query: string;
  result: SearchResult | null;
  isLoading: boolean;
  error: string | null;
  recentSearches: string[];
  stats: {
    latest_block: number;
    total_transactions: number;
    network_hashrate: string;
    avg_block_time: string;
  } | null;
}

export const Explorer: React.FC = () => {
  const [state, setState] = useState<ExplorerState>({
    query: '',
    result: null,
    isLoading: false,
    error: null,
    recentSearches: [],
    stats: null,
  });

  const updateState = (updates: Partial<ExplorerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const setError = (error: string | null) => {
    updateState({ error, isLoading: false });
  };

  const setLoading = (isLoading: boolean) => {
    updateState({ isLoading, error: null });
  };

  // Load network stats on component mount
  useEffect(() => {
    loadNetworkStats();
  }, []);

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
      const response = await fetch(`/api/explorer${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  };

  const loadNetworkStats = async () => {
    try {
      const stats = await apiCall('/stats');
      updateState({ stats });
    } catch (error) {
      console.error('Failed to load network stats:', error);
      // Don't show error for stats loading failure
    }
  };

  const detectQueryType = (query: string): 'block' | 'transaction' | 'address' => {
    const trimmedQuery = query.trim();
    
    // Address: starts with 'dyt1' and is 52 characters
    if (trimmedQuery.startsWith('dyt1') && trimmedQuery.length === 52) {
      return 'address';
    }
    
    // Block hash or transaction hash: 64 character hex string
    if (/^[a-fA-F0-9]{64}$/.test(trimmedQuery)) {
      // Try to determine if it's a block or transaction
      // For now, we'll try both and see which one works
      return 'transaction'; // Default to transaction, will fallback to block
    }
    
    // Block height: numeric
    if (/^\d+$/.test(trimmedQuery)) {
      return 'block';
    }
    
    // Default to transaction
    return 'transaction';
  };

  const searchBlockchain = async (query: string, type: 'block' | 'transaction' | 'address') => {
    try {
      let data;
      
      switch (type) {
        case 'block':
          data = await apiCall(`/block/${encodeURIComponent(query)}`);
          return { type: 'block' as const, data };
          
        case 'transaction':
          try {
            data = await apiCall(`/transaction/${encodeURIComponent(query)}`);
            return { type: 'transaction' as const, data };
          } catch (error) {
            // If transaction lookup fails and query looks like a hash, try block
            if (/^[a-fA-F0-9]{64}$/.test(query)) {
              data = await apiCall(`/block/${encodeURIComponent(query)}`);
              return { type: 'block' as const, data };
            }
            throw error;
          }
          
        case 'address':
          data = await apiCall(`/address/${encodeURIComponent(query)}`);
          return { type: 'address' as const, data };
          
        default:
          throw new Error('Unknown query type');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSearch = async () => {
    const trimmedQuery = state.query.trim();
    
    if (!trimmedQuery) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);

    try {
      // Detect query type
      const queryType = detectQueryType(trimmedQuery);
      
      // Search blockchain
      const result = await searchBlockchain(trimmedQuery, queryType);
      
      // Add to recent searches
      const newRecentSearches = [trimmedQuery, ...state.recentSearches.filter(s => s !== trimmedQuery)].slice(0, 5);
      
      updateState({ 
        result, 
        isLoading: false,
        recentSearches: newRecentSearches
      });
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAmount = (amount: number) => {
    return (amount / 1e8).toFixed(8); // Assuming 8 decimal places
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderSearchResult = () => {
    if (!state.result) return null;

    const { type, data, error } = state.result;

    if (error) {
      return (
        <div style={{ color: 'red', padding: '20px', border: '1px solid #red', borderRadius: '8px' }}>
          <h3>Search Error</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (!data) return null;

    switch (type) {
      case 'block':
        const blockData = data as BlockInfo;
        return (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Block Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px', fontFamily: 'monospace' }}>
              <div><strong>Hash:</strong></div>
              <div onClick={() => copyToClipboard(blockData.hash)} style={{ cursor: 'pointer' }}>
                {blockData.hash}
              </div>
              
              <div><strong>Height:</strong></div>
              <div>{blockData.height}</div>
              
              <div><strong>Timestamp:</strong></div>
              <div>{formatTimestamp(blockData.timestamp)}</div>
              
              <div><strong>Transactions:</strong></div>
              <div>{blockData.transactions.length}</div>
              
              <div><strong>Previous Hash:</strong></div>
              <div onClick={() => copyToClipboard(blockData.previous_hash)} style={{ cursor: 'pointer' }}>
                {formatHash(blockData.previous_hash)}
              </div>
              
              <div><strong>Merkle Root:</strong></div>
              <div>{formatHash(blockData.merkle_root)}</div>
              
              <div><strong>Difficulty:</strong></div>
              <div>{blockData.difficulty}</div>
              
              <div><strong>Size:</strong></div>
              <div>{blockData.size} bytes</div>
            </div>
            
            {blockData.transactions.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4>Transactions:</h4>
                {blockData.transactions.map((txHash, index) => (
                  <div key={index} style={{ padding: '5px', fontFamily: 'monospace' }}>
                    <span 
                      onClick={() => updateState({ query: txHash })}
                      style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                    >
                      {formatHash(txHash)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'transaction':
        const txData = data as TransactionInfo;
        return (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Transaction Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px', fontFamily: 'monospace' }}>
              <div><strong>Hash:</strong></div>
              <div onClick={() => copyToClipboard(txData.hash)} style={{ cursor: 'pointer' }}>
                {txData.hash}
              </div>
              
              <div><strong>From:</strong></div>
              <div onClick={() => copyToClipboard(txData.from)} style={{ cursor: 'pointer' }}>
                {txData.from}
              </div>
              
              <div><strong>To:</strong></div>
              <div onClick={() => copyToClipboard(txData.to)} style={{ cursor: 'pointer' }}>
                {txData.to}
              </div>
              
              <div><strong>Amount:</strong></div>
              <div>{formatAmount(txData.amount)} DYT</div>
              
              <div><strong>Fee:</strong></div>
              <div>{formatAmount(txData.fee)} DYT</div>
              
              <div><strong>Status:</strong></div>
              <div style={{ 
                color: txData.status === 'confirmed' ? 'green' : 
                       txData.status === 'pending' ? 'orange' : 'red' 
              }}>
                {txData.status.toUpperCase()}
              </div>
              
              <div><strong>Confirmations:</strong></div>
              <div>{txData.confirmations}</div>
              
              <div><strong>Block Height:</strong></div>
              <div>
                <span 
                  onClick={() => updateState({ query: txData.block_height.toString() })}
                  style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                >
                  {txData.block_height}
                </span>
              </div>
              
              <div><strong>Timestamp:</strong></div>
              <div>{formatTimestamp(txData.timestamp)}</div>
            </div>
          </div>
        );

      case 'address':
        const addrData = data as AddressInfo;
        return (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Address Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px', fontFamily: 'monospace' }}>
              <div><strong>Address:</strong></div>
              <div onClick={() => copyToClipboard(addrData.address)} style={{ cursor: 'pointer' }}>
                {addrData.address}
              </div>
              
              <div><strong>Balance:</strong></div>
              <div>{formatAmount(addrData.balance)} DYT</div>
              
              <div><strong>Transactions:</strong></div>
              <div>{addrData.transaction_count}</div>
              
              <div><strong>First Seen:</strong></div>
              <div>{formatTimestamp(addrData.first_seen)}</div>
              
              <div><strong>Last Activity:</strong></div>
              <div>{formatTimestamp(addrData.last_activity)}</div>
            </div>
            
            {addrData.recent_transactions.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4>Recent Transactions:</h4>
                {addrData.recent_transactions.map((txHash, index) => (
                  <div key={index} style={{ padding: '5px', fontFamily: 'monospace' }}>
                    <span 
                      onClick={() => updateState({ query: txHash })}
                      style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                    >
                      {formatHash(txHash)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h2>Dytallix Blockchain Explorer</h2>
      
      {/* Network Stats */}
      {state.stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {state.stats.latest_block.toLocaleString()}
            </div>
            <div>Latest Block</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {state.stats.total_transactions.toLocaleString()}
            </div>
            <div>Total Transactions</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              {state.stats.network_hashrate}
            </div>
            <div>Network Hashrate</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>
              {state.stats.avg_block_time}
            </div>
            <div>Avg Block Time</div>
          </div>
        </div>
      )}

      {/* Search Interface */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            value={state.query} 
            onChange={e => updateState({ query: e.target.value })}
            onKeyPress={handleKeyPress}
            placeholder="Enter block hash, transaction hash, address, or block height"
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <button 
            onClick={handleSearch}
            disabled={state.isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: state.isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {state.isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Recent Searches */}
        {state.recentSearches.length > 0 && (
          <div>
            <span style={{ marginRight: '10px' }}>Recent:</span>
            {state.recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => updateState({ query: search })}
                style={{
                  marginRight: '5px',
                  padding: '5px 10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {formatHash(search)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Loading Indicator */}
      {state.isLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#6c757d' 
        }}>
          <div>Searching blockchain...</div>
        </div>
      )}

      {/* Search Results */}
      {renderSearchResult()}

      {/* Help Section */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>Search Help</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Block Search:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Block height (e.g., 12345)</li>
              <li>Block hash (64 character hex)</li>
            </ul>
          </div>
          <div>
            <strong>Transaction Search:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Transaction hash (64 character hex)</li>
            </ul>
          </div>
          <div>
            <strong>Address Search:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Dytallix address (starts with dyt1)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

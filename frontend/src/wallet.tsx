// Dytallix Wallet UI (React/TypeScript)
// PQC keygen, sign, verify, and address display
import React, { useState, useEffect } from 'react';

interface KeyPair {
  name: string;
  algorithm: string;
  address: string;
  public_key: string;
  created_at: number;
}

interface WalletState {
  keys: KeyPair[];
  selectedKey: string;
  address: string;
  isLoading: boolean;
  error: string | null;
  message: string;
  signature: string | null;
}

interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const Wallet: React.FC = () => {
  const [state, setState] = useState<WalletState>({
    keys: [],
    selectedKey: '',
    address: '',
    isLoading: false,
    error: null,
    message: '',
    signature: null,
  });

  // Load existing keys on component mount
  useEffect(() => {
    loadKeys();
  }, []);

  const updateState = (updates: Partial<WalletState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const setError = (error: string | null) => {
    updateState({ error, isLoading: false });
  };

  const setLoading = (isLoading: boolean) => {
    updateState({ isLoading, error: null });
  };

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<APIResponse> => {
    try {
      const response = await fetch(`/api/wallet${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  const loadKeys = async () => {
    setLoading(true);
    const result = await apiCall('/keys');
    
    if (result.success && result.data) {
      const keys = Object.entries(result.data).map(([name, info]: [string, any]) => ({
        name,
        algorithm: info.algorithm,
        address: info.address,
        public_key: info.public_key,
        created_at: info.created_at,
      }));
      updateState({ keys, isLoading: false });
      
      // Auto-select first key if available
      if (keys.length > 0 && !state.selectedKey) {
        updateState({ selectedKey: keys[0].name, address: keys[0].address });
      }
    } else {
      setError(result.error || 'Failed to load keys');
    }
  };

  const handleKeygen = async () => {
    setLoading(true);
    
    // Generate a unique key name
    const keyName = `key_${Date.now()}`;
    const algorithm = 'dilithium'; // Default algorithm
    
    const result = await apiCall('/keygen', {
      method: 'POST',
      body: JSON.stringify({ name: keyName, algorithm }),
    });

    if (result.success) {
      updateState({ 
        address: result.data.address,
        selectedKey: keyName,
        isLoading: false 
      });
      
      // Reload keys to update the list
      await loadKeys();
    } else {
      setError(result.error || 'Failed to generate keypair');
    }
  };

  const handleSign = async () => {
    if (!state.message.trim()) {
      setError('Please enter a message to sign');
      return;
    }

    if (!state.selectedKey) {
      setError('Please select or generate a key first');
      return;
    }

    setLoading(true);

    const result = await apiCall('/sign', {
      method: 'POST',
      body: JSON.stringify({
        key: state.selectedKey,
        message: state.message,
      }),
    });

    if (result.success) {
      updateState({ 
        signature: result.data.signature,
        isLoading: false 
      });
    } else {
      setError(result.error || 'Failed to sign message');
    }
  };

  const handleVerify = async () => {
    if (!state.signature) {
      setError('No signature to verify');
      return;
    }

    setLoading(true);

    const result = await apiCall('/verify', {
      method: 'POST',
      body: JSON.stringify({
        message: state.message,
        signature: state.signature,
        address: state.address,
      }),
    });

    if (result.success) {
      updateState({ isLoading: false });
      alert(result.data.valid ? 'Signature is valid!' : 'Signature is invalid!');
    } else {
      setError(result.error || 'Failed to verify signature');
    }
  };

  const handleKeySelect = (keyName: string) => {
    const selectedKeyData = state.keys.find(key => key.name === keyName);
    if (selectedKeyData) {
      updateState({
        selectedKey: keyName,
        address: selectedKeyData.address,
        signature: null, // Clear previous signature
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show temporary feedback
      const originalText = text;
      setTimeout(() => {
        // Could implement a toast notification here
      }, 1000);
    });
  };

  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatPublicKey = (publicKey: string) => {
    if (publicKey.length <= 32) return publicKey;
    return `${publicKey.slice(0, 16)}...${publicKey.slice(-16)}`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Dytallix Post-Quantum Wallet</h2>
      
      {/* Error Display */}
      {state.error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          Error: {state.error}
        </div>
      )}

      {/* Loading Indicator */}
      {state.isLoading && (
        <div style={{ 
          color: 'blue', 
          backgroundColor: '#e6f3ff', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          Loading...
        </div>
      )}

      {/* Key Management Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Key Management</h3>
        
        <button 
          onClick={handleKeygen}
          disabled={state.isLoading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: state.isLoading ? 'not-allowed' : 'pointer',
            marginBottom: '15px'
          }}
        >
          Generate New PQC Keypair
        </button>

        {/* Key Selector */}
        {state.keys.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <label>Select Key: </label>
            <select 
              value={state.selectedKey} 
              onChange={(e) => handleKeySelect(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="">-- Select a key --</option>
              {state.keys.map(key => (
                <option key={key.name} value={key.name}>
                  {key.name} ({key.algorithm}) - {formatAddress(key.address)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current Address Display */}
        {state.address && (
          <div style={{ marginTop: '15px' }}>
            <strong>Current Address: </strong>
            <span 
              style={{ 
                fontFamily: 'monospace', 
                backgroundColor: '#f5f5f5', 
                padding: '5px',
                cursor: 'pointer'
              }}
              onClick={() => copyToClipboard(state.address)}
              title="Click to copy"
            >
              {state.address}
            </span>
          </div>
        )}

        {/* Keys List */}
        {state.keys.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4>Available Keys:</h4>
            {state.keys.map(key => (
              <div 
                key={key.name} 
                style={{ 
                  padding: '10px', 
                  border: '1px solid #eee', 
                  borderRadius: '4px', 
                  marginBottom: '10px',
                  backgroundColor: key.name === state.selectedKey ? '#e6f3ff' : 'white'
                }}
              >
                <div><strong>Name:</strong> {key.name}</div>
                <div><strong>Algorithm:</strong> {key.algorithm}</div>
                <div><strong>Address:</strong> <span style={{ fontFamily: 'monospace' }}>{key.address}</span></div>
                <div><strong>Public Key:</strong> <span style={{ fontFamily: 'monospace' }}>{formatPublicKey(key.public_key)}</span></div>
                <div><strong>Created:</strong> {new Date(key.created_at * 1000).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signing Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Message Signing & Verification</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Message to Sign:</label>
          <textarea
            value={state.message}
            onChange={(e) => updateState({ message: e.target.value })}
            placeholder="Enter message to sign..."
            style={{
              width: '100%',
              height: '80px',
              margin: '10px 0',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={handleSign}
            disabled={state.isLoading || !state.selectedKey}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: (state.isLoading || !state.selectedKey) ? 'not-allowed' : 'pointer',
              marginRight: '10px'
            }}
          >
            Sign Message
          </button>

          <button 
            onClick={handleVerify}
            disabled={state.isLoading || !state.signature}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '4px',
              cursor: (state.isLoading || !state.signature) ? 'not-allowed' : 'pointer'
            }}
          >
            Verify Signature
          </button>
        </div>

        {/* Signature Display */}
        {state.signature && (
          <div style={{ marginTop: '15px' }}>
            <label><strong>Signature:</strong></label>
            <textarea
              value={state.signature}
              readOnly
              style={{
                width: '100%',
                height: '100px',
                margin: '10px 0',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px',
                backgroundColor: '#f8f9fa'
              }}
            />
            <button
              onClick={() => copyToClipboard(state.signature || '')}
              style={{
                padding: '5px 10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Copy Signature
            </button>
          </div>
        )}
      </div>

      {/* Status Information */}
      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>Status</h4>
        <div>Keys Available: {state.keys.length}</div>
        <div>Selected Key: {state.selectedKey || 'None'}</div>
        <div>Current Address: {state.address ? formatAddress(state.address) : 'None'}</div>
        <div>Signature Status: {state.signature ? 'Available' : 'None'}</div>
      </div>
    </div>
  );
};

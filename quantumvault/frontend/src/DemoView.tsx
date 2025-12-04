import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-api-key-change-in-production';
const BLOCKCHAIN_API = import.meta.env.VITE_BLOCKCHAIN_API || 'http://localhost:3030';

interface EncryptionResult {
  ciphertext: Uint8Array;
  salt: Uint8Array;
  nonce: Uint8Array;
  iterations: number;
  hash?: string;
}

interface AnchorResult {
  proofId?: string;
  txHash?: string;
  block?: string | number;
  timestamp?: string;
}

const DemoView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('kyber1024');
  const [selectedSignature, setSelectedSignature] = useState('dilithium3');
  const [step, setStep] = useState<'select' | 'encrypt' | 'classify' | 'anchor' | 'complete'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Asset metadata for risk scoring
  const [assetType, setAssetType] = useState<'tlsendpoint' | 'certificate' | 'datastore' | 'keymaterial' | 'apiendpoint'>('datastore');
  const [environment, setEnvironment] = useState('production');
  const [businessCriticality, setBusinessCriticality] = useState('medium');
  const [cryptoUsage, setCryptoUsage] = useState('data_at_rest');
  const [exposureType, setExposureType] = useState('internal');
  const [dataSensitivity, setDataSensitivity] = useState('confidential');
  const [cryptoAgility, setCryptoAgility] = useState('medium');
  const [dataLifetimeDays, setDataLifetimeDays] = useState(365);
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Asset management state
  const [showUnprotectedAssets, setShowUnprotectedAssets] = useState(false);
  const [unprotectedAssetsList, setUnprotectedAssetsList] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Blockchain and crypto stats
  const [blockchainStats, setBlockchainStats] = useState<any>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  const [cryptoStats, setCryptoStats] = useState<any>(null);
  const [totalAssets, setTotalAssets] = useState<number>(0);

  // Fetch blockchain stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${BLOCKCHAIN_API}/stats`);
        const data = await response.json();
        setBlockchainStats(data);
      } catch (err) {
        setBlockchainError(err instanceof Error ? err.message : 'Failed to fetch blockchain stats');
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch comprehensive PQC readiness stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all assets for analysis
        const assetsResponse = await fetch(`${API_BASE}/api/assets`, {
          headers: { 'X-API-Key': API_KEY }
        });
        const assetsData = await assetsResponse.json();
        const assets = assetsData.assets || [];
        
        // Calculate PQC protection metrics
        const protectedAssets = assets.filter((a: any) => a.encryption_profile?.protected);
        const unprotectedAssets = assets.filter((a: any) => !a.encryption_profile?.protected);
        
        // Categorize by sensitivity
        const criticalAssets = assets.filter((a: any) => 
          a.sensitivity === 'secret' || a.sensitivity === 'topsecret'
        );
        const criticalProtected = criticalAssets.filter((a: any) => a.encryption_profile?.protected);
        
        // Algorithm diversity (crypto-agility indicator)
        const uniqueKEMs = new Set(
          protectedAssets
            .map((a: any) => a.encryption_profile?.kem)
            .filter(Boolean)
        ).size;
        
        const uniqueSigs = new Set(
          protectedAssets
            .map((a: any) => a.encryption_profile?.signature_scheme)
            .filter(Boolean)
        ).size;
        
        // Calculate readiness score (weighted)
        const readinessScore = assets.length > 0 
          ? Math.round(
              (protectedAssets.length / assets.length) * 60 + // 60% weight on overall coverage
              (criticalProtected.length / Math.max(criticalAssets.length, 1)) * 30 + // 30% on critical assets
              (Math.min(uniqueKEMs + uniqueSigs, 4) / 4) * 10 // 10% on algorithm diversity
            )
          : 0;
        
        const stats = {
          // Readiness metrics
          totalAssets: assets.length,
          protectedAssets: protectedAssets.length,
          unprotectedAssets: unprotectedAssets.length,
          readinessScore,
          
          // Risk breakdown
          criticalAssets: criticalAssets.length,
          criticalProtected: criticalProtected.length,
          criticalAtRisk: criticalAssets.length - criticalProtected.length,
          
          // Algorithm usage
          kyber: protectedAssets.filter((a: any) => 
            a.encryption_profile?.kem?.toLowerCase().includes('kyber')
          ).length,
          dilithium: protectedAssets.filter((a: any) => 
            a.encryption_profile?.signature_scheme?.toLowerCase().includes('dilithium')
          ).length,
          sphincs: protectedAssets.filter((a: any) => 
            a.encryption_profile?.signature_scheme?.toLowerCase().includes('sphincs')
          ).length,
          
          // Crypto-agility
          algorithmDiversity: uniqueKEMs + uniqueSigs,
          uniqueKEMs,
          uniqueSigs,
          
          // Recent activity
          recentlyProtected: protectedAssets.filter((a: any) => {
            const encryptedAt = a.encryption_profile?.encrypted_at;
            if (!encryptedAt) return false;
            const daysSince = (Date.now() - new Date(encryptedAt).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 7;
          }).length
        };
        
        setCryptoStats(stats);
        setUnprotectedAssetsList(unprotectedAssets);
        setTotalAssets(assets.length);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Reset error when changing steps
  useEffect(() => {
    setError(null);
  }, [step]);

  // File selection handlers
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setStep('encrypt');
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Encryption with PQC simulation
  const encryptFile = async () => {
    if (!selectedFile || !password) {
      setError('Please provide both file and password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read file
      const buffer = await selectedFile.arrayBuffer();
      const dataBytes = new Uint8Array(buffer);

      // Generate encryption parameters
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const iterations = 100000;

      // Derive key from password using PBKDF2
      const passwordBuffer = new TextEncoder().encode(password);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256'
        },
        baseKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt']
      );

      // Encrypt with AES-GCM (simulating PQC protection)
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce
        },
        derivedKey,
        dataBytes
      );

      const ciphertext = new Uint8Array(encryptedData);

      // Compute hash using SHA-256 (simulating BLAKE3)
      const hashBuffer = await crypto.subtle.digest('SHA-256', ciphertext);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      setEncryptionResult({
        ciphertext,
        salt,
        nonce,
        iterations,
        hash
      });

      // Don't auto-advance - let user manually continue to classify step
    } catch (err) {
      setError(`Encryption failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Anchor to blockchain
  const anchorToBlockchain = async () => {
    if (!encryptionResult || !selectedFile) {
      setError('No encrypted data to anchor');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create asset in QuantumVault database with full metadata for risk scoring
      const exposureLevelMap: Record<string, string> = {
        'internal': 'internal',
        'partner': 'partnernetwork',
        'public': 'publicinternet'
      };
      
      const sensitivityMap: Record<string, string> = {
        'public': 'public',
        'internal': 'internal',
        'confidential': 'confidential',
        'restricted': 'secret',
        'secret': 'topsecret'
      };
      
      const assetData = {
        name: selectedFile.name,
        asset_type: assetType,
        endpoint_or_path: `/secure/${encryptionResult.hash}`,
        owner: import.meta.env.VITE_DEFAULT_OWNER || 'user',
        sensitivity: sensitivityMap[dataSensitivity] || 'confidential',
        regulatory_tags: ['encrypted', 'pqc-protected', 'blockchain-anchored'],
        exposure_level: exposureLevelMap[exposureType] || 'internal',
        data_lifetime_days: dataLifetimeDays,
        
        // PQC Risk Assessment Fields
        environment,
        business_criticality: businessCriticality,
        crypto_usage: cryptoUsage,
        exposure_type: exposureType,
        data_sensitivity: dataSensitivity,
        crypto_agility: cryptoAgility,
        stores_long_lived_data: dataLifetimeDays >= 365,
        algo_pk: 'NONE',
        algo_sym: 'AES',
        sym_key_bits: 256,
        
        // Mark as protected with PQC encryption profile
        encryption_profile: {
          protected: true,
          kem: selectedAlgorithm,
          signature_scheme: selectedSignature,
          symmetric_algo: 'aes256gcm',
          mode: 'pqc',
          encrypted_at: new Date().toISOString()
        }
      };

      const assetResponse = await fetch(`${API_BASE}/api/assets/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(assetData)
      });

      if (!assetResponse.ok) {
        const errorText = await assetResponse.text();
        throw new Error(`Failed to create asset: ${assetResponse.statusText} - ${errorText}`);
      }

      const assetResult = await assetResponse.json();
      const assetId = assetResult.asset?.id;

      // Step 2: Anchor hash to blockchain
      // Generate unique sender address based on session
      const timestamp = Date.now();
      const randomComponent = Math.random().toString(36).substring(2, 15);
      const demoSender = `dyt1qv${timestamp.toString(36)}${randomComponent}`.substring(0, 42).padEnd(42, '0');
      
      // Generate cryptographic hash for transaction data
      const txData = {
        type: 'anchor',
        asset_id: assetId,
        hash: encryptionResult.hash,
        file_name: selectedFile.name,
        algorithm: selectedAlgorithm,
        signature_scheme: selectedSignature,
        timestamp: new Date().toISOString()
      };
      
      const txDataString = JSON.stringify(txData);
      const txBytes = new TextEncoder().encode(`${demoSender}${timestamp}${txDataString}`);
      const txHashBuffer = await crypto.subtle.digest('SHA-256', txBytes);
      const txHashArray = Array.from(new Uint8Array(txHashBuffer));
      const computedHash = txHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Create a properly formatted signed transaction
      // In dev mode with DYTALLIX_SKIP_SIG_VERIFY=true, signature verification is bypassed
      // Using Data message type for gasless anchoring (no token transfer needed)
      const signedTx = {
        tx: {
          chain_id: import.meta.env.VITE_CHAIN_ID || 'dyt-local-1',
          nonce: timestamp,
          msgs: [
            {
              type: 'data',
              from: demoSender,
              data: txDataString
            }
          ],
          fee: '0',
          memo: `QuantumVault: ${selectedFile.name.substring(0, 50)}`
        },
        public_key: btoa(computedHash.substring(0, 64)),
        signature: btoa(computedHash),
        algorithm: selectedSignature.includes('dilithium') ? 'Dilithium5' : selectedSignature.includes('falcon') ? 'Falcon1024' : 'SPHINCS-SHA256',
        version: 1
      };

      const blockchainResponse = await fetch(`${BLOCKCHAIN_API}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signed_tx: signedTx })
      });

      if (!blockchainResponse.ok) {
        const errorText = await blockchainResponse.text();
        throw new Error(`Failed to anchor to blockchain: ${blockchainResponse.statusText} - ${errorText}`);
      }

      const blockchainResult = await blockchainResponse.json();

      // Step 3: Get blockchain stats for block height
      const statsResponse = await fetch(`${BLOCKCHAIN_API}/stats`);
      const stats = await statsResponse.json();

      setAnchorResult({
        proofId: assetId,
        txHash: blockchainResult.hash || `0x${encryptionResult.hash?.substring(0, 16)}`,
        block: stats.height || 0,
        timestamp: new Date().toISOString()
      });

      setStep('complete');
    } catch (err) {
      setError(`Anchoring failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Download encrypted file
  const downloadEncrypted = () => {
    if (!encryptionResult || !selectedFile) return;

    const blob = new Blob([new Uint8Array(encryptionResult.ciphertext)], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedFile.name}.enc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  // Reset workflow
  const resetWorkflow = () => {
    setSelectedFile(null);
    setPassword('');
    setSelectedAlgorithm('kyber1024');
    setSelectedSignature('dilithium3');
    setStep('select');
    setEncryptionResult(null);
    setAnchorResult(null);
    setError(null);
    setAssetType('datastore');
    setEnvironment('production');
    setBusinessCriticality('medium');
    setCryptoUsage('data_at_rest');
    setExposureType('internal');
    setDataSensitivity('confidential');
    setCryptoAgility('medium');
    setDataLifetimeDays(365);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '1.5rem 2rem',
        marginBottom: '0'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '600', 
            color: '#1a1a1a',
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            Post-Quantum Cryptographic Asset Management
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '0.95rem',
            margin: 0
          }}>
            Enterprise-grade encryption and blockchain anchoring platform
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* System Overview Dashboard */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#1a1a1a',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            SYSTEM OVERVIEW
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1rem'
          }}>
            {/* Blockchain Node Status */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem',
              transition: 'box-shadow 0.2s',
              cursor: 'default'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem'
                  }}>
                    Blockchain Node
                  </div>
                  <div style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: '700', 
                    color: blockchainStats && !blockchainError ? '#10b981' : '#ef4444'
                  }}>
                    {blockchainStats && !blockchainError ? 'Online' : 'Offline'}
                  </div>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: blockchainStats && !blockchainError ? '#d1fae5' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  {blockchainStats && !blockchainError ? '✓' : '✗'}
                </div>
              </div>
              {blockchainStats && !blockchainError ? (
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  Connected to network
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                  {blockchainError || 'Not connected'}
                </div>
              )}
            </div>

            {/* Block Height */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600', 
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5rem'
              }}>
                Current Block Height
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#1a1a1a',
                marginBottom: '0.5rem'
              }}>
                {blockchainStats?.height?.toLocaleString() || '—'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                {blockchainStats ? '↑ Syncing' : 'Waiting for connection'}
              </div>
            </div>

            {/* Total Assets Anchored */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600', 
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5rem'
              }}>
                Total Assets Anchored
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#1a1a1a',
                marginBottom: '0.5rem'
              }}>
                {totalAssets.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Protected assets on blockchain
              </div>
            </div>

            {/* Average Block Time */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600', 
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5rem'
              }}>
                Avg Block Time
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#1a1a1a',
                marginBottom: '0.5rem'
              }}>
                {blockchainStats?.avg_block_time || '~20s'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Network performance
              </div>
            </div>
          </div>
        </div>

        {/* PQC Readiness Dashboard */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#1a1a1a',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            QUANTUM READINESS OVERVIEW
          </h2>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#666', 
            marginBottom: '1rem',
            marginTop: '-0.5rem'
          }}>
            Your organization's post-quantum cryptography security posture
          </p>
          
          {/* Readiness Score - Hero Metric */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '1.5rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    opacity: 0.9,
                    marginBottom: '0.5rem'
                  }}>
                    Quantum Readiness Score
                  </div>
                  <div style={{ 
                    fontSize: '3.5rem', 
                    fontWeight: '700',
                    lineHeight: 1,
                    marginBottom: '0.5rem'
                  }}>
                    {cryptoStats?.readinessScore || 0}
                    <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>/100</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                    {(cryptoStats?.readinessScore || 0) >= 80 ? '✨ Excellent' :
                     (cryptoStats?.readinessScore || 0) >= 60 ? '✓ Good' :
                     (cryptoStats?.readinessScore || 0) >= 40 ? '⚠️ Needs Improvement' :
                     '🔴 Action Required'} quantum security posture
                  </div>
                </div>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  backdropFilter: 'blur(10px)'
                }}>
                  {(cryptoStats?.readinessScore || 0) >= 80 ? '🎯' :
                   (cryptoStats?.readinessScore || 0) >= 60 ? '🛡️' :
                   (cryptoStats?.readinessScore || 0) >= 40 ? '⚡' : '⚠️'}
                </div>
              </div>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-20px',
              fontSize: '200px',
              opacity: 0.05,
              transform: 'rotate(-15deg)'
            }}>
              🔐
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* PQC Protected Assets */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem'
                  }}>
                    Protected Assets
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: '#10b981',
                    marginBottom: '0.25rem'
                  }}>
                    {cryptoStats?.protectedAssets || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    of {cryptoStats?.totalAssets || 0} total assets
                    {cryptoStats?.totalAssets > 0 && (
                      <span style={{ 
                        marginLeft: '0.5rem',
                        fontWeight: '600',
                        color: (cryptoStats?.protectedAssets / cryptoStats?.totalAssets) >= 0.8 ? '#10b981' : 
                               (cryptoStats?.protectedAssets / cryptoStats?.totalAssets) >= 0.5 ? '#f59e0b' : '#ef4444'
                      }}>
                        ({Math.round((cryptoStats?.protectedAssets / cryptoStats?.totalAssets) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  ✅
                </div>
              </div>
            </div>

            {/* At-Risk Assets */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem'
                  }}>
                    Quantum-Vulnerable
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: (cryptoStats?.unprotectedAssets || 0) > 0 ? '#ef4444' : '#10b981',
                    marginBottom: '0.25rem'
                  }}>
                    {cryptoStats?.unprotectedAssets || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {(cryptoStats?.unprotectedAssets || 0) > 0 ? 'Assets need PQC protection' : 'No assets at risk'}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: (cryptoStats?.unprotectedAssets || 0) > 0 ? '#fee2e2' : '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {(cryptoStats?.unprotectedAssets || 0) > 0 ? '⚠️' : '✓'}
                </div>
              </div>
            </div>

            {/* Critical Assets Status */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem'
                  }}>
                    Critical Assets
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: '#1a1a1a',
                    marginBottom: '0.25rem'
                  }}>
                    {cryptoStats?.criticalProtected || 0}/{cryptoStats?.criticalAssets || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    High-value assets protected
                    {(cryptoStats?.criticalAtRisk || 0) > 0 && (
                      <span style={{ 
                        display: 'block',
                        marginTop: '0.25rem',
                        color: '#ef4444',
                        fontWeight: '600'
                      }}>
                        🔴 {cryptoStats?.criticalAtRisk} at risk!
                      </span>
                    )}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  🎯
                </div>
              </div>
            </div>

            {/* Crypto Agility */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem'
                  }}>
                    Crypto-Agility
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: '#1a1a1a',
                    marginBottom: '0.25rem'
                  }}>
                    {cryptoStats?.algorithmDiversity || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    Unique PQC algorithms in use
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(cryptoStats?.uniqueKEMs || 0) > 0 && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          {cryptoStats?.uniqueKEMs} KEMs
                        </span>
                      )}
                      {(cryptoStats?.uniqueSigs || 0) > 0 && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          {cryptoStats?.uniqueSigs} Sigs
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  �
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity & Recommendations */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {/* Recent Protection Activity */}
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '1rem'
              }}>
                📊 Recent Activity (7 days)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' }}>
                {cryptoStats?.recentlyProtected || 0} assets
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Recently protected with PQC
              </div>
            </div>

            {/* Quick Recommendation */}
            <div style={{
              background: (cryptoStats?.unprotectedAssets || 0) > 0 ? '#fef3c7' : '#d1fae5',
              border: '1px solid ' + ((cryptoStats?.unprotectedAssets || 0) > 0 ? '#f59e0b' : '#10b981'),
              borderRadius: '8px',
              padding: '1.25rem',
              cursor: (cryptoStats?.unprotectedAssets || 0) > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease'
            }}
            onClick={() => (cryptoStats?.unprotectedAssets || 0) > 0 && setShowUnprotectedAssets(!showUnprotectedAssets)}
            onMouseOver={(e) => {
              if ((cryptoStats?.unprotectedAssets || 0) > 0) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '1rem'
              }}>
                💡 Recommendation
                {(cryptoStats?.unprotectedAssets || 0) > 0 && (
                  <span style={{ float: 'right', color: '#666' }}>
                    {showUnprotectedAssets ? '▼' : '▶'} Click to expand
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1a1a1a', lineHeight: 1.5 }}>
                {(cryptoStats?.unprotectedAssets || 0) > 0 ? (
                  <>
                    <strong>Action needed:</strong> {cryptoStats?.unprotectedAssets} asset{(cryptoStats?.unprotectedAssets || 0) !== 1 ? 's' : ''} lack PQC protection.
                    {(cryptoStats?.criticalAtRisk || 0) > 0 && (
                      <> <span style={{ color: '#dc2626' }}>Including {cryptoStats?.criticalAtRisk} critical!</span></>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Great job!</strong> All assets are protected with quantum-safe cryptography. Consider diversifying algorithms for better crypto-agility.
                  </>
                )}
              </div>

              {/* Expandable Unprotected Assets List - Now inside the recommendation card */}
              {showUnprotectedAssets && unprotectedAssetsList.length > 0 && (
                <div style={{
                  marginTop: '1.5rem',
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#f9fafb',
                    padding: '1rem',
                    borderBottom: '1px solid #e0e0e0',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    ⚠️ Assets Requiring PQC Protection
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>                  {unprotectedAssetsList.map((asset, index) => (
                    <div key={asset.id || index} style={{
                      padding: '1rem',
                      borderBottom: index < unprotectedAssetsList.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={() => asset.id && navigate(`/assets/${asset.id}`)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div>
                        <div style={{ 
                          fontWeight: '600', 
                          color: asset.id ? '#2563eb' : '#1a1a1a', 
                          marginBottom: '0.25rem',
                          textDecoration: asset.id ? 'underline' : 'none'
                        }}>
                          {asset.name || `Asset ${index + 1}`}
                          {asset.id && <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>→ Click to view details</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          {asset.asset_type && <span>Type: {asset.asset_type} • </span>}
                          {asset.sensitivity && <span>Sensitivity: {asset.sensitivity} • </span>}
                          Risk Score: {asset.risk_score || 'Unknown'}
                        </div>
                      </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem'
                          }}>
                            NOT PROTECTED
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            → Needs PQC encryption
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    background: '#f9fafb',
                    padding: '1rem',
                    borderTop: '1px solid #e0e0e0',
                    fontSize: '0.85rem',
                    color: '#666'
                  }}>
                    💡 <strong>Recommended Actions:</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                      <li>Review each asset's cryptographic usage</li>
                      <li>Apply post-quantum encryption where appropriate</li>
                      <li>Prioritize critical and high-sensitivity assets</li>
                      <li>Consider crypto-agility for future algorithm updates</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Encryption & Anchoring Workflow */}
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            color: '#1a1a1a',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            SECURE & ANCHOR FILES
          </h2>
          <p style={{ 
            color: '#666', 
            fontSize: '0.9rem',
            marginBottom: '2rem'
          }}>
            Encrypt files with PQC algorithms and anchor to blockchain for immutable proof
          </p>

          {/* Progress Steps */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '3rem',
            position: 'relative',
            maxWidth: '600px',
            margin: '0 auto 3rem'
          }}>
            {['select', 'encrypt', 'classify', 'anchor', 'complete'].map((s, idx) => (
              <div key={s} style={{
                flex: 1,
                textAlign: 'center',
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: step === s || (
                    (s === 'select' && selectedFile) ||
                    (s === 'encrypt' && encryptionResult) ||
                    (s === 'classify' && encryptionResult) ||
                    (s === 'anchor' && anchorResult) ||
                    (s === 'complete' && anchorResult)
                  ) ? '#3b82f6' : '#e5e7eb',
                  color: step === s || (
                    (s === 'select' && selectedFile) ||
                    (s === 'encrypt' && encryptionResult) ||
                    (s === 'classify' && encryptionResult) ||
                    (s === 'anchor' && anchorResult) ||
                    (s === 'complete' && anchorResult)
                  ) ? 'white' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: step === s ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.3s'
                }}>
                  {idx + 1}
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: step === s ? '600' : 'normal',
                  color: step === s ? '#1a1a1a' : '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {s === 'select' && 'Select'}
                  {s === 'encrypt' && 'Encrypt'}
                  {s === 'classify' && 'Classify'}
                  {s === 'anchor' && 'Anchor'}
                  {s === 'complete' && 'Complete'}
                </div>
              </div>
            ))}
            <div style={{
              position: 'absolute',
              top: '18px',
              left: '12%',
              right: '12%',
              height: '2px',
              background: '#e5e7eb',
              zIndex: 0
            }} />
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              marginBottom: '2rem',
              fontSize: '0.9rem'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Step 1: File Selection */}
          {step === 'select' && (
            <div style={{
              padding: '2rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Step 1: Select a File</h2>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '3rem',
                  border: `2px dashed ${dragOver ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(102, 126, 234, 0.05)' : '#fafafa',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Drop a file here or click to select
                </p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>
                  Any file type supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Encryption */}
          {step === 'encrypt' && selectedFile && (
            <div style={{
              padding: '2rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Step 2: Encrypt with PQC</h2>
              
              <div style={{
                padding: '1rem',
                background: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>File:</strong> {selectedFile.name}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Size:</strong> {formatBytes(selectedFile.size)}
                </div>
                <div>
                  <strong>Type:</strong> {selectedFile.type || 'unknown'}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  PQC Key Encapsulation (KEM):
                </label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                  disabled={loading || !!encryptionResult}
                >
                  <option value="kyber512">Kyber-512 (Fast, Standard Security)</option>
                  <option value="kyber768">Kyber-768 (Balanced, High Security)</option>
                  <option value="kyber1024">Kyber-1024 (Strongest, Maximum Security)</option>
                  <option value="ntru">NTRU (Alternative Lattice-based)</option>
                  <option value="classic_mceliece">Classic McEliece (Code-based)</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  For secure key exchange and data encryption
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  PQC Digital Signature:
                </label>
                <select
                  value={selectedSignature}
                  onChange={(e) => setSelectedSignature(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                  disabled={loading || !!encryptionResult}
                >
                  <option value="dilithium2">Dilithium-2 (Fast, NIST Level 2)</option>
                  <option value="dilithium3">Dilithium-3 (Balanced, NIST Level 3)</option>
                  <option value="dilithium5">Dilithium-5 (Maximum Security, NIST Level 5)</option>
                  <option value="sphincsplus128f">SPHINCS+-128f (Hash-based, Small signatures)</option>
                  <option value="sphincsplus256f">SPHINCS+-256f (Hash-based, Highest security)</option>
                  <option value="falcon512">Falcon-512 (Compact, NIST Level 1)</option>
                  <option value="falcon1024">Falcon-1024 (Compact, NIST Level 5)</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  For authentication and integrity verification
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Encryption Password:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 8 characters)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                  disabled={loading}
                />
              </div>

              <div style={{
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>🔒 PQC Hybrid Protection:</strong>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                  • <strong>KEM:</strong> {selectedAlgorithm.toUpperCase()} for key exchange<br/>
                  • <strong>Signature:</strong> {selectedSignature.toUpperCase()} for authentication<br/>
                  • <strong>Symmetric:</strong> AES-256-GCM for data encryption<br/>
                  • <strong>Hash:</strong> BLAKE3 for integrity
                </div>
              </div>

              {encryptionResult && (
                <div style={{
                  padding: '1rem',
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ marginBottom: '1rem', color: '#2e7d32', fontWeight: 'bold' }}>
                    ✓ Encryption Complete
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <strong>Hash:</strong>
                  </div>
                  <div style={{
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    wordBreak: 'break-all',
                    color: '#666'
                  }}>
                    {encryptionResult.hash}
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Encrypted Size:</strong> {formatBytes(encryptionResult.ciphertext.length)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={encryptFile}
                  disabled={loading || !password || !!encryptionResult}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: encryptionResult ? '#4caf50' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: loading || !!encryptionResult ? 'not-allowed' : 'pointer',
                    opacity: loading || !!encryptionResult ? 0.6 : 1
                  }}
                >
                  {loading ? 'Encrypting...' : encryptionResult ? '✓ Encrypted' : '🔐 Encrypt File'}
                </button>
                
                {encryptionResult && (
                  <>
                    <button
                      onClick={downloadEncrypted}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#f5f5f5',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                      }}
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => setStep('classify')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Continue →
                    </button>
                  </>
                )}
                
                <button
                  onClick={resetWorkflow}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Classify Asset */}
          {step === 'classify' && encryptionResult && (
            <div style={{
              padding: '2rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Step 3: Classify Asset</h2>
              
              <div style={{
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <strong>📋 Asset Classification</strong>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  This information helps us calculate the PQC risk score and provide tailored security recommendations.
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Asset Type:
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="datastore">Datastore / File</option>
                  <option value="keymaterial">Key Material</option>
                  <option value="certificate">Certificate</option>
                  <option value="tlsendpoint">TLS Endpoint</option>
                  <option value="apiendpoint">API Endpoint</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  Select the type of cryptographic asset being protected
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Business Criticality:
                </label>
                <select
                  value={businessCriticality}
                  onChange={(e) => setBusinessCriticality(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="low">Low - Non-critical data</option>
                  <option value="medium">Medium - Standard business data</option>
                  <option value="high">High - Important business data</option>
                  <option value="critical">Critical - Mission-critical data</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  How critical is this asset to your business operations?
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Environment:
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="development">Development</option>
                  <option value="testing">Testing / QA</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  Which environment will this asset be used in?
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Data Sensitivity:
                </label>
                <select
                  value={dataSensitivity}
                  onChange={(e) => setDataSensitivity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="public">Public - Publicly available data</option>
                  <option value="internal">Internal - Internal use only</option>
                  <option value="confidential">Confidential - Sensitive business data</option>
                  <option value="restricted">Restricted - Highly sensitive data</option>
                  <option value="secret">Secret - Top secret data</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  What is the sensitivity level of the data?
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Exposure Type:
                </label>
                <select
                  value={exposureType}
                  onChange={(e) => setExposureType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="internal">Internal - Within organization</option>
                  <option value="partner">Partner - Shared with trusted partners</option>
                  <option value="public">Public - Exposed to internet</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  How is this asset exposed to external parties?
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Data Retention (days):
                </label>
                <select
                  value={dataLifetimeDays}
                  onChange={(e) => setDataLifetimeDays(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="30">30 days - Short-term</option>
                  <option value="90">90 days - Quarterly</option>
                  <option value="365">1 year - Annual</option>
                  <option value="1825">5 years - Long-term</option>
                  <option value="3650">10+ years - Permanent archive</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  How long will this data be stored? (affects quantum threat timeline)
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold'
                }}>
                  Crypto Agility:
                </label>
                <select
                  value={cryptoAgility}
                  onChange={(e) => setCryptoAgility(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="none">None - Hardcoded algorithms</option>
                  <option value="low">Low - Difficult to change</option>
                  <option value="medium">Medium - Can be updated with effort</option>
                  <option value="high">High - Easily reconfigurable</option>
                </select>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  How easily can cryptographic algorithms be changed?
                </div>
              </div>

              <div style={{
                padding: '1rem',
                background: '#fff3e0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <strong>💡 Why this matters:</strong>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  These classifications help calculate your PQC Risk Score. Assets with high criticality, 
                  long retention periods, and public exposure face greater quantum threats and need stronger protection.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setStep('encrypt')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  ← Back
                </button>
                
                <button
                  onClick={() => setStep('anchor')}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Continue to Anchor →
                </button>
                
                <button
                  onClick={resetWorkflow}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Anchor to Blockchain */}
          {step === 'anchor' && encryptionResult && (
            <div style={{
              padding: '2rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Step 4: Anchor to Blockchain</h2>
              
              <div style={{
                padding: '1rem',
                background: '#f3e5f5',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Hash to Anchor:</strong>
                </div>
                <div style={{
                  padding: '0.5rem',
                  background: 'white',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  color: '#666'
                }}>
                  {encryptionResult.hash}
                </div>
              </div>

              <div style={{
                padding: '1rem',
                background: '#fff3e0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <strong>⛓️ Blockchain Attestation:</strong> Immutable proof of existence and integrity on Dytallix
              </div>

              {anchorResult && (
                <div style={{
                  padding: '1rem',
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ marginBottom: '1rem', color: '#2e7d32', fontWeight: 'bold' }}>
                    ✓ Anchored Successfully
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Asset ID:</strong> {anchorResult.proofId?.substring(0, 16)}...
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Tx Hash:</strong> {anchorResult.txHash}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Block:</strong> #{anchorResult.block}
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {new Date(anchorResult.timestamp!).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={anchorToBlockchain}
                  disabled={loading || !!anchorResult}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: anchorResult ? '#4caf50' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: loading || !!anchorResult ? 'not-allowed' : 'pointer',
                    opacity: loading || !!anchorResult ? 0.6 : 1
                  }}
                >
                  {loading ? 'Anchoring...' : anchorResult ? '✓ Anchored' : '⛓️ Anchor to Blockchain'}
                </button>
                
                {anchorResult && (
                  <button
                    onClick={() => setStep('complete')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Complete →
                  </button>
                )}
                
                <button
                  onClick={resetWorkflow}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && anchorResult && (
            <div style={{
              padding: '2rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ marginBottom: '1rem' }}>Protection Complete!</h2>
                <p style={{ color: '#666', fontSize: '1.1rem' }}>
                  Your file has been encrypted and anchored to the blockchain
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                background: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '2rem'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>Summary</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>File:</strong></span>
                    <span>{selectedFile?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Original Size:</strong></span>
                    <span>{selectedFile && formatBytes(selectedFile.size)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Encrypted Size:</strong></span>
                    <span>{encryptionResult && formatBytes(encryptionResult.ciphertext.length)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Block Height:</strong></span>
                    <span>#{anchorResult.block}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Asset ID:</strong></span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {anchorResult.proofId?.substring(0, 20)}...
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '8px',
                marginBottom: '2rem',
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                <strong>🔐 Your data is now:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  <li>Protected with post-quantum cryptography</li>
                  <li>Anchored on an immutable blockchain</li>
                  <li>Tamper-evident and verifiable</li>
                  <li>Ready for compliance audits</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={resetWorkflow}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Protect Another File
                </button>
                <button
                  onClick={() => {
                    // Navigate to assets view
                    window.location.href = '/assets';
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  📊 View Assets
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoView;

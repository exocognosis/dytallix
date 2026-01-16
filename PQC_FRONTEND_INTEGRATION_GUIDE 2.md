# Frontend Integration: Context-Aware Risk UI

## User Flow: File Encryption with Context Detection

### Current Flow
```
1. SELECT FILE → 2. ENCRYPT → 3. ANCHOR → 4. COMPLETE
```

### Enhanced Flow with Context Awareness
```
1. SELECT FILE → 2. ENCRYPT → 2.5 REVIEW CONTEXT → 3. ANCHOR → 4. COMPLETE
```

## New Step 2.5: Review Asset Context

### Implementation in DemoView.tsx

Add between encryption and anchoring steps:

```tsx
// Add state for inference
const [inferenceResult, setInferenceResult] = useState<any>(null);
const [showQuestionnaire, setShowQuestionnaire] = useState(false);
const [userContext, setUserContext] = useState<any>({});

// Fetch inference after encryption
useEffect(() => {
  if (encryptionResult && selectedFile) {
    fetch(`${API_BASE}/api/risk/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        name: selectedFile.name,
        endpoint_or_path: `/secure/${encryptionResult.hash}`,
        environment: environment
      })
    })
    .then(res => res.json())
    .then(data => {
      setInferenceResult(data);
      if (!data.detected) {
        // Automatically show questionnaire if not detected
        setShowQuestionnaire(true);
      }
    });
  }
}, [encryptionResult, selectedFile]);

// Step 2.5: Review Context (add after encryption step)
{step === 'encrypt' && encryptionResult && inferenceResult && (
  <div style={{
    marginTop: '2rem',
    padding: '1.5rem',
    background: inferenceResult.detected ? '#e8f5e9' : '#fff3e0',
    border: `2px solid ${inferenceResult.detected ? '#4caf50' : '#f59e0b'}`,
    borderRadius: '12px'
  }}>
    <h3 style={{ 
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      {inferenceResult.detected ? '✓' : '⚠️'} Asset Classification
    </h3>
    
    {inferenceResult.detected ? (
      <>
        <div style={{
          display: 'grid',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div>
            <strong>Detected Type:</strong> {inferenceResult.preset_name}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {inferenceResult.preset_description}
          </div>
        </div>
        
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            📊 View Security Profile
          </summary>
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div><strong>Business Criticality:</strong> {inferenceResult.inferred_values.business_criticality}</div>
              <div><strong>Crypto Usage:</strong> {inferenceResult.inferred_values.crypto_usage}</div>
              <div><strong>Network Exposure:</strong> {inferenceResult.inferred_values.exposure}</div>
              <div><strong>Data Sensitivity:</strong> {inferenceResult.inferred_values.data_sensitivity}</div>
              <div><strong>Crypto Agility:</strong> {inferenceResult.inferred_values.crypto_agility}</div>
              <div><strong>Long-lived Data:</strong> {inferenceResult.inferred_values.stores_long_lived_data ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </details>
        
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <strong>💡 Note:</strong> These values will be used to calculate quantum risk. 
          <button
            onClick={() => setShowQuestionnaire(true)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.25rem 0.75rem',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Override
          </button>
        </div>
      </>
    ) : (
      <>
        <p style={{ marginBottom: '1rem' }}>
          {inferenceResult.recommendation}
        </p>
        <button
          onClick={() => setShowQuestionnaire(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Answer Context Questions
        </button>
      </>
    )}
  </div>
)}
```

## Questionnaire Modal

```tsx
{showQuestionnaire && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ margin: 0 }}>Security Context Questions</h2>
        <button
          onClick={() => setShowQuestionnaire(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#999'
          }}
        >
          ×
        </button>
      </div>
      
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Help us understand this asset's security requirements by answering a few questions.
      </p>
      
      {/* Example Question */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontWeight: 'bold',
          marginBottom: '0.5rem'
        }}>
          1. How critical is this asset to your business operations?
        </label>
        <select
          value={userContext.business_criticality || ''}
          onChange={(e) => setUserContext({
            ...userContext,
            business_criticality: e.target.value
          })}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem'
          }}
        >
          <option value="">Select...</option>
          <option value="low">Low - Nice to have, minimal impact if unavailable</option>
          <option value="medium">Medium - Important but has workarounds</option>
          <option value="high">High - Critical to operations</option>
          <option value="critical">Critical - Cannot operate without it</option>
        </select>
      </div>
      
      {/* More questions... */}
      
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '2rem'
      }}>
        <button
          onClick={() => {
            setShowQuestionnaire(false);
            // User context will be included in asset creation
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Continue with These Settings
        </button>
        <button
          onClick={() => setShowQuestionnaire(false)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

## Updated Anchor Function

Include the context (inferred or user-provided) in asset creation:

```tsx
const anchorToBlockchain = async () => {
  if (!encryptionResult || !selectedFile) {
    setError('No encrypted data to anchor');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Step 1: Create asset with context
    const assetData = {
      name: selectedFile.name,
      asset_type: 'datastore',
      endpoint_or_path: `/secure/${encryptionResult.hash}`,
      owner: 'user',
      sensitivity: dataSensitivity,
      regulatory_tags: ['encrypted', 'pqc-protected', 'blockchain-anchored'],
      exposure_level: 'internal',
      data_lifetime_days: 365,
      
      // Include user-provided context (from questionnaire)
      // OR rely on auto-detection (backend will apply presets)
      ...userContext, // If questionnaire was filled
      
      // If user didn't override, these come from state or inference
      environment: environment,
      business_criticality: userContext.business_criticality || businessCriticality,
      crypto_usage: userContext.crypto_usage || cryptoUsage,
      exposure_type: userContext.exposure_type || exposureType,
      data_sensitivity: userContext.data_sensitivity || dataSensitivity,
      crypto_agility: userContext.crypto_agility || cryptoAgility,
      stores_long_lived_data: userContext.stores_long_lived_data !== undefined 
        ? userContext.stores_long_lived_data 
        : true,
      
      algo_pk: 'None',
      algo_sym: 'AES',
      sym_key_bits: 256,
      
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
    const assetId = assetResult.id;
    
    // Store the risk score for display
    const riskScore = assetResult.pqc_risk_score;
    const riskClass = assetResult.risk_class;
    
    // Step 2: Anchor to blockchain (existing code)
    // ...
    
    setAnchorResult({
      proofId: assetId,
      txHash: blockchainResult.hash || `0x${encryptionResult.hash?.substring(0, 16)}`,
      block: stats.height || 0,
      timestamp: new Date().toISOString(),
      riskScore,  // Add this
      riskClass   // Add this
    });

    setStep('complete');
  } catch (err) {
    setError(`Anchoring failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};
```

## Display Risk Score in Complete Step

```tsx
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

    {/* Risk Score Badge */}
    {anchorResult.riskScore !== undefined && (
      <div style={{
        padding: '1.5rem',
        background: anchorResult.riskClass === 'Critical' ? '#fee2e2' :
                    anchorResult.riskClass === 'High' ? '#fef3c7' :
                    anchorResult.riskClass === 'Medium' ? '#dbeafe' : '#d1fae5',
        border: `2px solid ${
          anchorResult.riskClass === 'Critical' ? '#ef4444' :
          anchorResult.riskClass === 'High' ? '#f59e0b' :
          anchorResult.riskClass === 'Medium' ? '#3b82f6' : '#10b981'
        }`,
        borderRadius: '12px',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '0.5rem',
          color: '#666'
        }}>
          Quantum Risk Assessment
        </div>
        <div style={{
          fontSize: '3rem',
          fontWeight: '700',
          color: anchorResult.riskClass === 'Critical' ? '#dc2626' :
                 anchorResult.riskClass === 'High' ? '#d97706' :
                 anchorResult.riskClass === 'Medium' ? '#2563eb' : '#059669',
          marginBottom: '0.5rem'
        }}>
          {anchorResult.riskScore}/100
        </div>
        <div style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          color: anchorResult.riskClass === 'Critical' ? '#dc2626' :
                 anchorResult.riskClass === 'High' ? '#d97706' :
                 anchorResult.riskClass === 'Medium' ? '#2563eb' : '#059669'
        }}>
          {anchorResult.riskClass} Risk
        </div>
      </div>
    )}

    {/* Existing summary */}
    <div style={{
      padding: '1.5rem',
      background: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '2rem'
    }}>
      {/* ... existing summary code ... */}
    </div>

    {/* ... rest of complete step ... */}
  </div>
)}
```

## Visual Mockup

```
┌──────────────────────────────────────────────────────────┐
│ Step 2: Encrypt with PQC                                 │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ [File Info Box]                                           │
│                                                           │
│ [KEM Selection Dropdown]                                  │
│ [Signature Selection Dropdown]                            │
│ [Password Input]                                          │
│                                                           │
│ [🔐 Encrypt File] [Reset]                                │
│                                                           │
├──────────────────────────────────────────────────────────┤
│ ✓ Asset Classification                         [GREEN]   │
│                                                           │
│ Detected Type: Production Database                       │
│ Enterprise database with long-term data retention        │
│                                                           │
│ ▼ 📊 View Security Profile                               │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Business Criticality: High                      │   │
│   │ Crypto Usage: DataAtRest                        │   │
│   │ Network Exposure: Internal                      │   │
│   │ Data Sensitivity: Regulated                     │   │
│   │ Crypto Agility: Medium                          │   │
│   │ Long-lived Data: Yes                            │   │
│   └─────────────────────────────────────────────────┘   │
│                                                           │
│ 💡 Note: These values will be used to calculate         │
│    quantum risk. [Override]                              │
│                                                           │
│ [Continue to Anchor →]                                   │
└──────────────────────────────────────────────────────────┘

-- OR if not detected --

┌──────────────────────────────────────────────────────────┐
│ ⚠️ Asset Classification                       [YELLOW]   │
│                                                           │
│ Could not determine asset type. Please provide           │
│ additional context via questionnaire.                    │
│                                                           │
│ [Answer Context Questions]                               │
└──────────────────────────────────────────────────────────┘
```

## Benefits of This Approach

1. **Transparency**: User sees exactly what was detected
2. **Control**: User can override if detection is wrong
3. **Education**: User learns about security classifications
4. **Confidence**: System explains its reasoning
5. **Flexibility**: Works for known and unknown asset types
6. **No Friction**: Auto-detection means zero extra work for common cases
7. **Progressive Disclosure**: Advanced details hidden in dropdown

## Next Steps

1. Implement the inference preview in Step 2.5
2. Add questionnaire modal component
3. Update anchor function to include context
4. Display risk score in completion step
5. Add "View Full Risk Report" link to asset detail page

import React, { useState } from 'react'
const exampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DytallixToken {
    string public name = "Dytallix Token";
    string public symbol = "DYTX";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**decimals;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    bool public paused = false;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Pause();
    event Unpause();
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 value) public whenNotPaused returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    // Emergency function - potential security risk using tx.origin
    function emergencyTransfer(address to, uint256 value) public {
        require(tx.origin == owner, "Only owner can emergency transfer");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
    }
}`

const ContractScannerDemo = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState(null)
  const [contractCode, setContractCode] = useState(exampleContract)

  const scanContract = async () => {
    setIsScanning(true)
    setResults(null)

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Mock vulnerability detection results
    const vulnerabilities = []
    const warnings = []
    const info = []

    // Randomly determine findings for demo
    if (contractCode.includes('tx.origin')) {
      vulnerabilities.push({
        type: 'HIGH',
        title: 'Use of tx.origin',
        description: 'Using tx.origin for authorization can be vulnerable to phishing attacks',
        line: contractCode.split('\n').findIndex(line => line.includes('tx.origin')) + 1
      })
    }

    if (contractCode.includes('require(') && Math.random() > 0.5) {
      warnings.push({
        type: 'MEDIUM',
        title: 'Insufficient Input Validation',
        description: 'Consider additional input validation for better security',
        line: contractCode.split('\n').findIndex(line => line.includes('require(')) + 1
      })
    }

    if (contractCode.includes('public') && Math.random() > 0.3) {
      info.push({
        type: 'INFO',
        title: 'Public Function Visibility',
        description: 'Consider if all public functions need to be public',
        line: contractCode.split('\n').findIndex(line => line.includes('public')) + 1
      })
    }

    // Add some demo findings if none found
    if (vulnerabilities.length === 0 && warnings.length === 0) {
      info.push({
        type: 'INFO',
        title: 'Code Quality',
        description: 'Contract follows good security practices',
        line: 1
      })
    }

    setResults({
      vulnerabilities,
      warnings,
      info,
      overallScore: vulnerabilities.length === 0 && warnings.length <= 1 ? 'GOOD' : 
                   vulnerabilities.length === 0 ? 'FAIR' : 'POOR',
      linesAnalyzed: contractCode.split('\n').length,
      analysisTime: '2.3s'
    })

    setIsScanning(false)
  }

  const getSeverityColor = (type) => {
    switch (type) {
      case 'HIGH': return '#dc2626'
      case 'MEDIUM': return '#d97706'
      case 'INFO': return '#2563eb'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#374151' 
          }}>
            Smart Contract Code:
          </label>
          <textarea
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            style={{
              width: '100%',
              height: '300px',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              resize: 'vertical',
              backgroundColor: '#f8fafc'
            }}
            placeholder="Paste your Solidity contract code here..."
          />
        </div>

        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, color: '#374151' }}>Security Analysis</h3>
            <button
              onClick={scanContract}
              disabled={!contractCode.trim() || isScanning}
              style={{
                padding: '10px 20px',
                backgroundColor: isScanning ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: contractCode.trim() && !isScanning ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isScanning ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Scanning...
                </>
              ) : (
                'Scan Contract'
              )}
            </button>
          </div>

          <div style={{
            height: '300px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            overflow: 'auto'
          }}>
            {!results && !isScanning && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Click "Scan Contract" to analyze the code for security vulnerabilities
              </div>
            )}

            {isScanning && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Analyzing contract for security issues...
              </div>
            )}

            {results && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ fontWeight: '600' }}>Overall Score:</span>
                  <span style={{ 
                    fontWeight: '600',
                    color: results.overallScore === 'GOOD' ? '#059669' : 
                           results.overallScore === 'FAIR' ? '#d97706' : '#dc2626'
                  }}>
                    {results.overallScore}
                  </span>
                </div>

                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 12px 0' }}>
                    Analyzed {results.linesAnalyzed} lines in {results.analysisTime}
                  </p>
                </div>

                {[...results.vulnerabilities, ...results.warnings, ...results.info].map((finding, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    backgroundColor: '#fff',
                    border: `1px solid ${getSeverityColor(finding.type)}40`,
                    borderLeft: `4px solid ${getSeverityColor(finding.type)}`,
                    borderRadius: '6px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: getSeverityColor(finding.type)
                      }}>
                        {finding.type}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Line {finding.line}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#374151' }}>
                      {finding.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', lineHeight: '1.4' }}>
                      {finding.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

export default ContractScannerDemo
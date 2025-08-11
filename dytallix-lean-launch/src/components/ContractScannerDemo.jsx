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
      case 'HIGH': return '#EF4444'
      case 'MEDIUM': return '#F59E0B'
      case 'INFO': return '#60A5FA'
      default: return '#9AA4B2'
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="form-label">Smart Contract Code</label>
          <textarea
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            className="textarea"
            style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', minHeight: 300 }}
            placeholder="Paste your Solidity contract code here..."
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Security Analysis</h3>
            <button
              onClick={scanContract}
              disabled={!contractCode.trim() || isScanning}
              className={`btn ${isScanning ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isScanning ? 'Scanning...' : 'Scan Contract'}
            </button>
          </div>

          <div className="card" style={{ minHeight: 300, overflow: 'auto' }}>
            {!results && !isScanning && (
              <div className="muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                Click "Scan Contract" to analyze the code for security vulnerabilities
              </div>
            )}

            {isScanning && (
              <div className="muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                Analyzing contract for security issues...
              </div>
            )}

            {results && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--surface-border)' }}>
                  <span style={{ fontWeight: 700 }}>Overall Score:</span>
                  <span className={
                    results.overallScore === 'GOOD' ? 'badge badge-success' :
                    results.overallScore === 'FAIR' ? 'badge badge-warning' : 'badge badge-neutral'
                  }>
                    {results.overallScore}
                  </span>
                </div>

                <div>
                  <p className="muted" style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                    Analyzed {results.linesAnalyzed} lines in {results.analysisTime}
                  </p>
                </div>

                {[...results.vulnerabilities, ...results.warnings, ...results.info].map((finding, index) => (
                  <div key={index} className="card" style={{ padding: 12, borderLeft: `4px solid ${getSeverityColor(finding.type)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: getSeverityColor(finding.type) }}>
                        {finding.type}
                      </span>
                      <span className="muted" style={{ fontSize: '0.75rem' }}>
                        Line {finding.line}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>
                      {finding.title}
                    </h4>
                    <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {finding.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContractScannerDemo
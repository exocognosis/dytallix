#!/usr/bin/env python3
"""
Dytallix Performance Dashboard - Standalone Server
Simple performance monitoring dashboard for development
"""

import asyncio
import json
import time
import psutil
import requests
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import uvicorn

app = FastAPI(title="Dytallix Performance Dashboard", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def dashboard_home():
    """Enhanced Performance dashboard home"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dytallix Performance Dashboard</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%); 
                color: #fff; 
                min-height: 100vh;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            h1 { 
                color: #4CAF50; 
                margin: 0;
                font-size: 2.5em;
                text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
            }
            .subtitle {
                color: #aaa;
                margin-top: 10px;
                font-size: 1.1em;
            }
            .grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
                gap: 20px; 
                margin-bottom: 30px;
            }
            .metric { 
                background: linear-gradient(145deg, #2a2a2a 0%, #3a3a3a 100%); 
                padding: 20px; 
                border-radius: 15px; 
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .metric:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.4);
            }
            .value { 
                font-size: 28px; 
                font-weight: bold; 
                color: #4CAF50; 
                margin: 10px 0;
                text-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
            }
            .label { 
                color: #ccc; 
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 5px;
            }
            .status-indicator {
                display: inline-block;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
                animation: pulse 2s infinite;
            }
            .status-online { background-color: #4CAF50; }
            .status-offline { background-color: #f44336; }
            .status-error { background-color: #ff9800; }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            .services-section {
                margin-top: 30px;
            }
            .service-card {
                background: linear-gradient(145deg, #2a2a2a 0%, #3a3a3a 100%);
                padding: 20px;
                margin: 15px 0;
                border-radius: 15px;
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s ease;
            }
            .service-card:hover {
                transform: translateX(10px);
                border-color: #4CAF50;
            }
            .service-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #4CAF50;
            }
            .service-details {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .detail-item {
                background: rgba(0,0,0,0.3);
                padding: 10px;
                border-radius: 8px;
                border-left: 3px solid #4CAF50;
            }
            .detail-label {
                font-size: 12px;
                color: #aaa;
                text-transform: uppercase;
            }
            .detail-value {
                font-size: 16px;
                color: #fff;
                font-weight: bold;
                margin-top: 5px;
            }
            .refresh-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(76, 175, 80, 0.8);
                padding: 10px 15px;
                border-radius: 25px;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .refresh-indicator.show {
                opacity: 1;
            }
            .ai-module-card {
                background: linear-gradient(145deg, #1a3a1a 0%, #2a4a2a 100%);
                border: 1px solid rgba(76, 175, 80, 0.3);
                position: relative;
                overflow: hidden;
            }
            .ai-module-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #4CAF50, #81C784);
            }
            .ai-module-card:hover {
                transform: translateY(-8px);
                border-color: #4CAF50;
                box-shadow: 0 15px 50px rgba(76, 175, 80, 0.2);
            }
            .ai-modules-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 30px;
                min-height: 400px;
            }
            @media (max-width: 1200px) {
                .ai-modules-grid {
                    grid-template-columns: repeat(2, 1fr);
                    grid-template-rows: repeat(4, 1fr);
                }
            }
            @media (max-width: 768px) {
                .ai-modules-grid {
                    grid-template-columns: 1fr;
                    grid-template-rows: repeat(8, 1fr);
                }
            }
            .tooltip {
                position: relative;
                display: inline-block;
            }
            .tooltip .tooltiptext {
                visibility: hidden;
                width: 300px;
                background-color: rgba(0, 0, 0, 0.95);
                color: #fff;
                text-align: left;
                border-radius: 8px;
                padding: 15px;
                position: absolute;
                z-index: 1000;
                bottom: 125%;
                left: 50%;
                margin-left: -150px;
                opacity: 0;
                transition: opacity 0.3s, visibility 0.3s;
                border: 1px solid #4CAF50;
                font-size: 13px;
                line-height: 1.4;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            }
            .tooltip .tooltiptext::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 50%;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: #4CAF50 transparent transparent transparent;
            }
            .tooltip:hover .tooltiptext {
                visibility: visible;
                opacity: 1;
            }
        </style>
        <script>
            let refreshIndicator;
            
            function showRefreshIndicator() {
                if (!refreshIndicator) {
                    refreshIndicator = document.createElement('div');
                    refreshIndicator.className = 'refresh-indicator';
                    refreshIndicator.textContent = '🔄 Updating...';
                    document.body.appendChild(refreshIndicator);
                }
                refreshIndicator.classList.add('show');
                setTimeout(() => {
                    refreshIndicator.classList.remove('show');
                }, 1000);
            }
            
            async function updateMetrics() {
                try {
                    showRefreshIndicator();
                    
                    // Get system metrics
                    const systemResponse = await fetch('/metrics');
                    const systemData = await systemResponse.json();
                    
                    if (systemData.success) {
                        const data = systemData.data;
                        document.getElementById('cpu').textContent = data.cpu_percent + '%';
                        document.getElementById('memory').textContent = data.memory_percent + '%';
                        document.getElementById('memory-details').textContent = 
                            `${data.memory_used_gb}GB / ${data.memory_total_gb}GB`;
                        document.getElementById('disk').textContent = data.disk_percent + '%';
                        document.getElementById('disk-details').textContent = 
                            `${data.disk_used_gb}GB / ${data.disk_total_gb}GB`;
                        document.getElementById('uptime').textContent = formatUptime(data.uptime);
                        document.getElementById('timestamp').textContent = formatTime(data.timestamp);
                    }
                    
                    // Get service health data
                    const servicesResponse = await fetch('/services');
                    const servicesData = await servicesResponse.json();
                    
                    if (servicesData.success) {
                        updateServiceStatus('blockchain', servicesData.data.blockchain);
                        updateServiceStatus('frontend', servicesData.data.frontend);
                        updateServiceStatus('metrics', servicesData.data.metrics);
                        updateAIModules();
                    }
                    
                } catch (error) {
                    console.error('Error fetching metrics:', error);
                }
            }
            
            function updateServiceStatus(serviceId, serviceData) {
                const statusElement = document.getElementById(`${serviceId}-status`);
                const indicator = document.getElementById(`${serviceId}-indicator`);
                
                if (statusElement && indicator) {
                    statusElement.textContent = serviceData.status.toUpperCase();
                    indicator.className = `status-indicator status-${serviceData.status}`;
                    
                    // Update service details if available
                    if (serviceData.details) {
                        const detailsContainer = document.getElementById(`${serviceId}-details`);
                        if (detailsContainer) {
                            detailsContainer.innerHTML = '';
                            Object.entries(serviceData.details).forEach(([key, value]) => {
                                const detailItem = document.createElement('div');
                                detailItem.className = 'detail-item';
                                detailItem.innerHTML = `
                                    <div class="detail-label">${key.replace(/_/g, ' ')}</div>
                                    <div class="detail-value">${typeof value === 'object' ? JSON.stringify(value) : value}</div>
                                `;
                                detailsContainer.appendChild(detailItem);
                            });
                        }
                    }
                }
            }
            
            function updateAIModules() {
                // Simulate realistic AI module data with some variability
                const baseTime = Date.now();
                
                // Network Sentinel - Fraud Detection
                const sentinelAccuracy = (62 + Math.sin(baseTime / 10000) * 3).toFixed(1);
                const threatsDetected = Math.floor(10 + Math.random() * 15);
                document.getElementById('sentinel-score').textContent = sentinelAccuracy + '%';
                document.getElementById('sentinel-threats').textContent = `${threatsDetected} threats detected`;
                document.getElementById('sentinel-status').textContent = Math.random() > 0.7 ? 'SCANNING' : 'ACTIVE';
                
                // FeeFlow Optimizer - Gas Fee Optimization
                const optimalFee = (0.0004 + Math.sin(baseTime / 8000) * 0.0002).toFixed(6);
                const savings = Math.floor(12 + Math.random() * 8);
                document.getElementById('feeflow-fee').textContent = optimalFee + ' DTX';
                document.getElementById('feeflow-savings').textContent = `${savings}% savings`;
                document.getElementById('feeflow-status').textContent = Math.random() > 0.5 ? 'OPTIMIZING' : 'ANALYZING';
                
                // Wallet Classifier - User Behavior
                const walletAccuracy = (88 + Math.sin(baseTime / 12000) * 4).toFixed(1);
                document.getElementById('wallet-accuracy').textContent = walletAccuracy + '%';
                document.getElementById('wallet-categories').textContent = '7 categories';
                document.getElementById('wallet-status').textContent = Math.random() > 0.6 ? 'LEARNING' : 'CLASSIFYING';
                
                // Stake Balancer - Staking Optimization
                const stakeAPY = (11.8 + Math.sin(baseTime / 15000) * 1.2).toFixed(1);
                const poolsBalanced = Math.floor(4 + Math.random() * 3);
                document.getElementById('stake-apy').textContent = stakeAPY + '%';
                document.getElementById('stake-pools').textContent = `${poolsBalanced} pools balanced`;
                document.getElementById('stake-status').textContent = Math.random() > 0.5 ? 'BALANCING' : 'OPTIMIZING';
                
                // GovSim - Governance Simulation
                const govParticipation = (75 + Math.sin(baseTime / 18000) * 8).toFixed(1);
                const proposals = Math.floor(20 + Math.random() * 10);
                document.getElementById('govsim-participation').textContent = govParticipation + '%';
                document.getElementById('govsim-proposals').textContent = `${proposals} proposals`;
                document.getElementById('govsim-status').textContent = Math.random() > 0.7 ? 'SIMULATING' : 'ANALYZING';
                
                // Economic Sentinel - Economic Health
                const ecoHealth = (82 + Math.sin(baseTime / 20000) * 6).toFixed(1);
                document.getElementById('eco-health').textContent = ecoHealth + '%';
                document.getElementById('eco-indicators').textContent = '8 indicators';
                document.getElementById('eco-status').textContent = Math.random() > 0.6 ? 'MONITORING' : 'ANALYZING';
                
                // Quantum Shield - Post-Quantum Cryptography
                const quantumStrength = (99.6 + Math.sin(baseTime / 25000) * 0.3).toFixed(1);
                const keysSecured = Math.floor(250 + Math.random() * 20);
                document.getElementById('quantum-strength').textContent = quantumStrength + '%';
                document.getElementById('quantum-keys').textContent = `${keysSecured} keys secured`;
                document.getElementById('quantum-status').textContent = Math.random() > 0.8 ? 'PROTECTING' : 'SECURING';
                
                // Protocol Tuner - Protocol Optimization
                const protocolEfficiency = (92 + Math.sin(baseTime / 22000) * 4).toFixed(1);
                const parametersOptimized = Math.floor(10 + Math.random() * 5);
                document.getElementById('protocol-efficiency').textContent = protocolEfficiency + '%';
                document.getElementById('protocol-params').textContent = `${parametersOptimized} parameters`;
                document.getElementById('protocol-status').textContent = Math.random() > 0.5 ? 'TUNING' : 'OPTIMIZING';
            }
            
            function formatUptime(seconds) {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return `${days}d ${hours}h ${minutes}m`;
            }
            
            function formatTime(timestamp) {
                return new Date(timestamp).toLocaleTimeString();
            }
            
            setInterval(updateMetrics, 3000);
            updateMetrics();
        </script>
    </head>
    <body>
        <div class="header">
            <h1>🚀 Dytallix Performance Dashboard</h1>
            <div class="subtitle">Real-time system monitoring & service health</div>
        </div>
        
        <div class="grid">
            <div class="metric">
                <div class="label">🖥️ CPU Usage</div>
                <div class="value" id="cpu">Loading...</div>
            </div>
            
            <div class="metric">
                <div class="label">🧠 Memory Usage</div>
                <div class="value" id="memory">Loading...</div>
                <div class="detail-label" id="memory-details" style="color: #aaa; font-size: 12px;">Loading...</div>
            </div>
            
            <div class="metric">
                <div class="label">💾 Disk Usage</div>
                <div class="value" id="disk">Loading...</div>
                <div class="detail-label" id="disk-details" style="color: #aaa; font-size: 12px;">Loading...</div>
            </div>
            
            <div class="metric">
                <div class="label">⏱️ System Uptime</div>
                <div class="value" id="uptime">Loading...</div>
            </div>
        </div>
        
        <div class="services-section">
            <h2 style="color: #4CAF50; margin-bottom: 20px;">🔧 Dytallix Core Services</h2>
            
            <div class="service-card">
                <div class="service-title">
                    <span id="blockchain-indicator" class="status-indicator status-online"></span>
                    🔗 Blockchain Node (Port 3030)
                    <span id="blockchain-status" style="float: right; font-size: 14px;">LOADING</span>
                </div>
                <div id="blockchain-details" class="service-details">
                    <!-- Dynamic content will be inserted here -->
                </div>
            </div>
            
            <div class="service-card">
                <div class="service-title">
                    <span id="frontend-indicator" class="status-indicator status-online"></span>
                    🌐 Frontend Dashboard (Port 3000)
                    <span id="frontend-status" style="float: right; font-size: 14px;">LOADING</span>
                </div>
                <div id="frontend-details" class="service-details">
                    <!-- Dynamic content will be inserted here -->
                </div>
            </div>
            
            <div class="service-card">
                <div class="service-title">
                    <span id="metrics-indicator" class="status-indicator status-online"></span>
                    📊 Metrics Collector (Port 3001)
                    <span id="metrics-status" style="float: right; font-size: 14px;">LOADING</span>
                </div>
                <div id="metrics-details" class="service-details">
                    <!-- Dynamic content will be inserted here -->
                </div>
            </div>
        </div>
        
        <div class="services-section">
            <h2 style="color: #4CAF50; margin-bottom: 20px;">🤖 AI Modules Performance</h2>
            
            <div class="ai-modules-grid">
                <!-- Row 1 -->
                <div class="metric ai-module-card tooltip">
                    <div class="label">🛡️ Network Sentinel</div>
                    <div class="value" id="sentinel-score">63%</div>
                    <div class="detail-label">Fraud Detection Accuracy</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="sentinel-threats">12 threats detected</span> | 
                        <span id="sentinel-status">ACTIVE</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Anomaly Detection & Network Security</strong><br/>
                        Uses Isolation Forest + Autoencoder models to detect fraud, bot activity, and suspicious transaction patterns in real-time. Protects the network from malicious actors.
                    </span>
                </div>
                
                <div class="metric ai-module-card tooltip">
                    <div class="label">⛽ FeeFlow Optimizer</div>
                    <div class="value" id="feeflow-fee">0.00043 DTX</div>
                    <div class="detail-label">Current Optimal Fee</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="feeflow-savings">15% savings</span> | 
                        <span id="feeflow-status">OPTIMIZING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Gas Fee Prediction & Optimization</strong><br/>
                        Uses LSTM + Reinforcement Learning to predict network congestion and optimize transaction fees. Reduces costs for users while maintaining fast confirmation times.
                    </span>
                </div>
                
                <div class="metric ai-module-card tooltip">
                    <div class="label">👛 Wallet Classifier</div>
                    <div class="value" id="wallet-accuracy">90%</div>
                    <div class="detail-label">Classification Accuracy</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="wallet-categories">7 categories</span> | 
                        <span id="wallet-status">LEARNING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>User Behavior Classification</strong><br/>
                        Uses XGBoost + Multi-Layer Perceptron to classify wallets into 7 categories based on behavior patterns. Enables risk profiling and compliance scoring.
                    </span>
                </div>
                
                <div class="metric ai-module-card tooltip">
                    <div class="label">🎯 Stake Balancer</div>
                    <div class="value" id="stake-apy">12.4%</div>
                    <div class="detail-label">Optimized APY</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="stake-pools">5 pools balanced</span> | 
                        <span id="stake-status">BALANCING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Stake Reward Optimization</strong><br/>
                        Uses Fuzzy Logic + Deep Q-Network to optimize staking rewards across validator pools. Maximizes yields while maintaining network security and decentralization.
                    </span>
                </div>
                
                <!-- Row 2 -->
                <div class="metric ai-module-card tooltip">
                    <div class="label">🏛️ GovSim</div>
                    <div class="value" id="govsim-participation">78%</div>
                    <div class="detail-label">Governance Participation</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="govsim-proposals">23 proposals</span> | 
                        <span id="govsim-status">SIMULATING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Governance Simulation & Prediction</strong><br/>
                        Uses Bayesian Networks + Agent-Based Modeling to predict proposal outcomes and voter behavior. Helps optimize governance participation and decision-making.
                    </span>
                </div>
                
                <div class="metric ai-module-card tooltip">
                    <div class="label">🌍 Economic Sentinel</div>
                    <div class="value" id="eco-health">85%</div>
                    <div class="detail-label">Economic Health Score</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="eco-indicators">8 indicators</span> | 
                        <span id="eco-status">MONITORING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Economic Risk Forecasting</strong><br/>
                        Uses Random Forest + ARIMA Time Series to monitor economic health across 8 key indicators. Provides early warning for market volatility and systemic risks.
                    </span>
                </div>
                
                <div class="metric ai-module-card tooltip">
                    <div class="label">🔒 Quantum Shield</div>
                    <div class="value" id="quantum-strength">99.8%</div>
                    <div class="detail-label">Cryptographic Strength</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="quantum-keys">256 keys secured</span> | 
                        <span id="quantum-status">PROTECTING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Post-Quantum Cryptography Management</strong><br/>
                        Uses Rule-Based Systems + Reinforcement Learning to manage quantum-resistant algorithms. Protects against future quantum computing threats to cryptographic security.
                    </span>
                </div>
                
                <div class="metric ai-module-card tooltip">
                    <div class="label">⚙️ Protocol Tuner</div>
                    <div class="value" id="protocol-efficiency">94%</div>
                    <div class="detail-label">Protocol Efficiency</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        <span id="protocol-params">12 parameters</span> | 
                        <span id="protocol-status">TUNING</span>
                    </div>
                    <span class="tooltiptext">
                        <strong>Protocol Parameter Optimization</strong><br/>
                        Uses Bayesian Optimization + Multi-Objective Learning to optimize blockchain protocol parameters. Balances performance, security, and decentralization objectives.
                    </span>
                </div>
            </div>
        </div>
        
        <div class="metric" style="margin-top: 30px; text-align: center;">
            <div class="label">Last Updated</div>
            <div class="value" id="timestamp">Loading...</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/health")
async def health():
    """Health check"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "performance_dashboard",
            "timestamp": datetime.now().isoformat()
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Get current system metrics"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)  # Shorter interval for faster response
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = psutil.boot_time()
        uptime = time.time() - boot_time
        
        return {
            "success": True,
            "data": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
                "disk_used_gb": round(disk.used / (1024**3), 2),
                "disk_total_gb": round(disk.total / (1024**3), 2),
                "uptime": round(uptime, 0),
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/services")
async def get_services():
    """Get detailed service health information"""
    
    services_data = {
        "blockchain": {"status": "offline", "details": {}},
        "frontend": {"status": "offline", "details": {}},
        "metrics": {"status": "offline", "details": {}}
    }
    
    try:
        # Check blockchain service
        try:
            response = requests.get("http://localhost:3030/health", timeout=3)
            if response.status_code == 200:
                data = response.json()
                services_data["blockchain"]["status"] = "online"
                services_data["blockchain"]["details"] = {
                    "message": data.get("data", "Healthy"),
                    "port": "3030",
                    "service_type": "Blockchain Node"
                }
                
                # Try to get stats too
                try:
                    stats_response = requests.get("http://localhost:3030/stats", timeout=3)
                    if stats_response.status_code == 200:
                        stats_data = stats_response.json()
                        if stats_data.get("success") and stats_data.get("data"):
                            services_data["blockchain"]["details"].update({
                                "current_block": stats_data["data"].get("current_block", "N/A"),
                                "total_transactions": stats_data["data"].get("total_transactions", "N/A"),
                                "network_peers": stats_data["data"].get("network_peers", "N/A"),
                                "mempool_size": stats_data["data"].get("mempool_size", "N/A")
                            })
                except:
                    pass
        except:
            pass
            
        # Check frontend
        try:
            response = requests.get("http://localhost:3000", timeout=3)
            if response.status_code == 200:
                services_data["frontend"]["status"] = "online"
                services_data["frontend"]["details"] = {
                    "status": "serving",
                    "port": "3000",
                    "service_type": "React Frontend"
                }
        except:
            pass
            
        # Check metrics collector
        try:
            response = requests.get("http://localhost:3001/health", timeout=3)
            if response.status_code == 200:
                data = response.json()
                services_data["metrics"]["status"] = "online"
                services_data["metrics"]["details"] = {
                    "status": data.get("data", {}).get("status", "healthy"),
                    "port": "3001",
                    "service_type": "Metrics Collector"
                }
        except:
            pass
            
    except Exception as e:
        pass
    
    return {
        "success": True,
        "data": services_data,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🚀 Starting Dytallix Performance Dashboard on port 9090")
    print("📊 Dashboard: http://localhost:9090")
    print("🔗 Metrics API: http://localhost:9090/metrics")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9090,
        log_level="info"
    )

#!/usr/bin/env python3
"""
Dytallix Enhanced Performance Dashboard
Professional interactive dashboard with charts, graphs, and real-time visualizations
"""

import asyncio
import json
import time
import psutil
import requests
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import uvicorn
import random
import math

app = FastAPI(title="Dytallix Enhanced Performance Dashboard", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage for historical metrics
historical_data = {
    "timestamps": [],
    "cpu": [],
    "memory": [],
    "disk": [],
    "network_activity": [],
    "transaction_volume": [],
    "ai_performance": {}
}

def generate_sample_data():
    """Generate sample historical data for demonstration"""
    now = datetime.now()
    
    # Clear existing data
    for key in historical_data:
        if isinstance(historical_data[key], list):
            historical_data[key].clear()
    
    # Generate 50 data points over the last hour
    for i in range(50):
        timestamp = now - timedelta(minutes=60-i)
        historical_data["timestamps"].append(timestamp.isoformat())
        
        # CPU with some variation
        base_cpu = 35 + 20 * math.sin(i * 0.2) + random.uniform(-5, 5)
        historical_data["cpu"].append(max(0, min(100, base_cpu)))
        
        # Memory with gradual increase
        base_memory = 60 + i * 0.3 + random.uniform(-3, 3)
        historical_data["memory"].append(max(0, min(100, base_memory)))
        
        # Disk usage (more stable)
        base_disk = 45 + random.uniform(-2, 2)
        historical_data["disk"].append(max(0, min(100, base_disk)))
        
        # Network activity
        network = 100 + 80 * math.sin(i * 0.15) + random.uniform(-20, 20)
        historical_data["network_activity"].append(max(0, network))
        
        # Transaction volume
        tx_volume = 50 + 40 * math.sin(i * 0.1) + random.uniform(-10, 10)
        historical_data["transaction_volume"].append(max(0, tx_volume))

# Initialize sample data
generate_sample_data()

@app.get("/")
async def dashboard_home():
    """Enhanced Performance dashboard with interactive charts"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dytallix Enhanced Performance Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- Chart.js for visualizations -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@2.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
        
        <!-- Font Awesome for icons -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body { 
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
                color: #ffffff;
                min-height: 100vh;
                overflow-x: hidden;
            }
            
            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
                padding: 30px;
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
                border-radius: 20px;
                border: 1px solid rgba(76, 175, 80, 0.2);
                backdrop-filter: blur(20px);
                position: relative;
                overflow: hidden;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #4CAF50, #81C784, #4CAF50);
                animation: shimmer 2s infinite;
            }
            
            @keyframes shimmer {
                0%, 100% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
            }
            
            h1 { 
                color: #4CAF50;
                font-size: 3em;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 0 30px rgba(76, 175, 80, 0.5);
                letter-spacing: -1px;
            }
            
            .subtitle {
                color: #b0b0b0;
                font-size: 1.2em;
                font-weight: 300;
                margin-bottom: 20px;
            }
            
            .status-bar {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-top: 20px;
                flex-wrap: wrap;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 25px;
                font-size: 0.9em;
            }
            
            .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #4CAF50;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }
            
            .main-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 40px;
            }
            
            .chart-container {
                background: linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%);
                border-radius: 20px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .chart-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #4CAF50, transparent);
            }
            
            .chart-container:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 50px rgba(76, 175, 80, 0.1);
            }
            
            .chart-title {
                color: #4CAF50;
                font-size: 1.4em;
                font-weight: 600;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .chart-wrapper {
                position: relative;
                height: 300px;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 25px;
                margin-bottom: 40px;
            }
            
            .metric-card {
                background: linear-gradient(145deg, #1e1e1e 0%, #2e2e2e 100%);
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .metric-card::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(45deg, #4CAF50, #81C784);
            }
            
            .metric-card:hover {
                transform: translateY(-3px);
                border-color: rgba(76, 175, 80, 0.3);
                box-shadow: 0 10px 30px rgba(76, 175, 80, 0.1);
            }
            
            .metric-icon {
                font-size: 2em;
                color: #4CAF50;
                margin-bottom: 15px;
            }
            
            .metric-value {
                font-size: 2.2em;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 8px;
            }
            
            .metric-label {
                color: #b0b0b0;
                font-size: 0.95em;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }
            
            .metric-change {
                font-size: 0.85em;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 500;
            }
            
            .change-positive {
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
            }
            
            .change-negative {
                background: rgba(244, 67, 54, 0.2);
                color: #f44336;
            }
            
            .ai-modules-section {
                margin-bottom: 40px;
            }
            
            .section-title {
                color: #4CAF50;
                font-size: 2em;
                font-weight: 600;
                margin-bottom: 30px;
                text-align: center;
                position: relative;
            }
            
            .section-title::after {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 100px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #4CAF50, transparent);
            }
            
            .ai-modules-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 25px;
                min-height: 400px;
            }
            
            .ai-module-card {
                background: linear-gradient(145deg, #1a2a1a 0%, #2a3a2a 100%);
                border: 1px solid rgba(76, 175, 80, 0.2);
                border-radius: 15px;
                padding: 25px;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
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
                transform: translateY(-5px);
                border-color: #4CAF50;
                box-shadow: 0 15px 40px rgba(76, 175, 80, 0.15);
            }
            
            .module-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .module-name {
                color: #4CAF50;
                font-size: 1.2em;
                font-weight: 600;
            }
            
            .module-status {
                padding: 4px 12px;
                border-radius: 15px;
                font-size: 0.8em;
                font-weight: 500;
                text-transform: uppercase;
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
            }
            
            .module-metric {
                font-size: 2em;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 5px;
            }
            
            .module-description {
                color: #b0b0b0;
                font-size: 0.9em;
                line-height: 1.4;
                margin-bottom: 15px;
            }
            
            .module-details {
                display: flex;
                justify-content: space-between;
                font-size: 0.85em;
                color: #888;
            }
            
            .network-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 25px;
                margin-bottom: 40px;
            }
            
            .loading-skeleton {
                background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                border-radius: 4px;
                height: 20px;
            }
            
            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            .refresh-indicator {
                position: fixed;
                top: 30px;
                right: 30px;
                background: linear-gradient(135deg, #4CAF50, #81C784);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 0.9em;
                font-weight: 500;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
                z-index: 1000;
                box-shadow: 0 5px 20px rgba(76, 175, 80, 0.3);
            }
            
            .refresh-indicator.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            @media (max-width: 1200px) {
                .ai-modules-grid {
                    grid-template-columns: repeat(2, 1fr);
                    grid-template-rows: repeat(4, 1fr);
                }
            }
            
            @media (max-width: 768px) {
                .main-grid {
                    grid-template-columns: 1fr;
                }
                
                .metrics-grid {
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                }
                
                .ai-modules-grid {
                    grid-template-columns: 1fr;
                    grid-template-rows: repeat(6, auto);
                    min-height: auto;
                }
                
                h1 {
                    font-size: 2em;
                }
                
                .status-bar {
                    gap: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <div class="header">
                <h1><i class="fas fa-rocket"></i> Dytallix Performance Dashboard</h1>
                <div class="status-bar">
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span>System Online</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span id="active-connections">8 Active Connections</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span id="last-update">Last Update: <span id="timestamp">--:--:--</span></span>
                    </div>
                </div>
            </div>
            
            <div class="main-grid">
                <div class="chart-container">
                    <div class="chart-title">
                        <i class="fas fa-chart-line"></i>
                        System Resources Timeline
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="systemChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">
                        <i class="fas fa-network-wired"></i>
                        Network Activity
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="networkChart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-microchip"></i></div>
                    <div class="metric-value" id="cpu-value">---%</div>
                    <div class="metric-label">CPU Usage</div>
                    <div class="metric-change change-positive" id="cpu-change">Excellent</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-memory"></i></div>
                    <div class="metric-value" id="memory-value">---%</div>
                    <div class="metric-label">Memory Usage</div>
                    <div class="metric-change change-positive" id="memory-change">Good</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-hdd"></i></div>
                    <div class="metric-value" id="disk-value">---%</div>
                    <div class="metric-label">Disk Usage</div>
                    <div class="metric-change change-positive" id="disk-change">Excellent</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-clock"></i></div>
                    <div class="metric-value" id="uptime-value">---</div>
                    <div class="metric-label">System Uptime</div>
                    <div class="metric-change change-positive">Online</div>
                </div>
            </div>
            
            <div class="ai-modules-section">
                <h2 class="section-title">
                    <i class="fas fa-brain"></i>
                    AI Modules Performance
                </h2>
                
                <div class="ai-modules-grid">
                    <!-- Row 1: 4 modules -->
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-shield-alt"></i> Network Sentinel</div>
                            <div class="module-status" id="sentinel-status">ACTIVE</div>
                        </div>
                        <div class="module-metric" id="sentinel-accuracy">95.8%</div>
                        <div class="module-description">Real-time fraud detection and anomaly analysis</div>
                        <div class="module-details">
                            <span id="sentinel-threats">12 threats blocked</span>
                            <span>Isolation Forest</span>
                        </div>
                    </div>
                    
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-gas-pump"></i> FeeFlow Optimizer</div>
                            <div class="module-status" id="feeflow-status">OPTIMIZING</div>
                        </div>
                        <div class="module-metric" id="feeflow-savings">23%</div>
                        <div class="module-description">Dynamic gas fee optimization and prediction</div>
                        <div class="module-details">
                            <span>Avg fee: <span id="feeflow-fee">0.0043 DTX</span></span>
                            <span>LSTM Model</span>
                        </div>
                    </div>
                    
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-wallet"></i> Wallet Classifier</div>
                            <div class="module-status" id="wallet-status">LEARNING</div>
                        </div>
                        <div class="module-metric" id="wallet-accuracy">92.4%</div>
                        <div class="module-description">Behavioral pattern analysis and risk scoring</div>
                        <div class="module-details">
                            <span id="wallet-categories">7 categories</span>
                            <span>XGBoost</span>
                        </div>
                    </div>
                    
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-balance-scale"></i> Stake Balancer</div>
                            <div class="module-status" id="stake-status">BALANCING</div>
                        </div>
                        <div class="module-metric" id="stake-apy">14.2%</div>
                        <div class="module-description">Automated staking reward optimization</div>
                        <div class="module-details">
                            <span id="stake-pools">6 pools managed</span>
                            <span>Deep Q-Network</span>
                        </div>
                    </div>
                    
                    <!-- Row 2: 2 modules (can add more later) -->
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-vote-yea"></i> GovSim</div>
                            <div class="module-status" id="govsim-status">SIMULATING</div>
                        </div>
                        <div class="module-metric" id="govsim-participation">82.7%</div>
                        <div class="module-description">Governance outcome prediction and simulation</div>
                        <div class="module-details">
                            <span id="govsim-proposals">34 proposals analyzed</span>
                            <span>Bayesian Networks</span>
                        </div>
                    </div>
                    
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-chart-line"></i> Economic Sentinel</div>
                            <div class="module-status" id="eco-status">MONITORING</div>
                        </div>
                        <div class="module-metric" id="eco-health">87.3%</div>
                        <div class="module-description">Economic health monitoring and risk assessment</div>
                        <div class="module-details">
                            <span id="eco-indicators">12 indicators</span>
                            <span>Random Forest</span>
                        </div>
                    </div>
                    
                    <!-- Placeholder cards for future modules -->
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-lock"></i> Quantum Shield</div>
                            <div class="module-status" id="quantum-status">PROTECTING</div>
                        </div>
                        <div class="module-metric" id="quantum-strength">99.8%</div>
                        <div class="module-description">Post-quantum cryptography management</div>
                        <div class="module-details">
                            <span id="quantum-keys">256 keys secured</span>
                            <span>Rule-Based Systems</span>
                        </div>
                    </div>
                    
                    <div class="ai-module-card">
                        <div class="module-header">
                            <div class="module-name"><i class="fas fa-cogs"></i> Protocol Tuner</div>
                            <div class="module-status" id="protocol-status">TUNING</div>
                        </div>
                        <div class="module-metric" id="protocol-efficiency">94.2%</div>
                        <div class="module-description">Protocol parameter optimization</div>
                        <div class="module-details">
                            <span id="protocol-params">12 parameters</span>
                            <span>Bayesian Optimization</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="refresh-indicator" id="refreshIndicator">
            <i class="fas fa-sync-alt fa-spin"></i> Updating data...
        </div>
        
        <script>
            // Chart configurations
            let systemChart, networkChart;
            let lastUpdateTime = 0;
            
            // Initialize charts
            function initializeCharts() {
                // System Resources Chart
                const systemCtx = document.getElementById('systemChart').getContext('2d');
                systemChart = new Chart(systemCtx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [
                            {
                                label: 'CPU Usage',
                                data: [],
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            },
                            {
                                label: 'Memory Usage',
                                data: [],
                                borderColor: '#2196F3',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            },
                            {
                                label: 'Disk Usage',
                                data: [],
                                borderColor: '#FF9800',
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#ffffff',
                                    usePointStyle: true,
                                    padding: 20
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: '#b0b0b0',
                                    maxTicksLimit: 8
                                }
                            },
                            y: {
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: '#b0b0b0',
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                },
                                min: 0,
                                max: 100
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeInOutQuart'
                        }
                    }
                });
                
                // Network Activity Chart
                const networkCtx = document.getElementById('networkChart').getContext('2d');
                networkChart = new Chart(networkCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [
                            {
                                label: 'Network Activity',
                                data: [],
                                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                                borderColor: '#4CAF50',
                                borderWidth: 1,
                                borderRadius: 4
                            },
                            {
                                label: 'Transaction Volume',
                                data: [],
                                backgroundColor: 'rgba(33, 150, 243, 0.6)',
                                borderColor: '#2196F3',
                                borderWidth: 1,
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#ffffff',
                                    usePointStyle: true,
                                    padding: 20
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: '#b0b0b0',
                                    maxTicksLimit: 8
                                }
                            },
                            y: {
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: '#b0b0b0'
                                },
                                beginAtZero: true
                            }
                        },
                        animation: {
                            duration: 1200,
                            easing: 'easeInOutBack'
                        }
                    }
                });
            }
            
            // Show refresh indicator
            function showRefreshIndicator() {
                const indicator = document.getElementById('refreshIndicator');
                indicator.classList.add('show');
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
            
            // Update metrics and charts
            async function updateDashboard() {
                try {
                    showRefreshIndicator();
                    
                    // Fetch current metrics
                    const metricsResponse = await fetch('/metrics');
                    const metricsData = await metricsResponse.json();
                    
                    if (metricsData.success) {
                        const data = metricsData.data;
                        
                        // Update metric cards
                        document.getElementById('cpu-value').textContent = data.cpu_percent + '%';
                        document.getElementById('memory-value').textContent = data.memory_percent + '%';
                        document.getElementById('disk-value').textContent = data.disk_percent + '%';
                        document.getElementById('uptime-value').textContent = formatUptime(data.uptime);
                        document.getElementById('timestamp').textContent = formatTime(data.timestamp);
                        
                        // Update metric changes (simulate)
                        updateMetricChanges(data);
                    }
                    
                    // Fetch historical data for charts
                    const historyResponse = await fetch('/historical');
                    const historyData = await historyResponse.json();
                    
                    if (historyData.success) {
                        updateCharts(historyData.data);
                    }
                    
                    // Update AI modules
                    updateAIModules();
                    
                } catch (error) {
                    console.error('Error updating dashboard:', error);
                }
            }
            
            function updateMetricChanges(data) {
                // Color code based on system performance logic:
                // Green = Low usage (good), Red = High usage (concerning)
                
                const currentUsage = [data.cpu_percent, data.memory_percent, data.disk_percent];
                const elements = ['cpu-change', 'memory-change', 'disk-change'];
                const thresholds = [70, 80, 85]; // CPU, Memory, Disk warning thresholds
                
                currentUsage.forEach((usage, index) => {
                    const element = document.getElementById(elements[index]);
                    const change = (Math.random() * 4 - 2); // Simulate change for display
                    
                    // Determine color based on current usage level, not change direction
                    const isGood = usage < thresholds[index];
                    element.className = `metric-change ${isGood ? 'change-positive' : 'change-negative'}`;
                    
                    // Show status instead of arbitrary change
                    if (usage < thresholds[index] * 0.5) {
                        element.textContent = 'Excellent';
                    } else if (usage < thresholds[index] * 0.7) {
                        element.textContent = 'Good';
                    } else if (usage < thresholds[index]) {
                        element.textContent = 'Normal';
                    } else if (usage < thresholds[index] * 1.2) {
                        element.textContent = 'High';
                    } else {
                        element.textContent = 'Critical';
                    }
                });
            }
            
            function updateCharts(data) {
                // Update system chart
                systemChart.data.labels = data.timestamps.map(t => new Date(t).toLocaleTimeString());
                systemChart.data.datasets[0].data = data.cpu;
                systemChart.data.datasets[1].data = data.memory;
                systemChart.data.datasets[2].data = data.disk;
                systemChart.update('none');
                
                // Update network chart
                networkChart.data.labels = data.timestamps.slice(-10).map(t => new Date(t).toLocaleTimeString());
                networkChart.data.datasets[0].data = data.network_activity.slice(-10);
                networkChart.data.datasets[1].data = data.transaction_volume.slice(-10);
                networkChart.update('none');
            }
            
            function updateAIModules() {
                const baseTime = Date.now();
                
                // Network Sentinel
                const sentinelAccuracy = (95 + Math.sin(baseTime / 10000) * 3).toFixed(1);
                const threatsBlocked = Math.floor(12 + Math.random() * 8);
                document.getElementById('sentinel-accuracy').textContent = sentinelAccuracy + '%';
                document.getElementById('sentinel-threats').textContent = `${threatsBlocked} threats blocked`;
                document.getElementById('sentinel-status').textContent = Math.random() > 0.7 ? 'SCANNING' : 'ACTIVE';
                
                // FeeFlow Optimizer
                const feeflowSavings = (20 + Math.sin(baseTime / 8000) * 5).toFixed(0);
                const optimalFee = (0.004 + Math.sin(baseTime / 12000) * 0.002).toFixed(4);
                document.getElementById('feeflow-savings').textContent = feeflowSavings + '%';
                document.getElementById('feeflow-fee').textContent = optimalFee;
                document.getElementById('feeflow-status').textContent = Math.random() > 0.5 ? 'OPTIMIZING' : 'ANALYZING';
                
                // Wallet Classifier
                const walletAccuracy = (92 + Math.sin(baseTime / 15000) * 2).toFixed(1);
                document.getElementById('wallet-accuracy').textContent = walletAccuracy + '%';
                document.getElementById('wallet-status').textContent = Math.random() > 0.6 ? 'LEARNING' : 'CLASSIFYING';
                
                // Stake Balancer
                const stakeAPY = (14 + Math.sin(baseTime / 18000) * 1.5).toFixed(1);
                const poolsManaged = Math.floor(5 + Math.random() * 3);
                document.getElementById('stake-apy').textContent = stakeAPY + '%';
                document.getElementById('stake-pools').textContent = `${poolsManaged} pools managed`;
                document.getElementById('stake-status').textContent = Math.random() > 0.5 ? 'BALANCING' : 'OPTIMIZING';
                
                // GovSim
                const govParticipation = (82 + Math.sin(baseTime / 20000) * 4).toFixed(1);
                const proposalsAnalyzed = Math.floor(30 + Math.random() * 10);
                document.getElementById('govsim-participation').textContent = govParticipation + '%';
                document.getElementById('govsim-proposals').textContent = `${proposalsAnalyzed} proposals analyzed`;
                document.getElementById('govsim-status').textContent = Math.random() > 0.7 ? 'SIMULATING' : 'ANALYZING';
                
                // Economic Sentinel
                const ecoHealth = (87 + Math.sin(baseTime / 22000) * 3).toFixed(1);
                const indicators = Math.floor(10 + Math.random() * 4);
                document.getElementById('eco-health').textContent = ecoHealth + '%';
                document.getElementById('eco-indicators').textContent = `${indicators} indicators`;
                document.getElementById('eco-status').textContent = Math.random() > 0.6 ? 'MONITORING' : 'ANALYZING';
                
                // Quantum Shield
                const quantumStrength = (99.6 + Math.sin(baseTime / 25000) * 0.3).toFixed(1);
                const keysSecured = Math.floor(250 + Math.random() * 20);
                document.getElementById('quantum-strength').textContent = quantumStrength + '%';
                document.getElementById('quantum-keys').textContent = `${keysSecured} keys secured`;
                document.getElementById('quantum-status').textContent = Math.random() > 0.8 ? 'PROTECTING' : 'SECURING';
                
                // Protocol Tuner
                const protocolEfficiency = (93 + Math.sin(baseTime / 27000) * 2).toFixed(1);
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
            
            // Initialize dashboard
            document.addEventListener('DOMContentLoaded', function() {
                initializeCharts();
                updateDashboard();
                
                // Update every 3 seconds
                setInterval(updateDashboard, 3000);
            });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/historical")
async def get_historical_data():
    """Get historical data for charts"""
    try:
        return {
            "success": True,
            "data": historical_data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "enhanced_performance_dashboard",
            "timestamp": datetime.now().isoformat()
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Get current system metrics"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = psutil.boot_time()
        uptime = time.time() - boot_time
        
        # Add new data point to historical data
        now = datetime.now()
        historical_data["timestamps"].append(now.isoformat())
        historical_data["cpu"].append(round(cpu_percent, 1))
        historical_data["memory"].append(round(memory.percent, 1))
        historical_data["disk"].append(round((disk.used / disk.total) * 100, 1))
        
        # Generate network activity data
        network_activity = 100 + 80 * math.sin(time.time() * 0.01) + random.uniform(-20, 20)
        tx_volume = 50 + 40 * math.sin(time.time() * 0.008) + random.uniform(-10, 10)
        
        historical_data["network_activity"].append(max(0, network_activity))
        historical_data["transaction_volume"].append(max(0, tx_volume))
        
        # Keep only last 50 data points
        max_points = 50
        for key in historical_data:
            if isinstance(historical_data[key], list) and len(historical_data[key]) > max_points:
                historical_data[key] = historical_data[key][-max_points:]
        
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
    print("🚀 Starting Dytallix Enhanced Performance Dashboard on port 9091")
    print("📊 Dashboard: http://localhost:9091")
    print("🔗 Metrics API: http://localhost:9091/metrics")
    print("📈 Historical API: http://localhost:9091/historical")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9091,
        log_level="info"
    )

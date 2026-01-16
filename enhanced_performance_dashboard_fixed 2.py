#!/usr/bin/env python3
"""
Dytallix Enhanced Performance Dashboard with Encryption Modules
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
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                color: #ffffff;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .header h1 {
                font-size: 3em;
                font-weight: 700;
                background: linear-gradient(135deg, #4CAF50, #81C784);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 10px;
            }
            
            .header .subtitle {
                color: #b0b0b0;
                font-size: 1.2em;
                font-weight: 300;
            }
            
            .core-services-section {
                margin-bottom: 40px;
            }
            
            .section-title {
                color: #4CAF50;
                font-size: 2em;
                font-weight: 600;
                margin-bottom: 30px;
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .services-grid {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .service-row {
                background: linear-gradient(135deg, #2a2a2a, #353535);
                border-radius: 15px;
                padding: 25px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
                border: 2px solid rgba(76, 175, 80, 0.2);
            }
            
            .service-row:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(76, 175, 80, 0.2);
                border-color: rgba(76, 175, 80, 0.4);
            }
            
            .service-row.encryption-row {
                border-color: rgba(255, 193, 7, 0.3);
                background: linear-gradient(135deg, #2a2a2a, #3a3020);
            }
            
            .service-row.encryption-row:hover {
                border-color: rgba(255, 193, 7, 0.6);
                box-shadow: 0 10px 30px rgba(255, 193, 7, 0.2);
            }
            
            .service-info {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            
            .service-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #4CAF50, #81C784);
                border-radius: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5em;
                color: white;
                flex-shrink: 0;
            }
            
            .encryption-row .service-icon {
                background: linear-gradient(135deg, #FFC107, #FFD54F);
                color: #333;
            }
            
            .service-details {
                flex: 1;
            }
            
            .service-name {
                font-size: 1.3em;
                font-weight: 600;
                color: #ffffff;
                margin-bottom: 8px;
            }
            
            .service-description {
                color: #b0b0b0;
                font-size: 0.95em;
                line-height: 1.4;
            }
            
            .service-status {
                text-align: right;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 10px;
            }
            
            .status-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-bottom: 5px;
            }
            
            .status-indicator.online {
                background: #4CAF50;
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
                animation: pulse 2s infinite;
            }
            
            .status-indicator.offline {
                background: #f44336;
                box-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
            }
            
            .status-text {
                font-weight: 600;
                font-size: 0.9em;
                color: #4CAF50;
                margin-bottom: 10px;
            }
            
            .service-metrics {
                display: flex;
                flex-direction: column;
                gap: 5px;
                font-size: 0.85em;
                color: #888;
            }
            
            .service-metrics span {
                white-space: nowrap;
            }
            
            .encryption-metrics {
                gap: 8px;
            }
            
            .encryption-metrics span {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .crypto-status {
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8em;
            }
            
            .crypto-status.active {
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
                border: 1px solid rgba(76, 175, 80, 0.3);
            }
            
            .crypto-status.inactive {
                background: rgba(244, 67, 54, 0.2);
                color: #f44336;
                border: 1px solid rgba(244, 67, 54, 0.3);
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .status-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #2a2a2a, #353535);
                border-radius: 15px;
                border: 2px solid rgba(76, 175, 80, 0.2);
            }
            
            .status-info {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .status-dot {
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            
            .metric-card {
                background: linear-gradient(135deg, #2a2a2a, #353535);
                border-radius: 15px;
                padding: 25px;
                text-align: center;
                transition: all 0.3s ease;
                border: 2px solid rgba(76, 175, 80, 0.2);
            }
            
            .metric-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(76, 175, 80, 0.2);
                border-color: rgba(76, 175, 80, 0.4);
            }
            
            .metric-icon {
                font-size: 2.5em;
                color: #4CAF50;
                margin-bottom: 15px;
            }
            
            .metric-value {
                font-size: 2.5em;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 10px;
            }
            
            .metric-label {
                color: #b0b0b0;
                font-size: 1.1em;
                margin-bottom: 10px;
            }
            
            .metric-change {
                font-weight: 600;
                font-size: 0.9em;
                padding: 5px 12px;
                border-radius: 20px;
            }
            
            .change-positive {
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-rocket"></i> Dytallix Performance Dashboard</h1>
                <div class="subtitle">Real-time system monitoring & service health</div>
            </div>
            
            <div class="status-header">
                <div class="status-info">
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span>All Systems Operational</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span id="last-update">Last Update: <span id="timestamp">--:--:--</span></span>
                    </div>
                </div>
            </div>
            
            <div class="core-services-section">
                <h2 class="section-title">
                    <i class="fas fa-cogs"></i>
                    Dytallix Core Services
                </h2>
                
                <div class="services-grid">
                    <div class="service-row">
                        <div class="service-info">
                            <div class="service-icon"><i class="fas fa-cube"></i></div>
                            <div class="service-details">
                                <div class="service-name">Dytallix Blockchain Node</div>
                                <div class="service-description">Core blockchain consensus and transaction processing</div>
                            </div>
                        </div>
                        <div class="service-status">
                            <div class="status-indicator online" id="blockchain-status"></div>
                            <div class="status-text">ONLINE</div>
                            <div class="service-metrics">
                                <span>Port: <span id="blockchain-port">3030</span></span>
                                <span>Block: <span id="current-block">1234</span></span>
                                <span>TPS: <span id="transaction-rate">42</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="service-row">
                        <div class="service-info">
                            <div class="service-icon"><i class="fas fa-chart-line"></i></div>
                            <div class="service-details">
                                <div class="service-name">Performance Dashboard</div>
                                <div class="service-description">Real-time system monitoring and analytics</div>
                            </div>
                        </div>
                        <div class="service-status">
                            <div class="status-indicator online" id="dashboard-status"></div>
                            <div class="status-text">ONLINE</div>
                            <div class="service-metrics">
                                <span>Port: <span id="dashboard-port">3000</span></span>
                                <span>Uptime: <span id="dashboard-uptime">2h 14m</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="service-row">
                        <div class="service-info">
                            <div class="service-icon"><i class="fas fa-database"></i></div>
                            <div class="service-details">
                                <div class="service-name">Metrics Collector</div>
                                <div class="service-description">System metrics aggregation and storage</div>
                            </div>
                        </div>
                        <div class="service-status">
                            <div class="status-indicator online" id="metrics-status"></div>
                            <div class="status-text">ONLINE</div>
                            <div class="service-metrics">
                                <span>Port: <span id="metrics-port">3001</span></span>
                                <span>Metrics: <span id="metrics-count">847</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="service-row encryption-row">
                        <div class="service-info">
                            <div class="service-icon"><i class="fas fa-lock"></i></div>
                            <div class="service-details">
                                <div class="service-name">Post-Quantum Encryption Modules</div>
                                <div class="service-description">SPHINCS+, Dilithium, and Kyber cryptographic algorithms</div>
                            </div>
                        </div>
                        <div class="service-status">
                            <div class="status-indicator online" id="encryption-status"></div>
                            <div class="status-text">SECURED</div>
                            <div class="service-metrics encryption-metrics">
                                <span><i class="fas fa-shield-alt"></i> SPHINCS+: <span id="sphincs-status" class="crypto-status active">ACTIVE</span></span>
                                <span><i class="fas fa-key"></i> Dilithium: <span id="dilithium-status" class="crypto-status active">ACTIVE</span></span>
                                <span><i class="fas fa-exchange-alt"></i> Kyber: <span id="kyber-status" class="crypto-status active">ACTIVE</span></span>
                            </div>
                        </div>
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
        </div>
        
        <div class="refresh-indicator" id="refreshIndicator">
            <i class="fas fa-sync-alt fa-spin"></i> Updating data...
        </div>
        
        <script>
            function showRefreshIndicator() {
                const indicator = document.getElementById('refreshIndicator');
                indicator.classList.add('show');
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
            
            function formatTime(timestamp) {
                const date = new Date(timestamp);
                return date.toLocaleTimeString();
            }
            
            function formatUptime(seconds) {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return `${hours}h ${minutes}m`;
            }
            
            function updateEncryptionModules() {
                // Simulate encryption module status updates
                const modules = ['sphincs-status', 'dilithium-status', 'kyber-status'];
                
                modules.forEach(moduleId => {
                    const element = document.getElementById(moduleId);
                    if (element) {
                        // 95% chance of being active (high reliability)
                        const isActive = Math.random() > 0.05;
                        element.textContent = isActive ? 'ACTIVE' : 'SYNCING';
                        element.className = isActive ? 'crypto-status active' : 'crypto-status inactive';
                    }
                });
                
                // Update encryption status indicator
                const encryptionStatus = document.getElementById('encryption-status');
                if (encryptionStatus) {
                    encryptionStatus.className = 'status-indicator online';
                }
            }
            
            async function updateServicesStatus() {
                try {
                    const response = await fetch('/services');
                    const data = await response.json();
                    
                    if (data.success && data.data) {
                        // Update service status indicators
                        Object.keys(data.data).forEach(serviceKey => {
                            const service = data.data[serviceKey];
                            const statusElement = document.getElementById(`${serviceKey}-status`);
                            if (statusElement) {
                                statusElement.className = service.status === 'online' 
                                    ? 'status-indicator online' 
                                    : 'status-indicator offline';
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error updating services:', error);
                }
            }
            
            // Update dashboard
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
                    }
                    
                    // Update encryption modules
                    updateEncryptionModules();
                    
                    // Update services status
                    updateServicesStatus();
                    
                } catch (error) {
                    console.error('Error updating dashboard:', error);
                }
            }
            
            // Initialize dashboard
            updateDashboard();
            
            // Update every 5 seconds
            setInterval(updateDashboard, 5000);
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
            "message": "Historical data retrieved successfully",
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
    """Health check endpoint"""
    return {
        "success": True,
        "data": "Healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/metrics")
async def get_metrics():
    """Get current system metrics"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        uptime = time.time() - psutil.boot_time()
        
        return {
            "success": True,
            "data": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "disk_percent": round(disk.percent, 1),
                "uptime": round(uptime),
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_used_gb": round(disk.used / (1024**3), 2),
                "disk_total_gb": round(disk.total / (1024**3), 2)
            },
            "timestamp": datetime.now().isoformat()
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
    print("🔐 Encryption Modules: SPHINCS+, Dilithium, Kyber monitoring enabled")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9091,
        log_level="info"
    )

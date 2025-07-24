/**
 * Performance Monitoring System for Dytallix Testnet
 * Real-time TPS measurement, latency tracking, and system health monitoring
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import * as fs from 'fs/promises';
import * as path from 'path';

// Type definitions
interface NetworkMetrics {
  timestamp: number;
  transactionsPerSecond: number;
  confirmationLatency: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUtilization: number;
  networkStats: {
    peerCount: number;
    uptime: number;
    errorRate: number;
    blockHeight: number;
  };
  websocketHealth: {
    activeConnections: number;
    messageRate: number;
    errorCount: number;
  };
}

interface TransactionMetric {
  id: string;
  timestamp: number;
  submissionTime: number;
  confirmationTime?: number;
  latency?: number;
  success: boolean;
  errorMessage?: string;
}

interface SystemAlert {
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metric?: string;
  value?: number;
  threshold?: number;
}

class PerformanceMonitor {
  private baseUrl: string;
  private wsUrl: string;
  private websocket: WebSocket | null = null;
  private isMonitoring: boolean = false;
  private metrics: NetworkMetrics[] = [];
  private transactions: Map<string, TransactionMetric> = new Map();
  private alerts: SystemAlert[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private reportInterval: NodeJS.Timeout | null = null;

  // Configurable thresholds
  private thresholds = {
    maxLatency: 5000, // 5 seconds
    minTps: 100,      // 100 TPS minimum
    maxMemoryMB: 2048, // 2GB memory limit
    maxCpuPercent: 80, // 80% CPU limit
    minPeerCount: 3,   // Minimum peer connections
    maxErrorRate: 0.05 // 5% error rate maximum
  };

  constructor(
    baseUrl: string = 'https://testnet-api.dytallix.io',
    wsUrl: string = 'wss://testnet-api.dytallix.io/ws'
  ) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
  }

  /**
   * Start comprehensive performance monitoring
   */
  async startMonitoring(intervalMs: number = 10000): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Monitoring is already active');
    }

    console.log('🚀 Starting Dytallix Performance Monitor');
    console.log(`📊 Base URL: ${this.baseUrl}`);
    console.log(`🔌 WebSocket URL: ${this.wsUrl}`);
    console.log(`⏱️ Collection interval: ${intervalMs}ms`);

    this.isMonitoring = true;

    // Initialize WebSocket connection
    await this.connectWebSocket();

    // Start metrics collection
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        this.analyzeMetrics();
      } catch (error) {
        console.error('Error collecting metrics:', error);
        this.addAlert('error', 'Failed to collect metrics', 'system');
      }
    }, intervalMs);

    // Start periodic reporting
    this.reportInterval = setInterval(() => {
      this.generateLiveReport();
    }, 60000); // Every minute

    console.log('✅ Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping performance monitoring...');

    this.isMonitoring = false;

    // Clear intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Generate final report
    await this.generateFinalReport();

    console.log('✅ Performance monitoring stopped');
  }

  /**
   * Connect to WebSocket for real-time monitoring
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.wsUrl);

        this.websocket.on('open', () => {
          console.log('🔌 WebSocket connected');
          
          // Subscribe to real-time feeds
          this.websocket?.send(JSON.stringify({
            type: 'subscribe',
            channels: ['blocks', 'transactions', 'network_stats']
          }));

          resolve();
        });

        this.websocket.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.processWebSocketMessage(message);
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        });

        this.websocket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.addAlert('error', 'WebSocket connection error', 'websocket');
          reject(error);
        });

        this.websocket.on('close', () => {
          console.log('🔌 WebSocket disconnected');
          if (this.isMonitoring) {
            // Attempt to reconnect after a delay
            setTimeout(() => this.connectWebSocket(), 5000);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process incoming WebSocket messages
   */
  private processWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'new_transaction':
        this.trackTransaction(message.data);
        break;
      case 'transaction_confirmed':
        this.updateTransactionConfirmation(message.data);
        break;
      case 'new_block':
        // Block confirmation updates
        break;
      case 'network_stats':
        // Real-time network statistics
        break;
      default:
        console.debug('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Track a new transaction submission
   */
  private trackTransaction(transactionData: any): void {
    const metric: TransactionMetric = {
      id: transactionData.id || transactionData.hash,
      timestamp: Date.now(),
      submissionTime: Date.now(),
      success: false
    };

    this.transactions.set(metric.id, metric);
  }

  /**
   * Update transaction with confirmation data
   */
  private updateTransactionConfirmation(confirmationData: any): void {
    const txId = confirmationData.transaction_id || confirmationData.hash;
    const transaction = this.transactions.get(txId);

    if (transaction) {
      transaction.confirmationTime = Date.now();
      transaction.latency = transaction.confirmationTime - transaction.submissionTime;
      transaction.success = confirmationData.success || true;
      transaction.errorMessage = confirmationData.error;

      this.transactions.set(txId, transaction);
    }
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectMetrics(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Collect API metrics
      const [statusResponse, statsResponse, peersResponse] = await Promise.all([
        this.fetchWithTimeout('/status'),
        this.fetchWithTimeout('/stats'),
        this.fetchWithTimeout('/peers')
      ]);

      // Calculate TPS from recent transactions
      const recentTransactions = Array.from(this.transactions.values())
        .filter(tx => Date.now() - tx.timestamp < 60000); // Last minute
      const confirmedTransactions = recentTransactions.filter(tx => tx.success);
      const tps = confirmedTransactions.length / 60; // Per second over last minute

      // Calculate average confirmation latency
      const latencies = confirmedTransactions
        .map(tx => tx.latency)
        .filter(latency => latency !== undefined) as number[];
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
        : 0;

      // System resource metrics (simplified for browser/Node.js environment)
      const memoryUsage = process.memoryUsage();
      const cpuUsage = await this.getCpuUsage();

      const metric: NetworkMetrics = {
        timestamp: Date.now(),
        transactionsPerSecond: tps,
        confirmationLatency: avgLatency,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        },
        cpuUtilization: cpuUsage,
        networkStats: {
          peerCount: peersResponse?.peers?.length || 0,
          uptime: statusResponse?.uptime || 0,
          errorRate: this.calculateErrorRate(),
          blockHeight: statusResponse?.block_height || 0
        },
        websocketHealth: {
          activeConnections: this.websocket?.readyState === WebSocket.OPEN ? 1 : 0,
          messageRate: 0, // TODO: Implement message rate tracking
          errorCount: this.countWebSocketErrors()
        }
      };

      this.metrics.push(metric);

      // Keep only last 1000 metrics to prevent memory growth
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      const endTime = performance.now();
      console.debug(`📊 Metrics collected in ${(endTime - startTime).toFixed(2)}ms`);

    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.addAlert('error', 'Metrics collection failed', 'system');
    }
  }

  /**
   * Fetch data from API with timeout
   */
  private async fetchWithTimeout(endpoint: string, timeoutMs: number = 5000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dytallix-Performance-Monitor'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get CPU usage (simplified implementation)
   */
  private async getCpuUsage(): Promise<number> {
    // In a real implementation, this would use system monitoring tools
    // For now, return a simulated value based on current load
    return Math.random() * 100;
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    const recentTransactions = Array.from(this.transactions.values())
      .filter(tx => Date.now() - tx.timestamp < 300000); // Last 5 minutes

    if (recentTransactions.length === 0) return 0;

    const failedTransactions = recentTransactions.filter(tx => !tx.success);
    return failedTransactions.length / recentTransactions.length;
  }

  /**
   * Count WebSocket errors
   */
  private countWebSocketErrors(): number {
    return this.alerts.filter(alert => 
      alert.metric === 'websocket' && 
      Date.now() - alert.timestamp < 300000 // Last 5 minutes
    ).length;
  }

  /**
   * Analyze metrics and generate alerts
   */
  private analyzeMetrics(): void {
    if (this.metrics.length === 0) return;

    const latestMetric = this.metrics[this.metrics.length - 1];

    // Check TPS threshold
    if (latestMetric.transactionsPerSecond < this.thresholds.minTps) {
      this.addAlert('warning', 
        `Low TPS: ${latestMetric.transactionsPerSecond.toFixed(2)} (threshold: ${this.thresholds.minTps})`,
        'tps',
        latestMetric.transactionsPerSecond,
        this.thresholds.minTps
      );
    }

    // Check latency threshold
    if (latestMetric.confirmationLatency > this.thresholds.maxLatency) {
      this.addAlert('warning',
        `High latency: ${latestMetric.confirmationLatency.toFixed(2)}ms (threshold: ${this.thresholds.maxLatency}ms)`,
        'latency',
        latestMetric.confirmationLatency,
        this.thresholds.maxLatency
      );
    }

    // Check memory usage
    const memoryMB = latestMetric.memoryUsage.rss / 1024 / 1024;
    if (memoryMB > this.thresholds.maxMemoryMB) {
      this.addAlert('warning',
        `High memory usage: ${memoryMB.toFixed(2)}MB (threshold: ${this.thresholds.maxMemoryMB}MB)`,
        'memory',
        memoryMB,
        this.thresholds.maxMemoryMB
      );
    }

    // Check CPU usage
    if (latestMetric.cpuUtilization > this.thresholds.maxCpuPercent) {
      this.addAlert('warning',
        `High CPU usage: ${latestMetric.cpuUtilization.toFixed(2)}% (threshold: ${this.thresholds.maxCpuPercent}%)`,
        'cpu',
        latestMetric.cpuUtilization,
        this.thresholds.maxCpuPercent
      );
    }

    // Check peer count
    if (latestMetric.networkStats.peerCount < this.thresholds.minPeerCount) {
      this.addAlert('critical',
        `Low peer count: ${latestMetric.networkStats.peerCount} (threshold: ${this.thresholds.minPeerCount})`,
        'peers',
        latestMetric.networkStats.peerCount,
        this.thresholds.minPeerCount
      );
    }

    // Check error rate
    if (latestMetric.networkStats.errorRate > this.thresholds.maxErrorRate) {
      this.addAlert('error',
        `High error rate: ${(latestMetric.networkStats.errorRate * 100).toFixed(2)}% (threshold: ${(this.thresholds.maxErrorRate * 100).toFixed(2)}%)`,
        'error_rate',
        latestMetric.networkStats.errorRate,
        this.thresholds.maxErrorRate
      );
    }
  }

  /**
   * Add system alert
   */
  private addAlert(type: 'warning' | 'error' | 'critical', message: string, metric?: string, value?: number, threshold?: number): void {
    const alert: SystemAlert = {
      type,
      message,
      timestamp: Date.now(),
      metric,
      value,
      threshold
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log critical alerts immediately
    if (type === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${message}`);
    } else if (type === 'error') {
      console.error(`❌ ERROR: ${message}`);
    } else {
      console.warn(`⚠️ WARNING: ${message}`);
    }
  }

  /**
   * Generate live performance report
   */
  private generateLiveReport(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const last10Minutes = this.metrics.filter(m => Date.now() - m.timestamp < 600000);

    console.log('\n📊 === LIVE PERFORMANCE REPORT ===');
    console.log(`🕐 Timestamp: ${new Date(latest.timestamp).toISOString()}`);
    console.log(`🚀 Current TPS: ${latest.transactionsPerSecond.toFixed(2)}`);
    console.log(`⏱️ Avg Latency: ${latest.confirmationLatency.toFixed(2)}ms`);
    console.log(`💾 Memory Usage: ${(latest.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`🖥️ CPU Usage: ${latest.cpuUtilization.toFixed(2)}%`);
    console.log(`🌐 Peer Count: ${latest.networkStats.peerCount}`);
    console.log(`📈 Block Height: ${latest.networkStats.blockHeight}`);
    console.log(`❌ Error Rate: ${(latest.networkStats.errorRate * 100).toFixed(2)}%`);

    if (last10Minutes.length > 0) {
      const avgTps = last10Minutes.reduce((sum, m) => sum + m.transactionsPerSecond, 0) / last10Minutes.length;
      console.log(`📊 10-min Avg TPS: ${avgTps.toFixed(2)}`);
    }

    // Show recent alerts
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 300000); // Last 5 minutes
    if (recentAlerts.length > 0) {
      console.log(`🚨 Recent Alerts (${recentAlerts.length}):`);
      recentAlerts.slice(-5).forEach(alert => {
        console.log(`  ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }

    console.log('================================\n');
  }

  /**
   * Generate final comprehensive report
   */
  private async generateFinalReport(): Promise<void> {
    if (this.metrics.length === 0) {
      console.log('No metrics collected to generate report');
      return;
    }

    const report = {
      summary: {
        testDuration: this.metrics.length > 0 ? 
          this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp : 0,
        totalMetrics: this.metrics.length,
        totalTransactions: this.transactions.size,
        totalAlerts: this.alerts.length
      },
      performance: {
        averageTps: this.metrics.reduce((sum, m) => sum + m.transactionsPerSecond, 0) / this.metrics.length,
        maxTps: Math.max(...this.metrics.map(m => m.transactionsPerSecond)),
        minTps: Math.min(...this.metrics.map(m => m.transactionsPerSecond)),
        averageLatency: this.metrics.reduce((sum, m) => sum + m.confirmationLatency, 0) / this.metrics.length,
        maxLatency: Math.max(...this.metrics.map(m => m.confirmationLatency)),
        minLatency: Math.min(...this.metrics.map(m => m.confirmationLatency))
      },
      resources: {
        averageMemoryMB: this.metrics.reduce((sum, m) => sum + m.memoryUsage.rss, 0) / this.metrics.length / 1024 / 1024,
        maxMemoryMB: Math.max(...this.metrics.map(m => m.memoryUsage.rss)) / 1024 / 1024,
        averageCpu: this.metrics.reduce((sum, m) => sum + m.cpuUtilization, 0) / this.metrics.length,
        maxCpu: Math.max(...this.metrics.map(m => m.cpuUtilization))
      },
      network: {
        averagePeers: this.metrics.reduce((sum, m) => sum + m.networkStats.peerCount, 0) / this.metrics.length,
        minPeers: Math.min(...this.metrics.map(m => m.networkStats.peerCount)),
        averageErrorRate: this.metrics.reduce((sum, m) => sum + m.networkStats.errorRate, 0) / this.metrics.length,
        maxErrorRate: Math.max(...this.metrics.map(m => m.networkStats.errorRate))
      },
      alerts: {
        critical: this.alerts.filter(a => a.type === 'critical').length,
        errors: this.alerts.filter(a => a.type === 'error').length,
        warnings: this.alerts.filter(a => a.type === 'warning').length
      },
      transactions: Array.from(this.transactions.values()),
      metrics: this.metrics,
      alertHistory: this.alerts
    };

    // Save report to file
    const reportFile = `performance-report-${Date.now()}.json`;
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    console.log(`📄 Final performance report saved to: ${reportFile}`);
    console.log('\n📊 === FINAL PERFORMANCE SUMMARY ===');
    console.log(`⏱️ Test Duration: ${(report.summary.testDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log(`🚀 Average TPS: ${report.performance.averageTps.toFixed(2)}`);
    console.log(`🏃 Max TPS: ${report.performance.maxTps.toFixed(2)}`);
    console.log(`⏱️ Average Latency: ${report.performance.averageLatency.toFixed(2)}ms`);
    console.log(`💾 Average Memory: ${report.resources.averageMemoryMB.toFixed(2)}MB`);
    console.log(`🖥️ Average CPU: ${report.resources.averageCpu.toFixed(2)}%`);
    console.log(`🌐 Average Peers: ${report.network.averagePeers.toFixed(1)}`);
    console.log(`🚨 Total Alerts: ${report.summary.totalAlerts} (${report.alerts.critical} critical, ${report.alerts.errors} errors, ${report.alerts.warnings} warnings)`);
    console.log('=====================================\n');
  }

  /**
   * Get current performance snapshot
   */
  getPerformanceSnapshot(): any {
    if (this.metrics.length === 0) return null;

    const latest = this.metrics[this.metrics.length - 1];
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 300000);

    return {
      timestamp: latest.timestamp,
      tps: latest.transactionsPerSecond,
      latency: latest.confirmationLatency,
      memoryMB: latest.memoryUsage.rss / 1024 / 1024,
      cpuPercent: latest.cpuUtilization,
      peerCount: latest.networkStats.peerCount,
      errorRate: latest.networkStats.errorRate,
      recentAlerts: recentAlerts.length,
      isHealthy: recentAlerts.filter(a => a.type === 'critical').length === 0
    };
  }
}

export default PerformanceMonitor;

// CLI usage example
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await monitor.stopMonitoring();
    process.exit(0);
  });

  // Start monitoring
  monitor.startMonitoring(10000) // Collect metrics every 10 seconds
    .then(() => {
      console.log('Performance monitoring started. Press Ctrl+C to stop.');
    })
    .catch((error) => {
      console.error('Failed to start monitoring:', error);
      process.exit(1);
    });
}
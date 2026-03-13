/**
 * Enhanced metrics service for Oracle operations
 * Integrates with Prometheus for monitoring Oracle submissions
 */

import { Registry, Counter, Histogram, register } from 'prom-client';

export interface OracleMetrics {
  oracleSubmitTotal: Counter<string>;
  oracleLatencySeconds: Histogram<string>;
}

export class MetricsService {
  private registry: Registry;
  public oracle: OracleMetrics;
  
  constructor(customRegistry?: Registry) {
    this.registry = customRegistry || register;
    
    // Oracle-specific metrics as per MVP requirements
    this.oracle = {
      oracleSubmitTotal: new Counter({
        name: 'oracle_submit_total',
        help: 'Total oracle submissions',
        labelNames: ['status'],
        registers: [this.registry]
      }),
      
      oracleLatencySeconds: new Histogram({
        name: 'oracle_latency_seconds',
        help: 'Oracle ingest to persistence latency in seconds',
        buckets: [0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
        registers: [this.registry]
      })
    };
  }
  
  /**
   * Record Oracle submission with status
   */
  recordOracleSubmission(status: 'ok' | 'error'): void {
    this.oracle.oracleSubmitTotal.inc({ status });
  }
  
  /**
   * Record Oracle latency
   */
  recordOracleLatency(latencySeconds: number): void {
    this.oracle.oracleLatencySeconds.observe(latencySeconds);
  }
  
  /**
   * Get metrics for export
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.registry.clear();
  }
}

// Global metrics instance
export const metricsService = new MetricsService();
import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MonitoringMetricsService {
  private readonly registry = new Registry();

  private readonly accessRequestsTotal = new Counter({
    name: 'quantumvault_access_requests_total',
    help: 'Total access requests processed by the internal secure access engine.',
    labelNames: ['decision', 'classification', 'action'],
    registers: [this.registry],
  });

  private readonly accessPolicyEvalDuration = new Histogram({
    name: 'quantumvault_access_policy_eval_duration_seconds',
    help: 'Duration of access policy evaluations.',
    labelNames: ['decision', 'classification'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [this.registry],
  });

  private readonly accessSessionsTotal = new Counter({
    name: 'quantumvault_access_sessions_total',
    help: 'Lifecycle events for short-lived access sessions.',
    labelNames: ['event', 'classification'],
    registers: [this.registry],
  });

  private readonly accessMaterializationsTotal = new Counter({
    name: 'quantumvault_access_materializations_total',
    help: 'Number of controlled-viewer or inline materialization operations.',
    labelNames: ['mode', 'controlled_viewer'],
    registers: [this.registry],
  });

  private readonly storageOperationsTotal = new Counter({
    name: 'quantumvault_storage_operations_total',
    help: 'Object storage operations by backend and outcome.',
    labelNames: ['operation', 'backend', 'outcome'],
    registers: [this.registry],
  });

  private readonly storageOperationDuration = new Histogram({
    name: 'quantumvault_storage_operation_duration_seconds',
    help: 'Latency of object storage operations.',
    labelNames: ['operation', 'backend', 'outcome'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });

  private readonly storageBackendUp = new Gauge({
    name: 'quantumvault_storage_backend_up',
    help: 'Availability of configured object storage backends.',
    labelNames: ['backend'],
    registers: [this.registry],
  });

  private readonly auditLedgerEventsTotal = new Counter({
    name: 'quantumvault_audit_ledger_events_total',
    help: 'Audit ledger events recorded by type and result.',
    labelNames: ['event_type', 'result'],
    registers: [this.registry],
  });

  private readonly auditAnchorJobsTotal = new Counter({
    name: 'quantumvault_audit_anchor_jobs_total',
    help: 'Outcome of asynchronous blockchain anchoring jobs for audit ledger events.',
    labelNames: ['outcome'],
    registers: [this.registry],
  });

  private readonly siemExportJobsTotal = new Counter({
    name: 'quantumvault_siem_export_jobs_total',
    help: 'Outcome of asynchronous SIEM export jobs for audit ledger events.',
    labelNames: ['outcome'],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({
      prefix: 'quantumvault_backend_',
      register: this.registry,
    });
  }

  getMetricsContentType() {
    return this.registry.contentType;
  }

  async renderMetrics() {
    return this.registry.metrics();
  }

  recordAccessRequest(decision: string, classification: string, action: string) {
    this.accessRequestsTotal.inc({
      decision: String(decision || 'unknown').toLowerCase(),
      classification: String(classification || 'unknown').toLowerCase(),
      action: String(action || 'unknown').toLowerCase(),
    });
  }

  observeAccessPolicyEvaluation(decision: string, classification: string, durationSeconds: number) {
    this.accessPolicyEvalDuration.observe(
      {
        decision: String(decision || 'unknown').toLowerCase(),
        classification: String(classification || 'unknown').toLowerCase(),
      },
      durationSeconds,
    );
  }

  recordAccessSessionEvent(event: string, classification: string) {
    this.accessSessionsTotal.inc({
      event: String(event || 'unknown').toLowerCase(),
      classification: String(classification || 'unknown').toLowerCase(),
    });
  }

  recordAccessMaterialization(mode: string, controlledViewer: boolean) {
    this.accessMaterializationsTotal.inc({
      mode: String(mode || 'inline').toLowerCase(),
      controlled_viewer: controlledViewer ? 'true' : 'false',
    });
  }

  recordStorageOperation(
    operation: string,
    backend: string,
    outcome: 'success' | 'error',
    durationSeconds: number,
  ) {
    const labels = {
      operation: String(operation || 'unknown').toLowerCase(),
      backend: String(backend || 'unknown').toLowerCase(),
      outcome,
    };

    this.storageOperationsTotal.inc(labels);
    this.storageOperationDuration.observe(labels, durationSeconds);
  }

  setStorageBackendAvailability(backend: string, isAvailable: boolean) {
    this.storageBackendUp.set({ backend: String(backend || 'unknown').toLowerCase() }, isAvailable ? 1 : 0);
  }

  recordAuditLedgerEvent(eventType: string, result: string) {
    this.auditLedgerEventsTotal.inc({
      event_type: String(eventType || 'unknown').toLowerCase(),
      result: String(result || 'unknown').toLowerCase(),
    });
  }

  recordAuditAnchorJob(outcome: 'queued' | 'success' | 'failed' | 'skipped') {
    this.auditAnchorJobsTotal.inc({ outcome });
  }

  recordSiemExportJob(outcome: 'queued' | 'success' | 'failed' | 'skipped') {
    this.siemExportJobsTotal.inc({ outcome });
  }
}

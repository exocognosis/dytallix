import { Pool } from 'pg';
import { config } from '../config';

export interface Finding {
  id: number;
  uuid: string;
  tx_hash: string;
  address: string;
  score: number;
  severity: string;
  status: string;
  reasons: string[];
  signature_pq?: string;
  metadata?: any;
  block_height: number;
  timestamp_detected: number;
  timestamp_created: Date;
}

export interface FindingFilters {
  limit: number;
  offset: number;
  severity?: string | undefined;
  status?: string | undefined;
  address?: string | undefined;
  since?: string | undefined;
  scoreMin?: number | undefined;
  scoreMax?: number | undefined;
}

export interface FindingListResult {
  findings: Finding[];
  totalCount: number;
}

export class FindingsService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.username,
      password: config.database.password,
      ssl: config.database.ssl,
      max: config.database.maxConnections,
    });
  }

  async listFindings(filters: FindingFilters): Promise<FindingListResult> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.address) {
      conditions.push(`address = $${paramIndex++}`);
      params.push(filters.address);
    }

    if (filters.since) {
      conditions.push(`timestamp_created >= $${paramIndex++}`);
      params.push(filters.since);
    }

    if (filters.scoreMin !== undefined) {
      conditions.push(`score >= $${paramIndex++}`);
      params.push(filters.scoreMin);
    }

    if (filters.scoreMax !== undefined) {
      conditions.push(`score <= $${paramIndex++}`);
      params.push(filters.scoreMax);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM findings ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get findings
    const query = `
      SELECT id, uuid, tx_hash, address, score, severity, status, reasons,
             signature_pq, metadata, block_height, timestamp_detected, timestamp_created
      FROM findings
      ${whereClause}
      ORDER BY timestamp_created DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(filters.limit, filters.offset);

    const result = await this.pool.query(query, params);

    return {
      findings: result.rows,
      totalCount,
    };
  }

  async getFindingById(id: number): Promise<Finding | null> {
    const query = `
      SELECT id, uuid, tx_hash, address, score, severity, status, reasons,
             signature_pq, metadata, block_height, timestamp_detected, timestamp_created
      FROM findings
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const DB_PATH = path.join(__dirname, '..', 'data', 'leads.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Create leads table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    industry TEXT,
    region TEXT,
    data_types TEXT,
    cryptography TEXT,
    regulatory_regime TEXT,
    org_size TEXT,
    hndl_score INTEGER,
    crqc_score INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    email_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index on email for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)
`);

// Create index on created_at for reporting
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)
`);

logInfo('Leads database initialized', { path: DB_PATH });

/**
 * Save a lead to the database
 * @param {Object} leadData - The lead data to save
 * @returns {Object} - The saved lead with ID
 */
export const saveLead = (leadData) => {
  try {
    const {
      email,
      formData,
      riskScores,
      ipAddress,
      userAgent
    } = leadData;

    const stmt = db.prepare(`
      INSERT INTO leads (
        email, industry, region, data_types, cryptography,
        regulatory_regime, org_size, hndl_score, crqc_score,
        ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      email,
      formData?.industry || null,
      formData?.region || null,
      JSON.stringify(formData?.dataTypes || []),
      JSON.stringify(formData?.cryptography || []),
      formData?.regulatoryRegime || null,
      formData?.orgSize || null,
      riskScores?.hndl || 0,
      riskScores?.crqc || 0,
      ipAddress || null,
      userAgent || null
    );

    logInfo('Lead saved to database', { 
      id: result.lastInsertRowid, 
      email 
    });

    return { 
      id: result.lastInsertRowid, 
      email,
      success: true 
    };
  } catch (error) {
    logError('Failed to save lead', { error: error.message, email: leadData.email });
    throw error;
  }
};

/**
 * Mark a lead as having received their email
 * @param {number} leadId - The lead ID
 */
export const markEmailSent = (leadId) => {
  try {
    const stmt = db.prepare(`
      UPDATE leads SET email_sent = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(leadId);
    logInfo('Lead marked as email sent', { leadId });
  } catch (error) {
    logError('Failed to mark email sent', { error: error.message, leadId });
  }
};

/**
 * Get all leads (for admin/export purposes)
 * @param {Object} options - Query options
 * @returns {Array} - Array of leads
 */
export const getAllLeads = (options = {}) => {
  const { limit = 1000, offset = 0, startDate, endDate } = options;
  
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

/**
 * Get lead statistics
 * @returns {Object} - Statistics about leads
 */
export const getLeadStats = () => {
  const stats = {};

  // Total leads
  stats.total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;

  // Leads by industry
  stats.byIndustry = db.prepare(`
    SELECT industry, COUNT(*) as count 
    FROM leads 
    WHERE industry IS NOT NULL 
    GROUP BY industry 
    ORDER BY count DESC
  `).all();

  // Leads by region
  stats.byRegion = db.prepare(`
    SELECT region, COUNT(*) as count 
    FROM leads 
    WHERE region IS NOT NULL 
    GROUP BY region 
    ORDER BY count DESC
  `).all();

  // Leads by org size
  stats.byOrgSize = db.prepare(`
    SELECT org_size, COUNT(*) as count 
    FROM leads 
    WHERE org_size IS NOT NULL 
    GROUP BY org_size 
    ORDER BY count DESC
  `).all();

  // Average risk scores
  stats.avgRiskScores = db.prepare(`
    SELECT 
      AVG(hndl_score) as avg_hndl, 
      AVG(crqc_score) as avg_crqc 
    FROM leads
  `).get();

  // Leads today
  stats.today = db.prepare(`
    SELECT COUNT(*) as count 
    FROM leads 
    WHERE date(created_at) = date('now')
  `).get().count;

  // Leads this week
  stats.thisWeek = db.prepare(`
    SELECT COUNT(*) as count 
    FROM leads 
    WHERE created_at >= date('now', '-7 days')
  `).get().count;

  // Leads this month
  stats.thisMonth = db.prepare(`
    SELECT COUNT(*) as count 
    FROM leads 
    WHERE created_at >= date('now', '-30 days')
  `).get().count;

  return stats;
};

/**
 * Export leads to CSV format
 * @returns {string} - CSV string
 */
export const exportLeadsToCSV = () => {
  const leads = getAllLeads({ limit: 100000 });
  
  const headers = [
    'ID', 'Email', 'Industry', 'Region', 'Data Types', 'Cryptography',
    'Regulatory Regime', 'Org Size', 'HNDL Score', 'CRQC Score',
    'Email Sent', 'Created At'
  ];

  const rows = leads.map(lead => [
    lead.id,
    lead.email,
    lead.industry || '',
    lead.region || '',
    lead.data_types || '',
    lead.cryptography || '',
    lead.regulatory_regime || '',
    lead.org_size || '',
    lead.hndl_score,
    lead.crqc_score,
    lead.email_sent ? 'Yes' : 'No',
    lead.created_at
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csv;
};

export default {
  saveLead,
  markEmailSent,
  getAllLeads,
  getLeadStats,
  exportLeadsToCSV
};

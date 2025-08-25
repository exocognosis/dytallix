import { api } from '../../lib/api.js'

/**
 * AI Risk Scoring API service module
 */
export class AIRiskService {
  
  /**
   * Get risk assessment for a transaction
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Risk assessment with score, level, and rationale
   */
  async getTxRisk(txHash) {
    try {
      return await api.get(`/ai/risk/transaction/${txHash}`)
    } catch (error) {
      // Gracefully handle 404 or other errors for missing risk data
      if (error.message.includes('404')) {
        return null // No risk data available
      }
      throw error
    }
  }

  /**
   * Get risk assessment for multiple transactions
   * @param {string[]} txHashes - Array of transaction hashes
   * @returns {Promise<Object>} Map of txHash to risk assessment
   */
  async getBulkTxRisk(txHashes) {
    if (!txHashes || txHashes.length === 0) return {}
    
    try {
      return await api.post('/ai/risk/transactions/bulk', { hashes: txHashes })
    } catch (error) {
      console.warn('Bulk risk assessment failed:', error)
      return {}
    }
  }

  /**
   * Get risk assessment for an account
   * @param {string} address - Account address
   * @returns {Promise<Object>} Account risk profile
   */
  async getAccountRisk(address) {
    try {
      return await api.get(`/ai/risk/account/${address}`)
    } catch (error) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Get risk assessment for a contract
   * @param {string} contractAddress - Contract address
   * @returns {Promise<Object>} Contract risk assessment
   */
  async getContractRisk(contractAddress) {
    try {
      return await api.get(`/ai/risk/contract/${contractAddress}`)
    } catch (error) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Submit feedback on risk assessment accuracy
   * @param {string} txHash - Transaction hash
   * @param {Object} feedback - User feedback
   * @param {boolean} feedback.accurate - Whether the assessment was accurate
   * @param {string} [feedback.comments] - Additional comments
   * @param {string} [feedback.expectedLevel] - What level user expected
   * @returns {Promise<Object>} Submission result
   */
  async submitFeedback(txHash, feedback) {
    return api.post(`/ai/risk/feedback/${txHash}`, feedback)
  }

  /**
   * Get AI risk model information
   * @returns {Promise<Object>} Model version, metrics, and metadata
   */
  async getModelInfo() {
    return api.get('/ai/risk/model/info')
  }

  /**
   * Map numeric score to risk level
   * @param {number} score - Numeric risk score (0-1)
   * @returns {string} Risk level (low, medium, high)
   */
  mapScoreToLevel(score) {
    if (score < 0.3) return 'low'
    if (score < 0.7) return 'medium'
    return 'high'
  }

  /**
   * Get risk trends for the network
   * @param {string} [period] - Time period (24h, 7d, 30d)
   * @returns {Promise<Object>} Risk trends and statistics
   */
  async getRiskTrends(period = '7d') {
    return api.get(`/ai/risk/trends?period=${period}`)
  }

  /**
   * Get anomaly detection results
   * @param {Object} options - Query options
   * @param {string} [options.type] - Anomaly type filter
   * @param {string} [options.severity] - Severity filter
   * @param {number} [options.limit] - Results limit
   * @returns {Promise<Object>} Detected anomalies
   */
  async getAnomalies(options = {}) {
    const params = new URLSearchParams()
    if (options.type) params.set('type', options.type)
    if (options.severity) params.set('severity', options.severity)
    if (options.limit) params.set('limit', options.limit)

    return api.get(`/ai/anomalies?${params.toString()}`)
  }
}

/**
 * Enhanced Transactions service with AI risk integration
 */
export class TransactionsService {
  constructor() {
    this.aiRisk = new AIRiskService()
  }

  /**
   * Get transactions with AI risk data
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Number of transactions
   * @param {number} [options.page] - Page number
   * @param {boolean} [options.includeRisk] - Include AI risk data
   * @returns {Promise<Object>} Transactions with risk assessments
   */
  async getTransactions(options = {}) {
    const transactions = await api.get(`/transactions?limit=${options.limit || 20}&page=${options.page || 1}`)
    
    if (options.includeRisk && transactions.data) {
      // Fetch risk data for all transactions
      const hashes = transactions.data.map(tx => tx.hash)
      const riskData = await this.aiRisk.getBulkTxRisk(hashes)
      
      // Merge risk data with transactions
      transactions.data = transactions.data.map(tx => ({
        ...tx,
        risk: riskData[tx.hash] || null
      }))
    }
    
    return transactions
  }

  /**
   * Get single transaction with AI risk data
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction with risk assessment
   */
  async getTransaction(txHash) {
    const [transaction, riskData] = await Promise.all([
      api.get(`/transactions/${txHash}`),
      this.aiRisk.getTxRisk(txHash)
    ])
    
    return {
      ...transaction,
      risk: riskData
    }
  }

  /**
   * Search transactions with AI risk filtering
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.address] - Address filter
   * @param {string} [criteria.type] - Transaction type
   * @param {string} [criteria.riskLevel] - Risk level filter
   * @param {string} [criteria.fromDate] - Start date
   * @param {string} [criteria.toDate] - End date
   * @returns {Promise<Object>} Filtered transactions with risk data
   */
  async searchTransactions(criteria) {
    const params = new URLSearchParams()
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString())
      }
    })

    const transactions = await api.get(`/transactions/search?${params.toString()}`)
    
    if (transactions.data) {
      const hashes = transactions.data.map(tx => tx.hash)
      const riskData = await this.aiRisk.getBulkTxRisk(hashes)
      
      transactions.data = transactions.data.map(tx => ({
        ...tx,
        risk: riskData[tx.hash] || null
      }))
    }
    
    return transactions
  }
}

export const aiRiskService = new AIRiskService()
export const transactionsService = new TransactionsService()

export default { aiRiskService, transactionsService }
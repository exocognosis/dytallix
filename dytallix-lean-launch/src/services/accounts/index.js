import { api } from '../../lib/api.js'

/**
 * Accounts API service module
 */
export class AccountsService {
  
  /**
   * Get account balances
   * @param {string} address - Account address
   * @returns {Promise<Object>} Account balances for all denominations
   */
  async getBalances(address) {
    return api.get(`/accounts/${address}/balances`)
  }

  /**
   * Get account transactions
   * @param {string} address - Account address
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Number of transactions to fetch
   * @param {number} [options.page] - Page number
   * @param {string} [options.type] - Filter by transaction type
   * @returns {Promise<Object>} Account transactions with pagination
   */
  async getAccountTxs(address, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.page) params.set('page', options.page)
    if (options.type) params.set('type', options.type)

    return api.get(`/accounts/${address}/transactions?${params.toString()}`)
  }

  /**
   * Get comprehensive account overview
   * @param {string} address - Account address
   * @returns {Promise<Object>} Account overview with balances, staking, and summary
   */
  async getAccountOverview(address) {
    return api.get(`/accounts/${address}`)
  }

  /**
   * Get account staking positions
   * @param {string} address - Account address
   * @returns {Promise<Object>} Delegations, unbonding, and rewards
   */
  async getStakingPositions(address) {
    return api.get(`/accounts/${address}/staking`)
  }

  /**
   * Get account's governance participation
   * @param {string} address - Account address
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Number of proposals to fetch
   * @param {number} [options.page] - Page number
   * @returns {Promise<Object>} Governance votes and proposals
   */
  async getGovernanceActivity(address, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.page) params.set('page', options.page)

    return api.get(`/accounts/${address}/governance?${params.toString()}`)
  }

  /**
   * Get account's contract interactions
   * @param {string} address - Account address
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Number of interactions to fetch
   * @param {number} [options.page] - Page number
   * @returns {Promise<Object>} Contract deployments and executions
   */
  async getContractActivity(address, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.page) params.set('page', options.page)

    return api.get(`/accounts/${address}/contracts?${params.toString()}`)
  }

  /**
   * Get account statistics
   * @param {string} address - Account address
   * @returns {Promise<Object>} Account statistics and metrics
   */
  async getAccountStats(address) {
    return api.get(`/accounts/${address}/stats`)
  }

  /**
   * Get account's recent activity summary
   * @param {string} address - Account address
   * @param {number} [days] - Number of days to look back (default: 30)
   * @returns {Promise<Object>} Activity summary
   */
  async getActivitySummary(address, days = 30) {
    return api.get(`/accounts/${address}/activity?days=${days}`)
  }

  /**
   * Search accounts by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.address] - Address pattern
   * @param {string} [criteria.minBalance] - Minimum balance
   * @param {boolean} [criteria.hasStaking] - Has staking positions
   * @param {boolean} [criteria.hasContracts] - Has contract interactions
   * @returns {Promise<Object>} Matching accounts
   */
  async searchAccounts(criteria) {
    const params = new URLSearchParams()
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString())
      }
    })

    return api.get(`/accounts/search?${params.toString()}`)
  }

  /**
   * Get account transaction history with filters
   * @param {string} address - Account address
   * @param {Object} filters - Transaction filters
   * @param {string} [filters.type] - Transaction type filter
   * @param {string} [filters.fromDate] - Start date (ISO string)
   * @param {string} [filters.toDate] - End date (ISO string)
   * @param {string} [filters.minAmount] - Minimum amount filter
   * @param {string} [filters.maxAmount] - Maximum amount filter
   * @param {number} [filters.limit] - Results limit
   * @param {number} [filters.page] - Page number
   * @returns {Promise<Object>} Filtered transaction history
   */
  async getFilteredTxHistory(address, filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString())
      }
    })

    return api.get(`/accounts/${address}/transactions/filtered?${params.toString()}`)
  }

  /**
   * Get account portfolio value over time
   * @param {string} address - Account address
   * @param {string} [period] - Time period (24h, 7d, 30d, 90d, 1y)
   * @returns {Promise<Object>} Portfolio value history
   */
  async getPortfolioHistory(address, period = '30d') {
    return api.get(`/accounts/${address}/portfolio?period=${period}`)
  }
}

export const accountsService = new AccountsService()
export default accountsService
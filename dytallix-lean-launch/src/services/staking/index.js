import { api } from '../../lib/api.js'

/**
 * Staking API service module
 */
export class StakingService {
  
  /**
   * List all validators
   * @param {Object} options - Query options
   * @param {string} [options.status] - Filter by status (active, inactive)
   * @param {string} [options.sortBy] - Sort by field (votingPower, commission, uptime)
   * @param {string} [options.order] - Sort order (asc, desc)
   * @returns {Promise<Object>} Validators list
   */
  async listValidators(options = {}) {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.sortBy) params.set('sortBy', options.sortBy)
    if (options.order) params.set('order', options.order)

    return api.get(`/staking/validators?${params.toString()}`)
  }

  /**
   * Get validator details
   * @param {string} validatorAddress - Validator address
   * @returns {Promise<Object>} Validator information
   */
  async getValidator(validatorAddress) {
    return api.get(`/staking/validators/${validatorAddress}`)
  }

  /**
   * Delegate tokens to a validator
   * @param {string} validatorAddress - Validator address
   * @param {string} amount - Amount to delegate (in base units)
   * @param {string} delegatorAddress - Delegator address
   * @returns {Promise<Object>} Delegation transaction result
   */
  async delegate(validatorAddress, amount, delegatorAddress) {
    return api.post('/staking/delegate', {
      validator: validatorAddress,
      amount,
      delegator: delegatorAddress
    })
  }

  /**
   * Undelegate tokens from a validator
   * @param {string} validatorAddress - Validator address
   * @param {string} amount - Amount to undelegate (in base units)
   * @param {string} delegatorAddress - Delegator address
   * @returns {Promise<Object>} Undelegation transaction result
   */
  async undelegate(validatorAddress, amount, delegatorAddress) {
    return api.post('/staking/undelegate', {
      validator: validatorAddress,
      amount,
      delegator: delegatorAddress
    })
  }

  /**
   * Redelegate tokens from one validator to another
   * @param {string} srcValidatorAddress - Source validator address
   * @param {string} dstValidatorAddress - Destination validator address
   * @param {string} amount - Amount to redelegate
   * @param {string} delegatorAddress - Delegator address
   * @returns {Promise<Object>} Redelegation transaction result
   */
  async redelegate(srcValidatorAddress, dstValidatorAddress, amount, delegatorAddress) {
    return api.post('/staking/redelegate', {
      srcValidator: srcValidatorAddress,
      dstValidator: dstValidatorAddress,
      amount,
      delegator: delegatorAddress
    })
  }

  /**
   * Get delegations for an address
   * @param {string} delegatorAddress - Delegator address
   * @returns {Promise<Object>} Delegations list
   */
  async getDelegations(delegatorAddress) {
    return api.get(`/staking/delegations/${delegatorAddress}`)
  }

  /**
   * Get unbonding delegations for an address
   * @param {string} delegatorAddress - Delegator address
   * @returns {Promise<Object>} Unbonding delegations list
   */
  async getUnbondingDelegations(delegatorAddress) {
    return api.get(`/staking/unbonding/${delegatorAddress}`)
  }

  /**
   * Get staking rewards for an address
   * @param {string} delegatorAddress - Delegator address
   * @param {string} [validatorAddress] - Specific validator (optional)
   * @returns {Promise<Object>} Rewards information
   */
  async getRewards(delegatorAddress, validatorAddress = null) {
    const endpoint = validatorAddress 
      ? `/staking/rewards/${delegatorAddress}/${validatorAddress}`
      : `/staking/rewards/${delegatorAddress}`
    
    return api.get(endpoint)
  }

  /**
   * Claim staking rewards
   * @param {string} delegatorAddress - Delegator address
   * @param {string[]} [validatorAddresses] - Specific validators (optional, claims from all if not specified)
   * @returns {Promise<Object>} Claim transaction result
   */
  async claimRewards(delegatorAddress, validatorAddresses = []) {
    return api.post('/staking/claim', {
      delegator: delegatorAddress,
      validators: validatorAddresses
    })
  }

  /**
   * Get staking pool information
   * @returns {Promise<Object>} Staking pool data
   */
  async getPool() {
    return api.get('/staking/pool')
  }

  /**
   * Get staking parameters
   * @returns {Promise<Object>} Staking parameters
   */
  async getParams() {
    return api.get('/staking/params')
  }

  /**
   * Get validator signing info
   * @param {string} validatorAddress - Validator address
   * @returns {Promise<Object>} Signing information and uptime
   */
  async getSigningInfo(validatorAddress) {
    return api.get(`/staking/validators/${validatorAddress}/signing`)
  }

  /**
   * Estimate rewards for a delegation amount
   * @param {string} validatorAddress - Validator address
   * @param {string} amount - Amount to delegate
   * @returns {Promise<Object>} Estimated rewards
   */
  async estimateRewards(validatorAddress, amount) {
    return api.post('/staking/estimate-rewards', {
      validator: validatorAddress,
      amount
    })
  }
}

export const stakingService = new StakingService()
export default stakingService
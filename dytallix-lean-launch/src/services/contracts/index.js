import { api } from '../../lib/api.js'

/**
 * Contracts API service module
 */
export class ContractsService {
  
  /**
   * Deploy a WASM contract
   * @param {File} wasmFile - WASM binary file
   * @param {Object} [initMsg] - Instantiation message
   * @param {string} deployer - Deployer address
   * @returns {Promise<Object>} Deployment result with code hash and address
   */
  async deployWasm(wasmFile, initMsg = {}, deployer) {
    if (!wasmFile) throw new Error('WASM file is required')
    
    // Validate file size (100KB limit as per requirements)
    const MAX_SIZE = 100 * 1024
    if (wasmFile.size > MAX_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_SIZE} bytes`)
    }

    // Validate file extension
    if (!wasmFile.name.endsWith('.wasm')) {
      throw new Error('File must have .wasm extension')
    }

    const formData = new FormData()
    formData.append('wasm', wasmFile)
    formData.append('initMsg', JSON.stringify(initMsg))
    formData.append('deployer', deployer)

    const response = await fetch('/api/contracts/deploy', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) throw new Error(`Deploy failed: ${response.status}`)
    return response.json()
  }

  /**
   * Execute a contract method
   * @param {string} contractAddress - Contract address
   * @param {string} method - Method name
   * @param {Object} args - Method arguments
   * @param {string} sender - Sender address
   * @param {Object} [options] - Transaction options (gas, fee)
   * @returns {Promise<Object>} Execution result with events
   */
  async execute(contractAddress, method, args, sender, options = {}) {
    const payload = {
      contract: contractAddress,
      method,
      args,
      sender,
      ...options
    }

    return api.post(`/contracts/${contractAddress}/execute`, payload)
  }

  /**
   * Query a contract (read-only)
   * @param {string} contractAddress - Contract address
   * @param {string} method - Query method name
   * @param {Object} args - Query arguments
   * @returns {Promise<Object>} Query result
   */
  async query(contractAddress, method, args = {}) {
    const params = new URLSearchParams({
      method,
      args: JSON.stringify(args)
    })

    return api.get(`/contracts/${contractAddress}/state?${params.toString()}`)
  }

  /**
   * Get contract details
   * @param {string} contractAddress - Contract address
   * @returns {Promise<Object>} Contract information
   */
  async getContract(contractAddress) {
    return api.get(`/contracts/${contractAddress}`)
  }

  /**
   * List contracts with optional filtering
   * @param {Object} options - Query options
   * @param {string} [options.creator] - Filter by creator address
   * @param {string} [options.codeHash] - Filter by code hash
   * @param {number} [options.limit] - Limit results
   * @param {number} [options.page] - Page number
   * @returns {Promise<Object>} Contracts list with pagination
   */
  async listContracts(options = {}) {
    const params = new URLSearchParams()
    if (options.creator) params.set('creator', options.creator)
    if (options.codeHash) params.set('codeHash', options.codeHash)
    if (options.limit) params.set('limit', options.limit)
    if (options.page) params.set('page', options.page)

    return api.get(`/contracts?${params.toString()}`)
  }

  /**
   * Get contract execution history
   * @param {string} contractAddress - Contract address
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Limit results
   * @param {number} [options.page] - Page number
   * @returns {Promise<Object>} Execution history
   */
  async getExecutionHistory(contractAddress, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.page) params.set('page', options.page)

    return api.get(`/contracts/${contractAddress}/executions?${params.toString()}`)
  }

  /**
   * Get contract state preview (size-limited for security)
   * @param {string} contractAddress - Contract address
   * @param {number} [maxKeys] - Maximum number of keys to return
   * @returns {Promise<Object>} Safe state preview
   */
  async getStatePreview(contractAddress, maxKeys = 10) {
    const params = new URLSearchParams({ maxKeys: maxKeys.toString() })
    return api.get(`/contracts/${contractAddress}/state/preview?${params.toString()}`)
  }

  /**
   * Estimate gas for contract execution
   * @param {string} contractAddress - Contract address
   * @param {string} method - Method name
   * @param {Object} args - Method arguments
   * @param {string} sender - Sender address
   * @returns {Promise<Object>} Gas estimation
   */
  async estimateGas(contractAddress, method, args, sender) {
    return api.post(`/contracts/${contractAddress}/estimate`, {
      method,
      args,
      sender
    })
  }
}

export const contractsService = new ContractsService()
export default contractsService
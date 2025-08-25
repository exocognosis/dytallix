import { api } from '../../lib/api.js'

/**
 * Governance API service module
 */
export class GovernanceService {
  
  /**
   * List all governance proposals
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Number of proposals to fetch
   * @param {number} [options.page] - Page number
   * @param {string} [options.status] - Filter by status (active, passed, rejected, etc.)
   * @returns {Promise<Object>} Proposals list with pagination
   */
  async listProposals(options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.page) params.set('page', options.page)
    if (options.status) params.set('status', options.status)
    
    return api.get(`/governance/proposals?${params.toString()}`)
  }

  /**
   * Get detailed proposal information
   * @param {string|number} proposalId - Proposal ID
   * @returns {Promise<Object>} Proposal details
   */
  async getProposal(proposalId) {
    return api.get(`/governance/proposals/${proposalId}`)
  }

  /**
   * Get current tally for a proposal
   * @param {string|number} proposalId - Proposal ID
   * @returns {Promise<Object>} Current vote tallies
   */
  async getProposalTally(proposalId) {
    return api.get(`/governance/proposals/${proposalId}/tally`)
  }

  /**
   * Submit a vote on a proposal
   * @param {string|number} proposalId - Proposal ID
   * @param {string} option - Vote option (yes, no, abstain, no_with_veto)
   * @param {string} voterAddress - Voter's address
   * @returns {Promise<Object>} Transaction result
   */
  async submitVote(proposalId, option, voterAddress) {
    return api.post(`/governance/proposals/${proposalId}/vote`, {
      option,
      voter: voterAddress
    })
  }

  /**
   * Submit a new proposal
   * @param {Object} proposal - Proposal data
   * @param {string} proposal.title - Proposal title
   * @param {string} proposal.description - Proposal description
   * @param {string} proposal.type - Proposal type
   * @param {string} proposal.submitter - Submitter address
   * @param {Array} [proposal.initialDeposit] - Initial deposit coins
   * @returns {Promise<Object>} Transaction result
   */
  async submitProposal(proposal) {
    return api.post('/governance/proposals', proposal)
  }

  /**
   * Subscribe to tally updates via WebSocket
   * @param {string|number} proposalId - Proposal ID
   * @param {Function} callback - Callback for tally updates
   * @returns {Function} Unsubscribe function
   */
  subscribeTallies(proposalId, callback) {
    // Mock implementation - in real app this would use WebSocket
    const interval = setInterval(async () => {
      try {
        const tally = await this.getProposalTally(proposalId)
        callback(tally)
      } catch (error) {
        console.error('Tally update error:', error)
      }
    }, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }

  /**
   * Get governance parameters
   * @returns {Promise<Object>} Governance parameters
   */
  async getParams() {
    return api.get('/governance/params')
  }
}

export const governanceService = new GovernanceService()
export default governanceService
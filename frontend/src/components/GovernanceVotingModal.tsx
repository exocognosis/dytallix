import { useState } from 'react'
import { XMarkIcon, ScaleIcon, CheckIcon } from '@heroicons/react/24/outline'
import { EmissionProposal, GovernanceVotingPower } from '../types/tokenomics'
import toast from 'react-hot-toast'

interface GovernanceVotingModalProps {
  isOpen: boolean
  onClose: () => void
  proposals: EmissionProposal[]
  votingPower?: GovernanceVotingPower
}

export function GovernanceVotingModal({ isOpen, onClose, proposals, votingPower }: GovernanceVotingModalProps) {
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)
  const [voteChoice, setVoteChoice] = useState<'for' | 'against' | null>(null)
  const [voting, setVoting] = useState(false)

  const handleVote = async () => {
    if (!selectedProposal || !voteChoice || !votingPower) {
      toast.error('Please select a proposal and vote choice')
      return
    }

    setVoting(true)
    
    try {
      // Mock implementation - replace with actual governance contract call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(`Vote "${voteChoice}" submitted successfully!`)
      onClose()
      setSelectedProposal(null)
      setVoteChoice(null)
    } catch (error) {
      toast.error('Voting failed')
    } finally {
      setVoting(false)
    }
  }

  const activeProposals = proposals.filter(p => p.status === 'active')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <ScaleIcon className="w-6 h-6 mr-2" />
            Governance Voting
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Voting Power Display */}
        {votingPower && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-2">Your Voting Power</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{votingPower.dgtBalance.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">DGT Balance</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{votingPower.votingPower.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Voting Power</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{votingPower.votingPercentage.toFixed(4)}%</p>
                <p className="text-gray-400 text-sm">of Total Supply</p>
              </div>
            </div>
          </div>
        )}

        {/* Proposal Selection */}
        <div className="space-y-4 mb-6">
          <h3 className="text-white font-medium">Select Proposal to Vote On</h3>
          
          {activeProposals.length === 0 ? (
            <div className="text-center py-8">
              <ScaleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No active proposals</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check back later for new governance proposals.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedProposal === proposal.id
                      ? 'bg-blue-900/30 border-blue-500'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedProposal(proposal.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{proposal.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{proposal.description}</p>
                      
                      <div className="flex items-center space-x-4 mt-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 text-sm">
                            For: {proposal.votesFor.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-red-400 text-sm">
                            Against: {proposal.votesAgainst.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          Ends: {new Date(proposal.votingDeadline).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Voting Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Voting Progress</span>
                          <span>
                            {((proposal.votesFor + proposal.votesAgainst) / 1000000 * 100).toFixed(1)}% participated
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-green-400" 
                              style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                            ></div>
                            <div 
                              className="bg-red-400" 
                              style={{ width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {selectedProposal === proposal.id && (
                      <CheckIcon className="w-6 h-6 text-blue-400 ml-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vote Choice */}
        {selectedProposal && (
          <div className="space-y-4 mb-6">
            <h3 className="text-white font-medium">Cast Your Vote</h3>
            <div className="flex space-x-4">
              <button
                onClick={() => setVoteChoice('for')}
                className={`flex-1 p-4 rounded-lg border transition-colors ${
                  voteChoice === 'for'
                    ? 'bg-green-900/30 border-green-500 text-green-400'
                    : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                }`}
              >
                <CheckIcon className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Vote For</p>
                <p className="text-sm opacity-75">Support this proposal</p>
              </button>
              
              <button
                onClick={() => setVoteChoice('against')}
                className={`flex-1 p-4 rounded-lg border transition-colors ${
                  voteChoice === 'against'
                    ? 'bg-red-900/30 border-red-500 text-red-400'
                    : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                }`}
              >
                <XMarkIcon className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Vote Against</p>
                <p className="text-sm opacity-75">Reject this proposal</p>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVote}
            disabled={!selectedProposal || !voteChoice || voting || !votingPower}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {voting ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </div>

        {!votingPower && (
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500 rounded-lg">
            <p className="text-yellow-400 text-sm">
              You need DGT tokens to participate in governance voting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

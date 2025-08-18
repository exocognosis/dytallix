import { useState, useEffect } from 'react'
import { 
  BuildingLibraryIcon,
  PlusIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { useGovernanceData } from '../hooks/useAPI'
import { format } from 'date-fns'

interface Proposal {
  id: number
  title: string
  description: string
  status: 'active' | 'passed' | 'rejected' | 'expired'
  votesFor: number
  votesAgainst: number
  totalVotes: number
  createdAt: string
  votingDeadline: string
  proposalType: 'standard' | 'tokenomics' | 'upgrade' | 'parameter'
}

export function Governance() {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [userVotes, setUserVotes] = useState<Record<number, 'for' | 'against'>>({})
  
  // Use real API hook that we'll implement
  const { data: proposals, isLoading } = useGovernanceData()

  // Mock data for now - will be replaced with real API
  const mockProposals: Proposal[] = [
    {
      id: 1,
      title: "Increase Block Size Limit",
      description: "Proposal to increase the maximum block size from 1MB to 2MB to improve transaction throughput",
      status: 'active',
      votesFor: 1250000,
      votesAgainst: 340000,
      totalVotes: 1590000,
      createdAt: '2024-01-15T10:00:00Z',
      votingDeadline: '2024-02-15T10:00:00Z',
      proposalType: 'parameter'
    },
    {
      id: 2,
      title: "DRT Emission Rate Adjustment",
      description: "Reduce DRT emission rate from 1 DRT per block to 0.8 DRT per block to control inflation",
      status: 'active',
      votesFor: 2100000,
      votesAgainst: 890000,
      totalVotes: 2990000,
      createdAt: '2024-01-10T09:00:00Z',
      votingDeadline: '2024-02-10T09:00:00Z',
      proposalType: 'tokenomics'
    },
    {
      id: 3,
      title: "Quantum-Resistant Upgrade",
      description: "Implement SPHINCS+ signature scheme for enhanced post-quantum security",
      status: 'passed',
      votesFor: 3450000,
      votesAgainst: 150000,
      totalVotes: 3600000,
      createdAt: '2023-12-01T08:00:00Z',
      votingDeadline: '2024-01-01T08:00:00Z',
      proposalType: 'upgrade'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <ClockIcon className="w-5 h-5 text-blue-400" />
      case 'passed': return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'rejected': return <XCircleIcon className="w-5 h-5 text-red-400" />
      case 'expired': return <FireIcon className="w-5 h-5 text-orange-400" />
      default: return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      case 'passed': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20'
      case 'expired': return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  const handleVote = (proposalId: number, vote: 'for' | 'against') => {
    setUserVotes(prev => ({ ...prev, [proposalId]: vote }))
    // Here we would call the actual voting API
    console.log(`Voting ${vote} on proposal ${proposalId}`)
  }

  return (
    <main className="bg-black text-white min-h-screen px-6 py-12">
      {/* Header */}
      <section className="max-w-7xl mx-auto mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center justify-center">
            <BuildingLibraryIcon className="w-12 h-12 mr-4" />
            Governance Hub
          </h1>
          <p className="text-lg text-gray-300">
            Participate in Dytallix DAO governance and shape the future of the network
          </p>
        </motion.div>
      </section>

      {/* Governance Stats */}
      <section className="max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-700/30 border-purple-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Total Proposals</p>
                  <p className="text-2xl font-bold text-white">47</p>
                </div>
                <BuildingLibraryIcon className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-700/30 border-green-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300">Active Proposals</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
                <ClockIcon className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 border-blue-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300">Total Voters</p>
                  <p className="text-2xl font-bold text-white">12,847</p>
                </div>
                <HandThumbUpIcon className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-700/30 border-orange-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">Voting Power</p>
                  <p className="text-2xl font-bold text-white">8.5M DGT</p>
                </div>
                <FireIcon className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Proposals List */}
      <section className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Active Proposals</h2>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </div>

        <div className="space-y-6">
          {mockProposals.map((proposal) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: proposal.id * 0.1 }}
            >
              <Card className="bg-dashboard-card border-dashboard-border hover:border-dashboard-border-hover transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-dashboard-text">#{proposal.id} {proposal.title}</CardTitle>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                          {getStatusIcon(proposal.status)}
                          <span className="ml-1 capitalize">{proposal.status}</span>
                        </span>
                      </div>
                      <p className="text-dashboard-text-muted text-sm mb-4">{proposal.description}</p>
                      
                      {/* Voting Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">For: {proposal.votesFor.toLocaleString()} DGT</span>
                          <span className="text-red-400">Against: {proposal.votesAgainst.toLocaleString()} DGT</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" 
                            style={{ width: `${(proposal.votesFor / proposal.totalVotes) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Created: {format(new Date(proposal.createdAt), 'MMM dd, yyyy')}</span>
                          <span>Deadline: {format(new Date(proposal.votingDeadline), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {proposal.status === 'active' && (
                  <CardContent className="pt-0">
                    <div className="flex space-x-4">
                      <Button 
                        variant={userVotes[proposal.id] === 'for' ? 'default' : 'outline'}
                        onClick={() => handleVote(proposal.id, 'for')}
                        className="flex-1"
                      >
                        <HandThumbUpIcon className="w-4 h-4 mr-2" />
                        Vote For
                      </Button>
                      <Button 
                        variant={userVotes[proposal.id] === 'against' ? 'destructive' : 'outline'}
                        onClick={() => handleVote(proposal.id, 'against')}
                        className="flex-1"
                      >
                        <HandThumbDownIcon className="w-4 h-4 mr-2" />
                        Vote Against
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  )
}
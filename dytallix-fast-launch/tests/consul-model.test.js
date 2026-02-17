import { describe, expect, it } from 'vitest'
import {
  simulateProposalRisk,
  applyOraclePersona,
  computeQuorum,
  shouldFileDispute,
} from '../server/services/consul/model.js'

describe('Consul model', () => {
  it('increases modeled risk when participation is weak', () => {
    const strongParticipation = simulateProposalRisk({
      id: 1001,
      title: 'Raise gas limit',
      status: 'VotingPeriod',
      type: 'ParameterChange(gas_limit)',
      current_tally: {
        yes: '700000',
        no: '80000',
        abstain: '20000',
        no_with_veto: '10000',
        total_voting_power: '1000000',
        participating_voting_power: '810000',
        quorum_met: true,
      },
    })

    const weakParticipation = simulateProposalRisk({
      id: 1002,
      title: 'Raise gas limit',
      status: 'VotingPeriod',
      type: 'ParameterChange(gas_limit)',
      current_tally: {
        yes: '120000',
        no: '60000',
        abstain: '50000',
        no_with_veto: '30000',
        total_voting_power: '1000000',
        participating_voting_power: '260000',
        quorum_met: false,
      },
    })

    expect(weakParticipation.riskScore01).toBeGreaterThan(strongParticipation.riskScore01)
  })

  it('oracle personas should perturb risk but stay bounded', () => {
    const base = simulateProposalRisk({
      id: 1003,
      title: 'Change veto threshold',
      status: 'VotingPeriod',
      type: 'ParameterChange(veto_threshold)',
      current_tally: {
        yes: '400000',
        no: '300000',
        abstain: '50000',
        no_with_veto: '25000',
        total_voting_power: '1000000',
        participating_voting_power: '775000',
        quorum_met: true,
      },
    })

    const peer = applyOraclePersona(base, 2)
    expect(peer.riskScore01).not.toBe(base.riskScore01)
    expect(peer.riskScore01).toBeGreaterThanOrEqual(0)
    expect(peer.riskScore01).toBeLessThanOrEqual(1)
  })

  it('quorum and dispute logic flags disagreement patterns', () => {
    const attestations = [
      { oracle_id: 'consul-primary', recommendation: 'support', risk_score: 0.34 },
      { oracle_id: 'consul-peer-1', recommendation: 'reject', risk_score: 0.72 },
      { oracle_id: 'consul-peer-2', recommendation: 'escalate', risk_score: 0.69 },
    ]

    const quorum = computeQuorum(attestations, 2)
    expect(quorum.uniqueOracles).toBe(3)
    expect(quorum.disputed).toBe(true)
    expect(shouldFileDispute(quorum, attestations)).toBe(true)
  })
})

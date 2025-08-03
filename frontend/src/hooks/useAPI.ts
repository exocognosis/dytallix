import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Transaction, TransactionRequest } from '../types'
import toast from 'react-hot-toast'

// Query keys
export const QUERY_KEYS = {
  BLOCKCHAIN_STATS: 'blockchain-stats',
  TRANSACTIONS: 'transactions',
  TRANSACTION: 'transaction',
  BALANCE: 'balance',
  BLOCKS: 'blocks',
  BLOCK: 'block',
  CONTRACTS: 'contracts',
  CONTRACT: 'contract',
  AI_HEALTH: 'ai-health',
  AI_STATS: 'ai-stats',
  AI_MODULE_STATUS: 'ai-module-status',
  SYSTEM_METRICS: 'system-metrics',
  NETWORK_ACTIVITY: 'network-activity',
  POST_QUANTUM_STATUS: 'post-quantum-status',
} as const

// Blockchain queries
export function useBlockchainStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.BLOCKCHAIN_STATS],
    queryFn: () => api.getStats(),
    refetchInterval: 5000, // Refresh every 5 seconds
  })
}

export function useTransactions(account?: string, limit: number = 10) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS, account, limit],
    queryFn: () => api.listTransactions(account, limit),
    refetchInterval: 10000, // Refresh every 10 seconds
  })
}

export function useTransaction(hash: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSACTION, hash],
    queryFn: () => api.getTransaction(hash),
    enabled: !!hash,
    refetchInterval: 5000,
  })
}

export function useBalance(address: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.BALANCE, address],
    queryFn: () => api.getBalance(address),
    enabled: !!address,
    refetchInterval: 10000,
  })
}

export function useBlocks(limit: number = 10) {
  return useQuery({
    queryKey: [QUERY_KEYS.BLOCKS, limit],
    queryFn: () => api.getBlocks(limit),
    refetchInterval: 15000, // Refresh every 15 seconds
  })
}

export function useContracts() {
  return useQuery({
    queryKey: [QUERY_KEYS.CONTRACTS],
    queryFn: () => api.listContracts(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// AI Service queries
export function useAIHealth() {
  return useQuery(
    QUERY_KEYS.AI_HEALTH,
    () => api.getAIHealth(),
    {
      refetchInterval: 30000,
      retry: 2,
    }
  )
}

export function useAIStatistics() {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_STATS],
    queryFn: () => api.getAIStatistics(),
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useAIModuleStatus() {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_MODULE_STATUS],
    queryFn: () => api.getAIModuleStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
  })
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: [QUERY_KEYS.SYSTEM_METRICS],
    queryFn: () => api.getSystemMetrics(),
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
    retry: 3,
  })
}

export function useNetworkActivity() {
  return useQuery({
    queryKey: [QUERY_KEYS.NETWORK_ACTIVITY],
    queryFn: () => api.getNetworkActivity(),
    refetchInterval: 15000, // Refresh every 15 seconds
    retry: 2,
  })
}

export function usePostQuantumStatus() {
  return useQuery({
    queryKey: [QUERY_KEYS.POST_QUANTUM_STATUS],
    queryFn: () => api.getPostQuantumStatus(),
    refetchInterval: 60000, // Refresh every minute (status changes rarely)
    retry: 2,
  })
}

// Mutations
export function useSubmitTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transaction: TransactionRequest) => api.submitTransaction(transaction),
    onSuccess: () => {
      toast.success('Transaction submitted successfully!')
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BLOCKCHAIN_STATS] })
    },
    onError: (error: any) => {
      toast.error(`Transaction failed: ${error.message || 'Unknown error'}`)
    },
  })
}

export function useGenerateKeyPair() {
  return useMutation({
    mutationFn: (algorithm: 'dilithium' | 'falcon' | 'sphincs') => 
      api.generateKeyPair(algorithm),
    onSuccess: () => {
      toast.success('Key pair generated successfully!')
    },
    onError: (error: any) => {
      toast.error(`Key generation failed: ${error.message || 'Unknown error'}`)
    },
  })
}

export function useDeployContract() {
  const queryClient = useQueryClient()

  return useMutation(
    ({ code, abi }: { code: string; abi: any[] }) => 
      api.deployContract(code, abi),
    {
      onSuccess: () => {
        toast.success('Smart contract deployed successfully!')
        queryClient.invalidateQueries(QUERY_KEYS.CONTRACTS)
      },
      onError: (error: any) => {
        toast.error(`Contract deployment failed: ${error.message || 'Unknown error'}`)
      },
    }
  )
}

export function useAnalyzeFraud() {
  return useMutation(
    (transaction: Transaction) => api.analyzeFraud(transaction),
    {
      onSuccess: () => {
        toast.success('Fraud analysis completed')
      },
      onError: (error: any) => {
        toast.error(`Fraud analysis failed: ${error.message || 'Unknown error'}`)
      },
    }
  )
}

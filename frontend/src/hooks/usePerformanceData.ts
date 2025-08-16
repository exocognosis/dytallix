import { useQuery } from 'react-query'
import api from '../services/api'

// Performance dashboard data hook that aggregates all metrics
export function usePerformanceDashboardData() {
  return useQuery(
    'performance-dashboard',
    async () => {
      // Fetch all data in parallel for better performance
      const [stats, systemMetrics, networkActivity] = await Promise.allSettled([
        api.getStats(),
        api.getSystemMetrics(),
        api.getNetworkActivity()
      ])

      // Extract successful results or provide fallback data
      const blockchainStats = stats.status === 'fulfilled' ? stats.value.data : null
      const system = systemMetrics.status === 'fulfilled' ? systemMetrics.value.data : null
      const network = networkActivity.status === 'fulfilled' ? networkActivity.value.data : null

      return {
        systemCards: system,
        blockchainCards: blockchainStats,
        networkActivity: network?.network_activity || []
      }
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
      retry: 2,
      onError: (error) => {
        console.error('Performance dashboard data fetch failed:', error)
      }
    }
  )
}

// Individual metric hooks for more granular control
export function useSystemPerformanceMetrics() {
  return useQuery(
    'system-performance-metrics',
    () => api.getSystemMetrics(),
    {
      refetchInterval: 10000,
      retry: 2,
      onError: (error) => {
        console.error('System metrics fetch failed:', error)
      }
    }
  )
}

export function useBlockchainPerformanceMetrics() {
  return useQuery(
    'blockchain-performance-metrics',
    () => api.getStats(),
    {
      refetchInterval: 5000,
      retry: 2,
      onError: (error) => {
        console.error('Blockchain metrics fetch failed:', error)
      }
    }
  )
}

export function useAIModulePerformanceMetrics() {
  return useQuery(
    'ai-module-performance-metrics',
    () => api.getAIModuleStatus(),
    {
      refetchInterval: 15000,
      retry: 2,
      onError: (error) => {
        console.error('AI module metrics fetch failed:', error)
      }
    }
  )
}

export function useNetworkActivityMetrics() {
  return useQuery(
    'network-activity-metrics',
    () => api.getNetworkActivity(),
    {
      refetchInterval: 10000,
      retry: 2,
      onError: (error) => {
        console.error('Network activity metrics fetch failed:', error)
      }
    }
  )
}

export function useAIHealthStatus() {
  return useQuery(
    'ai-health-status',
    () => api.getAIHealth(),
    {
      refetchInterval: 30000,
      retry: 2,
      onError: (error) => {
        console.error('AI health status fetch failed:', error)
      }
    }
  )
}
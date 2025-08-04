import { useQuery } from 'react-query'
import { performanceDataService, PerformanceMetrics, AIModuleData } from '../services/performanceDataService'

// Query keys for performance data
export const PERFORMANCE_QUERY_KEYS = {
  ALL_PERFORMANCE_DATA: 'all-performance-data',
  SYSTEM_METRICS: 'system-metrics',
  BLOCKCHAIN_METRICS: 'blockchain-metrics', 
  AI_MODULE_METRICS: 'ai-module-metrics',
  NETWORK_ACTIVITY: 'network-activity',
} as const

// Hook for getting all performance data at once
export function usePerformanceData() {
  return useQuery(
    PERFORMANCE_QUERY_KEYS.ALL_PERFORMANCE_DATA,
    () => performanceDataService.getAllPerformanceData(),
    {
      refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
      retry: 3,
      staleTime: 2000, // Consider data stale after 2 seconds
      onError: (error) => {
        console.error('Failed to fetch performance data:', error)
      }
    }
  )
}

// Hook for system metrics only
export function useSystemPerformanceMetrics() {
  return useQuery(
    PERFORMANCE_QUERY_KEYS.SYSTEM_METRICS,
    () => performanceDataService.getSystemMetrics(),
    {
      refetchInterval: 10000, // Refresh every 10 seconds
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch system metrics:', error)
      }
    }
  )
}

// Hook for blockchain metrics only
export function useBlockchainPerformanceMetrics() {
  return useQuery(
    PERFORMANCE_QUERY_KEYS.BLOCKCHAIN_METRICS,
    () => performanceDataService.getBlockchainMetrics(),
    {
      refetchInterval: 8000, // Refresh every 8 seconds
      retry: 3,
      onError: (error) => {
        console.error('Failed to fetch blockchain metrics:', error)
      }
    }
  )
}

// Hook for AI module metrics only
export function useAIModulePerformanceMetrics() {
  return useQuery(
    PERFORMANCE_QUERY_KEYS.AI_MODULE_METRICS,
    () => performanceDataService.getAIModuleMetrics(),
    {
      refetchInterval: 15000, // Refresh every 15 seconds
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch AI module metrics:', error)
      }
    }
  )
}

// Hook for network activity metrics only
export function useNetworkActivityMetrics() {
  return useQuery(
    PERFORMANCE_QUERY_KEYS.NETWORK_ACTIVITY,
    () => performanceDataService.getNetworkActivity(),
    {
      refetchInterval: 12000, // Refresh every 12 seconds
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch network activity:', error)
      }
    }
  )
}

// Hook for AI health status
export function useAIHealthStatus() {
  return useQuery(
    'ai-health-status',
    () => performanceDataService.getAIHealth(),
    {
      refetchInterval: 15000, // Refresh every 15 seconds
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch AI health status:', error)
      }
    }
  )
}

// Hook for real-time updates via WebSocket
export function useRealTimePerformanceUpdates() {
  const { data, refetch } = usePerformanceData()

  const startRealTimeUpdates = () => {
    const ws = performanceDataService.startRealTimeUpdates((_newData) => {
      // Trigger a refetch when new data arrives via WebSocket
      refetch()
    })
    return ws
  }

  const stopRealTimeUpdates = () => {
    performanceDataService.stopRealTimeUpdates()
  }

  return {
    data,
    startRealTimeUpdates,
    stopRealTimeUpdates
  }
}

// Utility hook for performance dashboard cards data
export function usePerformanceDashboardData() {
  const { data: perfData, isLoading, error } = usePerformanceData()
  
  // Transform the raw performance data into dashboard-ready format
  const dashboardData = perfData ? {
    // System Performance Cards
    systemCards: [
      {
        title: 'CPU Usage',
        value: `${perfData.system.cpu_percent.toFixed(1)}%`,
        trend: perfData.system.cpu_percent > 70 ? 'warning' : 'good',
        icon: 'cpu'
      },
      {
        title: 'Memory Usage', 
        value: `${perfData.system.memory_percent.toFixed(1)}%`,
        trend: perfData.system.memory_percent > 80 ? 'warning' : 'good',
        icon: 'memory'
      },
      {
        title: 'Disk Usage',
        value: `${perfData.system.disk_percent.toFixed(1)}%`,
        trend: perfData.system.disk_percent > 90 ? 'critical' : 'good',
        icon: 'disk'
      },
      {
        title: 'Uptime',
        value: formatUptime(perfData.system.uptime),
        trend: 'good',
        icon: 'clock'
      }
    ],

    // Blockchain Performance Cards
    blockchainCards: [
      {
        title: 'Block Height',
        value: perfData.blockchain.block_height.toLocaleString(),
        trend: 'good',
        icon: 'cube'
      },
      {
        title: 'Transaction Count',
        value: perfData.blockchain.transaction_count.toLocaleString(),
        trend: 'good',
        icon: 'transaction'
      },
      {
        title: 'Network Peers',
        value: perfData.blockchain.peer_count.toString(),
        trend: perfData.blockchain.peer_count > 3 ? 'good' : 'warning',
        icon: 'users'
      },
      {
        title: 'Mempool Size',
        value: perfData.blockchain.mempool_size.toString(),
        trend: perfData.blockchain.mempool_size < 100 ? 'good' : 'warning',
        icon: 'pool'
      }
    ],

    // AI Module Performance Cards
    aiModuleCards: Object.entries(perfData.ai_modules).map(([key, module]) => ({
      name: formatModuleName(key),
      status: module.status,
      performance_score: module.performance_score.toFixed(1),
      accuracy: module.accuracy.toFixed(1),
      requests_processed: module.requests_processed,
      avg_response_time: `${module.avg_response_time.toFixed(0)}ms`,
      last_updated: new Date(module.last_updated).toLocaleTimeString()
    })),

    // Network Activity Chart Data
    networkActivity: perfData.network_activity,

    // Overall Health Status
    overallHealth: {
      status: getOverallHealthStatus(perfData),
      timestamp: perfData.timestamp
    }
  } : null

  return {
    data: dashboardData,
    isLoading,
    error,
    refetch: () => {} // Could trigger manual refresh
  }
}

// Utility functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

function formatModuleName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getOverallHealthStatus(perfData: PerformanceMetrics): 'excellent' | 'good' | 'warning' | 'critical' {
  const issues = []
  
  if (perfData.system.cpu_percent > 80) issues.push('high_cpu')
  if (perfData.system.memory_percent > 85) issues.push('high_memory')
  if (perfData.system.disk_percent > 95) issues.push('high_disk')
  if (perfData.blockchain.peer_count < 2) issues.push('low_peers')
  if (perfData.blockchain.mempool_size > 200) issues.push('high_mempool')
  
  const aiIssues = Object.values(perfData.ai_modules).filter(module => 
    module.status !== 'active' || module.performance_score < 70
  ).length
  
  if (aiIssues > 2) issues.push('ai_issues')
  
  if (issues.length === 0) return 'excellent'
  if (issues.length <= 2) return 'good'
  if (issues.length <= 4) return 'warning'
  return 'critical'
}

export type { PerformanceMetrics, AIModuleData }

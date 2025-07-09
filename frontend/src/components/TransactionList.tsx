
import { format } from 'date-fns'
import { 
  ArrowRightIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Transaction } from '../types'

interface TransactionListProps {
  transactions: Transaction[]
  loading?: boolean
  showHeader?: boolean
  maxItems?: number
  className?: string
}

const getStatusIcon = (status: Transaction['status']) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircleIcon className="w-4 h-4 text-green-400" />
    case 'pending':
      return <ClockIcon className="w-4 h-4 text-yellow-400" />
    case 'failed':
      return <XCircleIcon className="w-4 h-4 text-red-400" />
    default:
      return <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
  }
}

const getStatusColor = (status: Transaction['status']) => {
  switch (status) {
    case 'confirmed':
      return 'text-green-400'
    case 'pending':
      return 'text-yellow-400'
    case 'failed':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

export function TransactionList({ 
  transactions, 
  loading = false, 
  showHeader = true,
  maxItems,
  className = ''
}: TransactionListProps) {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-32"></div>
                  <div className="h-3 bg-gray-600 rounded w-24"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-600 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-300">No transactions</h3>
        <p className="mt-1 text-sm text-gray-500">
          No transactions found for this account.
        </p>
      </div>
    )
  }

  const displayTransactions = maxItems 
    ? transactions.slice(0, maxItems) 
    : transactions

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Transactions</h3>
          <p className="text-sm text-gray-400">Recent transaction activity</p>
        </div>
      )}
      
      <div className="space-y-3">
        {displayTransactions.map((tx) => (
          <div
            key={tx.hash}
            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(tx.status)}
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white truncate">
                    {tx.from.slice(0, 8)}...{tx.from.slice(-6)}
                  </span>
                  <ArrowRightIcon className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-medium text-white truncate">
                    {tx.to.slice(0, 8)}...{tx.to.slice(-6)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-400">
                    {format(new Date(tx.timestamp * 1000), 'MMM d, HH:mm')}
                  </span>
                  <span className={`text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                  {tx.confirmations > 0 && (
                    <span className="text-xs text-gray-400">
                      {tx.confirmations} confirmations
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                {(tx.amount / 1000000).toFixed(6)} DYT
              </div>
              <div className="text-xs text-gray-400">
                Fee: {(tx.fee / 1000000).toFixed(6)} DYT
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {maxItems && transactions.length > maxItems && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-400 hover:text-blue-300">
            View all {transactions.length} transactions
          </button>
        </div>
      )}
    </div>
  )
}

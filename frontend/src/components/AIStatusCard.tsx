import React from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'

interface AIStatusCardProps {
  title: string
  status: 'operational' | 'degraded' | 'down' | 'unknown'
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  description?: string
  className?: string
}

const statusConfig = {
  operational: {
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-700/50',
    icon: CheckCircleIcon,
    label: 'Operational'
  },
  degraded: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-700/50',
    icon: ExclamationTriangleIcon,
    label: 'Degraded'
  },
  down: {
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-700/50',
    icon: XCircleIcon,
    label: 'Down'
  },
  unknown: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-900/20',
    borderColor: 'border-gray-700/50',
    icon: QuestionMarkCircleIcon,
    label: 'Unknown'
  }
}

export function AIStatusCard({ 
  title, 
  status, 
  icon: ServiceIcon, 
  loading = false, 
  description,
  className = ''
}: AIStatusCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gray-600 rounded"></div>
              <div className="ml-2 h-4 bg-gray-600 rounded w-24"></div>
            </div>
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
          </div>
          <div className="mt-3 h-3 bg-gray-600 rounded w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ServiceIcon className={`h-6 w-6 ${config.color}`} />
          <h4 className="ml-2 text-sm font-medium text-white">{title}</h4>
        </div>
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
      </div>
      
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        
        {description && (
          <p className="mt-2 text-xs text-gray-400">{description}</p>
        )}
      </div>
    </div>
  )
}

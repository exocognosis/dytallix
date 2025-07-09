import React from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface StatCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  loading = false, 
  trend,
  className = ''
}: StatCardProps) {
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-600 rounded"></div>
            <div className="ml-3 h-4 bg-gray-600 rounded w-20"></div>
          </div>
          <div className="mt-4 h-8 bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-blue-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-400">{title}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline">
          <p className="text-2xl font-semibold text-white">{value}</p>
          {trend && (
            <div className={`ml-2 flex items-center text-sm ${
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend.isPositive ? (
                <ArrowUpIcon className="w-4 h-4" />
              ) : (
                <ArrowDownIcon className="w-4 h-4" />
              )}
              <span className="ml-1">{trend.value}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

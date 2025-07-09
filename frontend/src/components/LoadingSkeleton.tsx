interface LoadingSkeletonProps {
  className?: string
  rows?: number
  height?: string
}

export function LoadingSkeleton({ className = '', rows = 1, height = 'h-4' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`bg-gray-300 dark:bg-gray-700 rounded ${height} mb-2`} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-8" />
      </div>
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 mb-4">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded flex-1" />
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-24" />
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-32" />
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

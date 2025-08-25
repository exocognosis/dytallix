import React from 'react'

/**
 * GasTag - Displays gas usage with optional limit and percentage bar
 * @param {Object} props
 * @param {number} props.gasUsed - Amount of gas used
 * @param {number} [props.gasLimit] - Gas limit (shows percentage if provided)
 */
const GasTag = ({ gasUsed, gasLimit }) => {
  const percentage = gasLimit ? (gasUsed / gasLimit) * 100 : null
  
  // Determine color based on percentage usage
  let colorClass = 'bg-blue-100 text-blue-800 border-blue-200'
  if (percentage) {
    if (percentage > 90) {
      colorClass = 'bg-red-100 text-red-800 border-red-200'
    } else if (percentage > 70) {
      colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
    } else {
      colorClass = 'bg-green-100 text-green-800 border-green-200'
    }
  }

  return (
    <div className="flex flex-col items-end" data-testid="gas-tag">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
        Gas: {gasUsed.toLocaleString()}
        {percentage !== null && ` (${percentage.toFixed(1)}%)`}
      </span>
      
      {gasLimit && (
        <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
          <div 
            className={`h-1 rounded-full transition-all duration-300 ${
              percentage > 90 ? 'bg-red-500' : 
              percentage > 70 ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            aria-label={`Gas usage: ${percentage.toFixed(1)}%`}
          />
        </div>
      )}
    </div>
  )
}

export default GasTag
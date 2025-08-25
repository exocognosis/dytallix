import React from 'react'

/**
 * Enhanced Table component with dark mode support and responsive stacking
 * @param {Object} props
 * @param {Array} props.columns - Column definitions with key, label, align
 * @param {Array} props.rows - Row data
 * @param {string} [props.emptyLabel] - Label for empty state
 * @param {Function} [props.onRowClick] - Row click handler
 * @param {boolean} [props.responsive] - Enable responsive stacking
 */
const Table = ({ columns, rows, emptyLabel = 'No data', onRowClick, responsive = true }) => {
  if (responsive && window.innerWidth < 768) {
    // Render as stacked cards on mobile
    return (
      <div className="space-y-4" data-testid="table-mobile">
        {rows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{emptyLabel}</div>
        ) : (
          rows.map((row, index) => (
            <div 
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${
                onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
              }`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between py-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {column.label}:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {typeof row[column.key] === 'function' ? row[column.key]() : row[column.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    )
  }

  // Render as table on desktop
  return (
    <div className="overflow-x-auto" data-testid="table-desktop">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  column.align === 'right' ? 'text-right' : 
                  column.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {rows.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                className={`${
                  onRowClick 
                    ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' 
                    : ''
                }`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 ${
                      column.align === 'right' ? 'text-right' : 
                      column.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {typeof row[column.key] === 'function' ? row[column.key]() : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table
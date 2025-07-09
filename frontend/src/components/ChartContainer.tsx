
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

interface ChartContainerProps {
  data: any[]
  type?: 'line' | 'bar'
  className?: string
}

export function ChartContainer({ 
  data, 
  type = 'line',
  className = ''
}: ChartContainerProps) {
  const chartHeight = 300

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${chartHeight}px] ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-sm">No data available</div>
        </div>
      </div>
    )
  }

  if (type === 'bar') {
    return (
      <div className={`w-full h-[${chartHeight}px] ${className}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
            />
            <Bar dataKey="transactions" fill="#3B82F6" />
            <Bar dataKey="blocks" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className={`w-full h-[${chartHeight}px] ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#F9FAFB'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="transactions" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="blocks" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

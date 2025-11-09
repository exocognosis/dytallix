import * as React from "react"

const Slider = React.forwardRef(({ className, value, onValueChange, min = 0, max = 100, ...props }, ref) => {
  return (
    <input
      type="range"
      ref={ref}
      min={min}
      max={max}
      value={value && value[0]}
      onChange={(e) => onValueChange && onValueChange([Number(e.target.value)])}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className || ''}`}
      {...props}
    />
  )
})
Slider.displayName = "Slider"

export { Slider }

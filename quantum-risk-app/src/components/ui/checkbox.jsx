import * as React from "react"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary ${className || ''}`}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }

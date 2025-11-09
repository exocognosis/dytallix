import * as React from "react"

const Switch = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-200'
      } ${className || ''}`}
      {...props}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
})
Switch.displayName = "Switch"

export { Switch }

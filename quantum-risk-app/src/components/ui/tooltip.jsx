import * as React from "react"

const TooltipProvider = ({ children }) => <>{children}</>

const Tooltip = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <div className="relative inline-block" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      {React.Children.map(children, child =>
        React.cloneElement(child, { isOpen })
      )}
    </div>
  )
}

const TooltipTrigger = React.forwardRef(({ asChild, children, isOpen, ...props }, ref) => {
  return (
    <span ref={ref} {...props}>
      {children}
    </span>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = ({ className, children, isOpen, ...props }) => {
  if (!isOpen) return null
  
  return (
    <div
      className={`absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ${className || ''}`}
      style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '0.5rem' }}
      {...props}
    >
      {children}
    </div>
  )
}
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

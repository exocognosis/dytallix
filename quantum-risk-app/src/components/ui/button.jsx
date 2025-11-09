import * as React from "react"

const Button = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  }
  
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${variants[variant]} ${className || ''}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }

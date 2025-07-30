import * as React from "react"

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type ButtonSize = "default" | "sm" | "lg" | "icon"

const getButtonClasses = (variant: ButtonVariant = "default", size: ButtonSize = "default") => {
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-bg disabled:pointer-events-none disabled:opacity-50"
  
  const variantClasses = {
    default: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl",
    outline: "border border-dashboard-border-hover bg-transparent hover:bg-dashboard-card text-dashboard-text hover:border-primary-400",
    secondary: "bg-dashboard-card text-dashboard-text hover:bg-dashboard-card-hover border border-dashboard-border",
    ghost: "hover:bg-dashboard-card text-dashboard-text",
    link: "text-primary-400 underline-offset-4 hover:underline hover:text-primary-300",
  }
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  }
  
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={`${getButtonClasses(variant, size)} ${className || ''}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

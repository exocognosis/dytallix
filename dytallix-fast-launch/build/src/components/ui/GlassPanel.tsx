import * as React from "react"
import { cn } from "../../utils"

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "card" | "dark"
    hoverEffect?: boolean
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
    ({ className, variant = "default", hoverEffect = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl border backdrop-blur-md transition-all duration-300",
                    {
                        "bg-white/40 dark:bg-black/40 border-white/20 dark:border-white/10 shadow-lg": variant === "default",
                        "bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/10 shadow-sm": variant === "card",
                        "bg-black/60 border-white/10 shadow-xl": variant === "dark",
                        "hover:-translate-y-1 hover:shadow-xl hover:bg-white/50 dark:hover:bg-white/10 hover:border-primary/30 dark:hover:border-primary/30": hoverEffect || variant === "card",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
GlassPanel.displayName = "GlassPanel"

export { GlassPanel }

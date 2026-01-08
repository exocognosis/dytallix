import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "panel" | "interactive"
    asChild?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant = "default", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "div"
        const variantClass = variant === "panel"
            ? "glass-panel"
            : variant === "interactive"
                ? "glass-card cursor-pointer"
                : "glass-card"

        return (
            <Comp
                ref={ref}
                className={cn(
                    "rounded-xl p-6",
                    variantClass,
                    className
                )}
                {...props}
            />
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }

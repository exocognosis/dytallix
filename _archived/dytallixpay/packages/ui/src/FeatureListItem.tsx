
import { cn } from "./utils"
import type { LucideIcon } from "lucide-react"

interface FeatureListItemProps {
    icon: LucideIcon
    title: string
    description: string
    color?: string
    className?: string
}

export function FeatureListItem({
    icon: Icon,
    title,
    description,
    color = "text-blue-500",
    className
}: FeatureListItemProps) {
    // Extract base color name (e.g. "blue-500") for background opacity
    // Simple heuristic: if color is "text-blue-500", bg should be "bg-blue-500/10"
    const bgColorClass = color.replace("text-", "bg-") + "/10"

    return (
        <div className={cn("flex items-start gap-3", className)}>
            <div className={cn("mt-1 p-1 rounded", bgColorClass, color)}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <span className="font-medium">{title}</span>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    )
}

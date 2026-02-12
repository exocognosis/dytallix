
import { Section } from "./Section"
import { cn } from "../../utils"

interface PageHeroProps {
    title: string
    subtitle?: string
    centered?: boolean
    className?: string
    badge?: string
    children?: React.ReactNode
}

export function PageHero({
    title,
    subtitle,
    centered = true,
    className,
    badge,
    children
}: PageHeroProps) {
    return (
        <Section className={cn("pt-32 pb-12 md:pt-40 md:pb-16", className)}>
            <div className={cn("max-w-4xl mx-auto space-y-6", centered && "text-center")}>
                {badge && (
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
                            {badge}
                        </div>
                    </div>
                )}

                <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500 pb-2">
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {subtitle}
                    </p>
                )}

                {children}
            </div>
        </Section>
    )
}

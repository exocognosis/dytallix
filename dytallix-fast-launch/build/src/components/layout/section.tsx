import * as React from "react"
import { cn } from "../../utils"

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    centered?: boolean
}

const Section = React.forwardRef<HTMLDivElement, SectionProps>(
    ({ className, title, children, centered = true, ...props }, ref) => {
        return (
            <section
                ref={ref}
                className={cn("py-16 md:py-24 relative", className)}
                {...props}
            >
                <div className="container mx-auto px-4 md:px-6">
                    {title && (
                        <div className={cn("mb-12", centered && "text-center")}>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                                {title}
                            </h2>
                            <div className={cn("h-1 w-20 bg-primary/50 rounded-full", centered && "mx-auto")} />
                        </div>
                    )}
                    {children}
                </div>
            </section>
        )
    }
)
Section.displayName = "Section"

export { Section }

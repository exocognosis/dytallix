import * as React from "react"
import { cn } from "../../utils"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    title?: string
    subtitle?: string
    centered?: boolean
    fullWidth?: boolean
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
    ({ className, title, subtitle, centered = true, fullWidth = false, children, ...props }, ref) => {
        return (
            <section
                ref={ref}
                className={cn("py-16 md:py-24 relative overflow-hidden", className)}
                {...props}
            >
                <div className={cn("container mx-auto px-4 md:px-6", { "max-w-none": fullWidth })}>
                    {(title || subtitle) && (
                        <div className={cn("mb-12 space-y-4", { "text-center": centered })}>
                            {title && (
                                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                                    {title}
                                </h2>
                            )}
                            {subtitle && (
                                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                    {subtitle}
                                </p>
                            )}
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

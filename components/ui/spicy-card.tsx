import * as React from "react"
import { cn } from "@/lib/utils"

interface SpicyCardProps extends React.HTMLAttributes<HTMLDivElement> { }

const SpicyCard = React.forwardRef<HTMLDivElement, SpicyCardProps>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "rounded-xl border border-white/10 bg-stone-900/60 text-card-foreground shadow-xl backdrop-blur-md transition-all hover:border-orange-500/30",
                className
            )}
            {...props}
        />
    )
)
SpicyCard.displayName = "SpicyCard"

const SpicyCardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
SpicyCardHeader.displayName = "SpicyCardHeader"

const SpicyCardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600",
            className
        )}
        {...props}
    />
))
SpicyCardTitle.displayName = "SpicyCardTitle"

const SpicyCardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
SpicyCardContent.displayName = "SpicyCardContent"

export { SpicyCard, SpicyCardHeader, SpicyCardTitle, SpicyCardContent }

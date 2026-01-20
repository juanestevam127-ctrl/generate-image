import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean; // Kept for compatibility but unused
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild, ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    {
                        // Variant Styles
                        "bg-white text-black hover:bg-neutral-200 shadow-md font-bold": variant === "default",
                        "bg-red-600 text-white hover:bg-red-700 shadow-sm": variant === "destructive",
                        "border border-white/20 bg-transparent text-white hover:bg-white/10": variant === "outline",
                        "bg-zinc-900 text-white border border-white/20 hover:bg-zinc-800": variant === "secondary",
                        "hover:bg-white/10 text-white hover:text-white": variant === "ghost",
                        "text-indigo-400 underline-offset-4 hover:underline": variant === "link",

                        // Size Styles
                        "h-10 px-4 py-2": size === "default",
                        "h-9 rounded-md px-3": size === "sm",
                        "h-11 rounded-md px-8": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Forest green with branded shadow on hover
        default:
          "bg-forest-700 text-white shadow-sm hover:bg-forest-800 hover:shadow-forest hover:-translate-y-0.5",
        // Destructive - Error red
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-red-700",
        // Outline - Forest green border
        outline:
          "border-2 border-forest-700 bg-transparent text-forest-700 hover:bg-forest-700 hover:text-white",
        // Secondary - Tan/gold accent
        secondary:
          "bg-tan-400 text-forest-900 shadow-sm hover:bg-tan-300 hover:shadow-tan hover:-translate-y-0.5",
        // Ghost - Subtle hover
        ghost:
          "text-forest-700 hover:bg-stone-100 hover:text-forest-800",
        // Link - Underline style
        link:
          "text-forest-700 underline-offset-4 hover:underline",
        // Success - Green action
        success:
          "bg-success text-white shadow-sm hover:bg-success-dark",
        // Warning - Amber action
        warning:
          "bg-warning text-white shadow-sm hover:bg-warning-dark",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

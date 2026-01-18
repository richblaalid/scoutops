import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const alertVariants = cva(
  'relative w-full rounded-lg border p-3 text-sm [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        success: 'border-success/30 bg-success-light text-success-dark dark:bg-success/20 dark:text-success',
        error: 'border-error/30 bg-error-light text-error-dark dark:bg-error/20 dark:text-error',
        warning: 'border-warning/30 bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
        info: 'border-info/30 bg-info-light text-info-dark dark:bg-info/20 dark:text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const iconMap = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Show the appropriate icon for the variant */
  showIcon?: boolean
  /** Allow dismissing the alert */
  dismissible?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', showIcon = true, dismissible = false, onDismiss, children, ...props }, ref) => {
    const Icon = iconMap[variant || 'default']

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {showIcon && <Icon className="h-4 w-4" />}
        <div className={cn(showIcon && 'pl-7', dismissible && 'pr-6')}>
          {children}
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription, alertVariants }

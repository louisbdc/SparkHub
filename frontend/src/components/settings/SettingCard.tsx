import { cn } from '@/lib/utils'

interface Props {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  variant?: 'default' | 'danger'
}

export function SettingCard({
  title,
  description,
  action,
  children,
  variant = 'default',
}: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden',
        variant === 'danger' && 'border-destructive/40'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4 px-6 py-4 border-b',
          variant === 'danger'
            ? 'bg-destructive/5 border-destructive/20'
            : 'bg-muted/30'
        )}
      >
        <div>
          <h2
            className={cn(
              'text-sm font-semibold',
              variant === 'danger' && 'text-destructive'
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

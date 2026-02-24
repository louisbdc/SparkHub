import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-0 after:pointer-events-none',
        'after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.35)_50%,transparent_100%)]',
        'after:bg-[length:200%_100%]',
        'after:[animation:shimmer_1.8s_ease-in-out_infinite]',
        className
      )}
      {...props}
    />
  )
}

'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ChatBubbleProps {
  authorName: string
  content: string
  createdAt: string
  isOwn: boolean
  canDelete: boolean
  onDelete: () => void
}

export function ChatBubble({
  authorName,
  content,
  createdAt,
  isOwn,
  canDelete,
  onDelete,
}: ChatBubbleProps) {
  return (
    <div className={cn('flex gap-2.5 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar — only for others */}
      {!isOwn && (
        <Avatar className="w-7 h-7 shrink-0 mt-1">
          <AvatarFallback className="text-[10px]">
            {authorName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[72%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Name + time */}
        <div className={cn('flex items-center gap-1.5 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          {!isOwn && (
            <span className="text-[11px] font-medium text-foreground/70">{authorName}</span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr })}
          </span>
        </div>

        {/* Bubble */}
        <div className="flex items-end gap-1.5">
          {canDelete && isOwn && (
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-opacity text-muted-foreground mb-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <div
            className={cn(
              'px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            )}
          >
            {content}
          </div>

          {canDelete && !isOwn && (
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-opacity text-muted-foreground mb-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface TypingIndicatorProps {
  names: string[]
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null

  const label =
    names.length === 1
      ? `${names[0]} est en train d'écrire`
      : `${names.join(', ')} sont en train d'écrire`

  return (
    <div className="flex items-center gap-2.5 px-1">
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarFallback className="text-[10px]">{names[0][0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-2 bg-muted px-3.5 py-2 rounded-2xl rounded-tl-sm">
        <span className="text-xs text-muted-foreground italic">{label}</span>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}

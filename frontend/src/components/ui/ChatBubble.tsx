'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, Pencil, Reply, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageImageItem } from '@/components/ui/MessageImageItem'
import type { MessageImage, MessageReply } from '@/types'

interface ChatBubbleProps {
  authorName: string
  authorAvatar?: string | null
  content: string
  createdAt: string
  updatedAt?: string
  isOwn: boolean
  canDelete: boolean
  replyTo?: MessageReply
  images?: MessageImage[]
  onDelete: () => void
  onReply?: () => void
  onEdit?: (newContent: string) => void
}

export function ChatBubble({
  authorName,
  authorAvatar,
  content,
  createdAt,
  updatedAt,
  isOwn,
  canDelete,
  replyTo,
  images = [],
  onDelete,
  onReply,
  onEdit,
}: ChatBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)

  const wasEdited = updatedAt != null && updatedAt !== createdAt

  const handleSaveEdit = () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === content) {
      setIsEditing(false)
      setEditContent(content)
      return
    }
    onEdit?.(trimmed)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(content)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') handleCancelEdit()
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdit()
  }

  return (
    <div className={cn('flex gap-2.5 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar — others only */}
      {!isOwn && (
        <Avatar className="w-7 h-7 shrink-0 mt-1">
          <AvatarImage src={authorAvatar ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {authorName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[72%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Author + timestamp */}
        <div className={cn('flex items-center gap-1.5 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          {!isOwn && (
            <span className="text-[11px] font-medium text-foreground/70">{authorName}</span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr })}
            {wasEdited && <span className="ml-1 italic">(modifié)</span>}
          </span>
        </div>

        {/* Reply preview */}
        {replyTo && (
          <div
            className={cn(
              'flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground bg-muted/40 border-l-2 max-w-full',
              isOwn ? 'border-primary/50' : 'border-muted-foreground/40'
            )}
          >
            <Reply className="w-3 h-3 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-foreground/70 mr-1">{replyTo.author.name}</span>
              <span className="truncate">{replyTo.content}</span>
            </div>
          </div>
        )}

        {/* Bubble row: action bar + bubble */}
        <div className={cn('flex items-end gap-1.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          {/* Bubble */}
          <div
            className={cn(
              'px-3.5 py-2 text-sm leading-relaxed rounded-2xl',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            )}
          >
            {/* Images */}
            {images.length > 0 && (
              <div className={cn('flex flex-wrap gap-1.5', content ? 'mb-2' : '')}>
                {images.map((img) => (
                  <MessageImageItem
                    key={img._id}
                    imageId={img._id}
                    originalname={img.originalname}
                    preloadedUrl={img.url}
                  />
                ))}
              </div>
            )}

            {/* Edit mode */}
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[180px]">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  rows={3}
                  className={cn(
                    'w-full resize-none bg-transparent outline-none text-sm leading-relaxed',
                    isOwn
                      ? 'text-primary-foreground placeholder:text-primary-foreground/50'
                      : 'text-foreground'
                  )}
                />
                <div className="flex items-center gap-1 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={cn(
                      'p-1 rounded-full transition-colors',
                      isOwn
                        ? 'hover:bg-primary-foreground/20 text-primary-foreground/70'
                        : 'hover:bg-muted-foreground/20 text-muted-foreground'
                    )}
                    title="Annuler (Échap)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                    className={cn(
                      'p-1 rounded-full transition-colors disabled:opacity-40',
                      isOwn
                        ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                        : 'hover:bg-muted-foreground/20 text-foreground'
                    )}
                    title="Sauvegarder (Ctrl+Entrée)"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              content && (
                <p className="whitespace-pre-wrap break-words">{content}</p>
              )
            )}
          </div>

          {/* Action bar — visible on group hover */}
          <div
            className={cn(
              'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 shrink-0',
              isOwn ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {onReply && !isEditing && (
              <button
                type="button"
                onClick={onReply}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Répondre"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            )}
            {isOwn && onEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Modifier"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && !isEditing && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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

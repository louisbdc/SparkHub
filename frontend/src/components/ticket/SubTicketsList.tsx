'use client'

import { useState } from 'react'
import { Check, ChevronRight, Loader2, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useChildTickets, useCreateChildTicket } from '@/hooks/useTickets'
import type { Ticket, TicketPriority, TicketStatus } from '@/types'

const STATUS_CIRCLE: Record<TicketStatus, string> = {
  backlog:     'border-slate-300 dark:border-slate-600',
  todo:        'border-blue-400 dark:border-blue-500',
  in_progress: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10',
  review:      'border-purple-400 bg-purple-50 dark:bg-purple-400/10',
  done:        'border-emerald-500 bg-emerald-500',
}

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low:    'bg-slate-400',
  medium: 'bg-blue-400',
  high:   'bg-orange-400',
  urgent: 'bg-red-500',
}

interface SubTicketsListProps {
  workspaceId: string
  parentId: string
  onTicketClick: (ticket: Ticket) => void
}

export function SubTicketsList({ workspaceId, parentId, onTicketClick }: SubTicketsListProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')

  const { data: children = [], isLoading } = useChildTickets(workspaceId, parentId)
  const createChild = useCreateChildTicket(workspaceId, parentId)

  const total = children.length
  const doneCount = children.filter((c) => c.status === 'done').length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    createChild.mutate(trimmed, {
      onSuccess: () => {
        setTitle('')
        setShowForm(false)
      },
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header + progress bar */}
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
          Sous-tickets
        </p>
        {total > 0 && (
          <>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground shrink-0">
              {doneCount}/{total}
            </span>
          </>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Chargement...
        </div>
      )}

      {/* List */}
      {children.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {children.map((child) => (
            <li key={child._id}>
              <button
                type="button"
                onClick={() => onTicketClick(child)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors group text-left"
              >
                {/* Status circle */}
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                    STATUS_CIRCLE[child.status]
                  )}
                >
                  {child.status === 'done' && (
                    <Check className="w-2 h-2 text-white" strokeWidth={3} />
                  )}
                </div>

                {/* Priority dot */}
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[child.priority])} />

                {/* Title */}
                <span
                  className={cn(
                    'text-xs flex-1 truncate transition-colors group-hover:text-foreground',
                    child.status === 'done'
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground/80'
                  )}
                >
                  {child.title}
                </span>

                {/* Assignee avatar */}
                {child.assignee && (
                  <Avatar className="w-4 h-4 shrink-0" title={child.assignee.name}>
                    <AvatarImage src={child.assignee.avatar ?? undefined} />
                    <AvatarFallback className="text-[8px] font-semibold">
                      {child.assignee.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && total === 0 && !showForm && (
        <p className="text-xs text-muted-foreground/60 italic px-2">Aucun sous-ticket</p>
      )}

      {/* Inline create */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du sous-ticket…"
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/60 min-w-0"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowForm(false)
                  setTitle('')
                }
              }}
            />
            {createChild.isPending && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>
          <button
            type="submit"
            disabled={!title.trim() || createChild.isPending}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
          >
            Créer
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setTitle('') }}
            className="text-[11px] font-medium px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ✕
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors rounded-md hover:bg-muted/50 w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un sous-ticket
        </button>
      )}
    </div>
  )
}

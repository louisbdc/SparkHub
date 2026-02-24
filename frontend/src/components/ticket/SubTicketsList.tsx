'use client'

import { useState } from 'react'
import { Check, ChevronRight, Loader2, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useChildTickets, useCreateChildTicket, useToggleChildDone } from '@/hooks/useTickets'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from '@/types'
import type { User } from '@/types'

const STATUS_CIRCLE: Record<TicketStatus, string> = {
  backlog:     'border-slate-300 dark:border-slate-600',
  todo:        'border-blue-400 dark:border-blue-500',
  in_progress: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10',
  review:      'border-purple-400 bg-purple-50 dark:bg-purple-400/10',
  done:        'border-emerald-500 bg-emerald-500',
}

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
const TYPES: TicketType[] = ['task', 'bug', 'feature', 'improvement']

interface SubTicketsListProps {
  workspaceId: string
  parentId: string
  members?: User[]
  onTicketClick: (ticket: Ticket) => void
}

export function SubTicketsList({ workspaceId, parentId, members = [], onTicketClick }: SubTicketsListProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [type, setType] = useState<TicketType>('task')
  const [assigneeId, setAssigneeId] = useState<string>('none')

  const { data: children = [], isLoading } = useChildTickets(workspaceId, parentId)
  const createChild = useCreateChildTicket(workspaceId, parentId)
  const toggleDone = useToggleChildDone(workspaceId, parentId)

  const total = children.length
  const doneCount = children.filter((c) => c.status === 'done').length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setType('task')
    setAssigneeId('none')
    setShowForm(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    createChild.mutate(
      {
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        type,
        assigneeId: assigneeId !== 'none' ? assigneeId : undefined,
      },
      { onSuccess: resetForm }
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header + progress */}
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
              <div className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors group">
                <button
                  type="button"
                  onClick={() => toggleDone.mutate({ ticketId: child._id, isDone: child.status !== 'done' })}
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all hover:scale-110',
                    STATUS_CIRCLE[child.status]
                  )}
                >
                  {child.status === 'done' && (
                    <Check className="w-2 h-2 text-white" strokeWidth={3} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onTicketClick(child)}
                  className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                >
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
                  {child.assignee && (
                    <Avatar className="w-4 h-4 shrink-0" title={child.assignee.name}>
                      <AvatarImage src={child.assignee.avatar ?? undefined} />
                      <AvatarFallback className="text-[8px] font-semibold">
                        {(child.assignee.name[0] ?? '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && total === 0 && !showForm && (
        <p className="text-xs text-muted-foreground/50 italic px-2">Aucun sous-ticket</p>
      )}

      {/* Create */}
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-primary/40 bg-card shadow-sm overflow-hidden"
        >
          {/* Title */}
          <div className="flex items-start gap-2 px-3 pt-3 pb-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0 mt-0.5" />
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du sous-ticket…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
              onKeyDown={(e) => { if (e.key === 'Escape') resetForm() }}
            />
          </div>

          {/* Description */}
          <div className="px-3 pb-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnelle)…"
              rows={2}
              className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/40 resize-none min-w-0 leading-relaxed"
              onKeyDown={(e) => { if (e.key === 'Escape') resetForm() }}
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {TICKET_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {TICKET_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          {members.length > 0 && (
            <div className="px-3 pb-2">
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Non assigné</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m._id} value={m._id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 px-3 pb-2.5">
            <button
              type="submit"
              disabled={!title.trim() || createChild.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {createChild.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Créer
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg border border-dashed border-muted-foreground/20 p-2.5 flex items-center gap-2 text-xs text-muted-foreground/60 hover:border-primary/40 hover:text-foreground/80 hover:bg-muted/20 transition-all group"
        >
          <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/30 group-hover:border-primary/50 flex items-center justify-center transition-colors shrink-0">
            <Plus className="w-3 h-3" />
          </div>
          Nouveau sous-ticket
        </button>
      )}
    </div>
  )
}

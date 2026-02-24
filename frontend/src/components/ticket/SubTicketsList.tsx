'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useChildTickets, useCreateChildTicket } from '@/hooks/useTickets'
import { TICKET_STATUS_LABELS, type Ticket } from '@/types'

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
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sous-tickets ({children.length})
        </p>
        {!showForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Chargement...
        </div>
      )}

      {!isLoading && children.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground italic">Aucun sous-ticket</p>
      )}

      {children.length > 0 && (
        <ul className="flex flex-col gap-1">
          {children.map((child) => (
            <li key={child._id}>
              <button
                type="button"
                onClick={() => onTicketClick(child)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/20 hover:bg-muted/50 transition-colors text-left group"
              >
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {TICKET_STATUS_LABELS[child.status]}
                </Badge>
                <span className="text-xs truncate group-hover:text-foreground text-foreground/80">
                  {child.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du sous-ticket..."
            className="flex-1 text-xs px-3 py-2 rounded-md border bg-background outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowForm(false)
                setTitle('')
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={!title.trim() || createChild.isPending}
          >
            {createChild.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Créer'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => { setShowForm(false); setTitle('') }}
          >
            Annuler
          </Button>
        </form>
      )}
    </div>
  )
}

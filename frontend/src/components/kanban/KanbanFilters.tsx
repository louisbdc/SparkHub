'use client'

import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  type TicketPriority,
  type TicketType,
  type User,
} from '@/types'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
const TYPES: TicketType[] = ['bug', 'feature', 'task', 'improvement']

export interface KanbanFiltersState {
  search: string
  priorities: TicketPriority[]
  types: TicketType[]
  assigneeId: string | null
}

export const DEFAULT_KANBAN_FILTERS: KanbanFiltersState = {
  search: '',
  priorities: [],
  types: [],
  assigneeId: null,
}

interface KanbanFiltersProps {
  filters: KanbanFiltersState
  onChange: (filters: KanbanFiltersState) => void
  workspaceMembers: User[]
}

export function KanbanFilters({ filters, onChange, workspaceMembers }: KanbanFiltersProps) {
  const isActive =
    Boolean(filters.search) ||
    filters.priorities.length > 0 ||
    filters.types.length > 0 ||
    filters.assigneeId !== null

  const togglePriority = (p: TicketPriority) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p]
    onChange({ ...filters, priorities: next })
  }

  const toggleType = (t: TicketType) => {
    const next = filters.types.includes(t)
      ? filters.types.filter((x) => x !== t)
      : [...filters.types, t]
    onChange({ ...filters, types: next })
  }

  const reset = () => onChange(DEFAULT_KANBAN_FILTERS)

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2.5 border-b bg-background/80 shrink-0">
      {/* Search */}
      <Input
        placeholder="Rechercher..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="h-8 w-40 text-sm"
      />

      {/* Priority chips */}
      <div className="flex items-center gap-1">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => togglePriority(p)}
            className={cn(
              'text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors',
              filters.priorities.includes(p)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {TICKET_PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Type chips */}
      <div className="flex items-center gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggleType(t)}
            className={cn(
              'text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors',
              filters.types.includes(t)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {TICKET_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Assignee */}
      {workspaceMembers.length > 0 && (
        <Select
          value={filters.assigneeId ?? 'all'}
          onValueChange={(v) => onChange({ ...filters, assigneeId: v === 'all' ? null : v })}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {workspaceMembers.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Reset */}
      {isActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="h-8 text-xs text-muted-foreground"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}

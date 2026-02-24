'use client'

import { AlertTriangle, CheckCircle2, Layers, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TicketWithWorkspace } from '@/hooks/useDashboardTickets'
import type { Workspace } from '@/types'

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  accent?: string
}

function StatCard({ icon: Icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className={cn('flex items-center justify-between')}>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className={cn('p-1.5 rounded-md', accent ?? 'bg-muted')}>
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}

interface DashboardStatCardsProps {
  workspaces: Workspace[]
  allTickets: TicketWithWorkspace[]
  totalMembers: number
}

export function DashboardStatCards({
  workspaces,
  allTickets,
  totalMembers,
}: DashboardStatCardsProps) {
  const inProgress = allTickets.filter((t) => t.status === 'in_progress').length
  const urgent = allTickets.filter(
    (t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done'
  ).length
  const done = allTickets.filter((t) => t.status === 'done').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Layers}
        label="Workspaces"
        value={workspaces.length}
        sub={`${totalMembers} membre${totalMembers > 1 ? 's' : ''} au total`}
      />
      <StatCard
        icon={Zap}
        label="En cours"
        value={inProgress}
        sub={`sur ${allTickets.length} ticket${allTickets.length > 1 ? 's' : ''}`}
      />
      <StatCard
        icon={AlertTriangle}
        label="Urgents / Hauts"
        value={urgent}
        sub="tickets ouverts prioritaires"
      />
      <StatCard
        icon={CheckCircle2}
        label="Terminés"
        value={done}
        sub={
          allTickets.length > 0
            ? `${Math.round((done / allTickets.length) * 100)} % de complétion`
            : 'aucun ticket'
        }
      />
    </div>
  )
}

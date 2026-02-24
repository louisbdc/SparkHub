'use client'

import { Layers } from 'lucide-react'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useCurrentUser } from '@/hooks/useAuth'
import { useDashboardTickets } from '@/hooks/useDashboardTickets'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import { DashboardStatCards } from '@/components/dashboard/DashboardStatCards'
import { MyTickets } from '@/components/dashboard/MyTickets'
import { UrgentTickets } from '@/components/dashboard/UrgentTickets'

export default function DashboardPage() {
  const { data: user } = useCurrentUser()
  const { data: workspaces, isLoading, isError } = useWorkspaces()
  const { allTickets, isLoading: ticketsLoading } = useDashboardTickets(workspaces)

  const firstName = user?.name?.split(' ')[0]
  const count = workspaces?.length ?? 0
  const isDevOrAdmin = user?.role !== 'client'

  const totalMembers = workspaces
    ? new Set([
        ...workspaces.map((ws) => ws.owner._id),
        ...workspaces.flatMap((ws) => ws.members.map((m) => m.user._id)),
      ]).size
    : 0

  const dataReady = !isLoading && !isError && count > 0

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <span className="font-semibold text-sm">Dashboard</span>
        {isDevOrAdmin && <CreateWorkspaceDialog />}
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bonjour, {firstName ?? '…'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading
                ? 'Chargement de vos projets…'
                : count > 0
                  ? 'Voici un aperçu de vos projets actifs.'
                  : isDevOrAdmin
                    ? 'Créez votre premier workspace pour commencer.'
                    : 'Vous serez notifié quand un développeur vous ajoute à un projet.'}
            </p>
          </div>

          {/* Skeleton */}
          {isLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 rounded-xl border bg-muted/20 animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-44 rounded-xl border bg-muted/20 animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
              Impossible de charger les workspaces. Réessayez plus tard.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && count === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-24 text-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Layers className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-sm">Aucun workspace</p>
                <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                  {isDevOrAdmin
                    ? 'Créez un projet et invitez votre client pour commencer à collaborer.'
                    : "Vous n'avez pas encore accès à un projet. Contactez votre développeur."}
                </p>
              </div>
              {isDevOrAdmin && <CreateWorkspaceDialog />}
            </div>
          )}

          {/* Stat cards */}
          {dataReady && !ticketsLoading && (
            <DashboardStatCards
              workspaces={workspaces!}
              allTickets={allTickets}
              totalMembers={totalMembers}
            />
          )}

          {/* Tickets */}
          {dataReady && !ticketsLoading && (
            <div className="space-y-8">
              <UrgentTickets allTickets={allTickets} />
              <MyTickets allTickets={allTickets} userId={user?._id} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

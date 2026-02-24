'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingCard } from '@/components/settings/SettingCard'
import { WorkspaceGeneralForm } from '@/components/settings/WorkspaceGeneralForm'
import { MembersManager } from '@/components/settings/MembersManager'
import { InviteMemberDialog } from '@/components/workspace/InviteMemberDialog'
import { useWorkspace, useArchiveWorkspace } from '@/hooks/useWorkspaces'
import { useCurrentUser } from '@/hooks/useAuth'

export default function WorkspaceSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: workspace, isLoading } = useWorkspace(id)
  const { data: currentUser } = useCurrentUser()
  const archiveWorkspace = useArchiveWorkspace()
  const [confirmArchive, setConfirmArchive] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 h-14 border-b shrink-0">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border p-6 space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  {i === 1 && <Skeleton className="h-9 w-full" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!workspace) return null

  const isOwner = workspace.owner._id === currentUser?._id
  const canInvite = isOwner
  const totalMembers = workspace.members.length + 1

  return (
    <div className="flex flex-col h-full">
      {/* Header — same style as kanban page */}
      <header className="flex items-center gap-3 px-6 h-14 border-b shrink-0">
        <Link
          href={`/workspaces/${id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: workspace.color }}
        />
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm">{workspace.name}</span>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm text-muted-foreground">Paramètres</span>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">

          {isOwner && (
            <SettingCard
              title="Général"
              description="Nom, description et couleur du workspace."
            >
              <WorkspaceGeneralForm workspace={workspace} />
            </SettingCard>
          )}

          <SettingCard
            title={`Membres · ${totalMembers}`}
            description="Gérez qui a accès à ce workspace."
            action={canInvite ? <InviteMemberDialog workspaceId={id} /> : undefined}
          >
            <MembersManager workspace={workspace} />
          </SettingCard>

          {isOwner && (
            <SettingCard
              title="Zone de danger"
              description="Ces actions sont irréversibles."
              variant="danger"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Archiver le workspace</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Le workspace sera masqué pour tous les membres.
                  </p>
                </div>
                {confirmArchive ? (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmArchive(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={archiveWorkspace.isPending}
                      onClick={() => archiveWorkspace.mutate(id)}
                    >
                      {archiveWorkspace.isPending && (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      )}
                      Confirmer
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => setConfirmArchive(true)}
                  >
                    Archiver
                  </Button>
                )}
              </div>
            </SettingCard>
          )}

        </div>
      </div>
    </div>
  )
}

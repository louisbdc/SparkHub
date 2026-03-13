'use client'

import { useState } from 'react'
import { Loader2, Trash2, Crown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRemoveMember, useCancelInvitation } from '@/hooks/useWorkspaces'
import { useCurrentUser } from '@/hooks/useAuth'
import type { Workspace } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  dev: 'Dev',
  client: 'Client',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  workspace: Workspace
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function MembersManager({ workspace }: Props) {
  const { data: currentUser } = useCurrentUser()
  const removeMember = useRemoveMember()
  const cancelInvitation = useCancelInvitation()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const isOwner = workspace.owner._id === currentUser?._id

  const handleRemove = (memberId: string) => {
    setRemovingId(memberId)
    removeMember.mutate(
      { workspaceId: workspace._id, memberId },
      { onSettled: () => setRemovingId(null) }
    )
  }

  const handleCancelInvitation = (invitationId: string) => {
    setCancellingId(invitationId)
    cancelInvitation.mutate(
      { workspaceId: workspace._id, invitationId },
      { onSettled: () => setCancellingId(null) }
    )
  }

  return (
    <div className="space-y-2">
      {/* Owner row */}
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={workspace.owner.avatar ?? undefined} />
          <AvatarFallback className="text-xs">
            {initials(workspace.owner.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{workspace.owner.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {workspace.owner.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <Badge variant="secondary" className="text-xs">
            Propriétaire
          </Badge>
        </div>
      </div>

      {/* Member rows */}
      {workspace.members.map(({ user, role }) => (
        <div key={user._id} className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {ROLE_LABELS[role] ?? role}
          </Badge>
          {isOwner && user._id !== currentUser?._id && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
              disabled={removingId === user._id}
              onClick={() => handleRemove(user._id)}
            >
              {removingId === user._id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      ))}

      {/* Pending invitation rows */}
      {workspace.pendingInvitations.map((invitation) => (
        <div
          key={invitation._id}
          className="flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-70"
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">
              {invitation.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{invitation.email}</p>
            <p className="text-xs text-muted-foreground truncate">
              Invité le {formatDate(invitation.invitedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600">
              <Clock className="w-3 h-3 mr-1" />
              En attente
            </Badge>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-destructive"
                disabled={cancellingId === invitation._id}
                onClick={() => handleCancelInvitation(invitation._id)}
              >
                {cancellingId === invitation._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      ))}

      {workspace.members.length === 0 && workspace.pendingInvitations.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucun membre pour l&apos;instant.
        </p>
      )}
    </div>
  )
}

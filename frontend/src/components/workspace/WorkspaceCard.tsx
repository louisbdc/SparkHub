'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowRight, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

interface WorkspaceCardProps {
  workspace: Workspace
  currentUserId?: string
}

export function WorkspaceCard({ workspace, currentUserId }: WorkspaceCardProps) {
  const isOwner = workspace.owner._id === currentUserId
  const initial = workspace.name.charAt(0).toUpperCase()
  const totalPeople = workspace.memberCount + 1 // members + owner

  return (
    <Link
      href={`/workspaces/${workspace._id}`}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/60"
    >
      {/* Colored top strip — slightly thicker for presence */}
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: workspace.color }} />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Workspace initial avatar */}
          <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: workspace.color }}
          >
            {initial}
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-sm leading-tight truncate">
              {workspace.name}
            </h3>
            {currentUserId && (
              <span
                className={cn(
                  'inline-block text-[10px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full',
                  isOwner
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isOwner ? 'Propriétaire' : 'Membre'}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {workspace.description || (
            <span className="italic opacity-40">Aucune description</span>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {totalPeople} personne{totalPeople > 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>
              {formatDistanceToNow(new Date(workspace.updatedAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
        </div>

      </div>
    </Link>
  )
}

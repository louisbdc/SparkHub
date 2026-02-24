'use client'

import { useState } from 'react'
import { ArrowUpRight, Download, FileText, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useTickets } from '@/hooks/useTickets'
import { filesApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Attachment, Ticket } from '@/types'
import { FilePreviewModal } from '@/components/ticket/FilePreviewModal'

interface WorkspaceFilesProps {
  workspaceId: string
  onTicketClick: (ticket: Ticket) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function WorkspaceFiles({ workspaceId, onTicketClick }: WorkspaceFilesProps) {
  const { data: tickets = [], isLoading } = useTickets(workspaceId)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)

  const files: Array<{ attachment: Attachment; ticket: Ticket }> = tickets
    .flatMap((ticket) =>
      ticket.attachments.map((attachment) => ({ attachment, ticket }))
    )
    .sort(
      (a, b) =>
        new Date(b.attachment.uploadedAt).getTime() -
        new Date(a.attachment.uploadedAt).getTime()
    )

  if (!isLoading && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Paperclip className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucun fichier joint pour l&apos;instant</p>
      </div>
    )
  }

  return (
    <>
    <div className="relative p-6">
      {/* Skeleton overlay */}
      <div
        className={cn(
          'absolute inset-0 p-6 flex flex-col gap-2 pointer-events-none transition-opacity duration-200 z-10',
          isLoading ? 'opacity-100' : 'opacity-0'
        )}
      >
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg border">
            <Skeleton className="w-9 h-9 rounded-md shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>

      <p className={cn(
        'text-xs font-medium uppercase tracking-widest text-muted-foreground/60 mb-4 transition-opacity duration-200',
        isLoading ? 'opacity-0' : 'opacity-100'
      )}>
        {files.length} fichier{files.length > 1 ? 's' : ''}
      </p>

      <div className="flex flex-col gap-2">
        {files.map(({ attachment, ticket }) => (
          <div
            key={attachment._id}
            onClick={() => setPreviewAttachment(attachment)}
            className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.originalname}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate"
                  onClick={(e) => { e.stopPropagation(); onTicketClick(ticket) }}
                >
                  {ticket.title}
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                </button>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatBytes(attachment.size)}
                </span>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(attachment.uploadedAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <a
                href={filesApi.getUrl(attachment._id, true)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Télécharger"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>

    <FilePreviewModal
      attachment={previewAttachment}
      onClose={() => setPreviewAttachment(null)}
    />
    </>
  )
}

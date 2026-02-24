'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, Download, Loader2, Paperclip, Send } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useSkeletonVisible } from '@/hooks/useSkeletonVisible'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChatBubble, TypingIndicator } from '@/components/ui/ChatBubble'
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments'
import { useCurrentUser } from '@/hooks/useAuth'
import { useAddAttachments, useTickets } from '@/hooks/useTickets'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { useTicketSocket } from '@/hooks/useTicketSocket'
import { filesApi } from '@/lib/api'
import { FilePreviewModal } from './FilePreviewModal'
import { SubTicketsList } from './SubTicketsList'
import { EditTicketForm } from './EditTicketForm'
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type Attachment,
  type Ticket,
} from '@/types'

const TYPING_DEBOUNCE_MS = 1500

interface TicketDetailPanelProps {
  ticket: Ticket | null
  workspaceId: string
  onClose: () => void
  onTicketChange?: (ticket: Ticket) => void
  startInEditMode?: boolean
  onEditModeStarted?: () => void
}

export function TicketDetailPanel({ ticket, workspaceId, onClose, onTicketChange, startInEditMode, onEditModeStarted }: TicketDetailPanelProps) {
  const [comment, setComment] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const { data: currentUser } = useCurrentUser()
  const { data: tickets } = useTickets(workspaceId)
  const { data: workspace } = useWorkspace(workspaceId)
  const liveTicket = (ticket && tickets?.find((t) => t._id === ticket._id)) ?? ticket
  const parentTicket = liveTicket?.parentId ? (tickets?.find((t) => t._id === liveTicket.parentId) ?? null) : null

  const members = [
    ...(workspace?.owner ? [workspace.owner] : []),
    ...(workspace?.members.map((m) => m.user) ?? []),
  ].filter((u, i, arr) => arr.findIndex((x) => x._id === u._id) === i)

  const { data: comments = [], isLoading: commentsLoading } = useComments(
    workspaceId,
    ticket?._id ?? ''
  )
  const createComment = useCreateComment(workspaceId, ticket?._id ?? '')
  const deleteComment = useDeleteComment(workspaceId, ticket?._id ?? '')
  const addAttachments = useAddAttachments(workspaceId)

  // Auto-enter edit mode when opened from the kanban card's "Modifier" action
  useEffect(() => {
    if (ticket && startInEditMode) {
      setIsEditing(true)
      onEditModeStarted?.()
    }
  }, [ticket?._id])

  const showCommentsSkeleton = useSkeletonVisible(commentsLoading)

  const { typingUsers, emitTypingStart, emitTypingStop } = useTicketSocket(
    workspaceId,
    ticket?._id,
    currentUser?._id
  )

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      emitTypingStop()
      isTypingRef.current = false
    }
  }, [emitTypingStop])

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value)
    if (!isTypingRef.current) {
      emitTypingStart()
      isTypingRef.current = true
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current)
    typingStopTimer.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS)
  }

  const handleUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length || !liveTicket) return
    addAttachments.mutate({ ticketId: liveTicket._id, files: selected })
    e.target.value = ''
  }

  const handleSendComment = () => {
    const trimmed = comment.trim()
    if (!trimmed || !liveTicket) return
    stopTyping()
    createComment.mutate(trimmed, { onSuccess: () => setComment('') })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendComment()
    }
  }

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setIsEditing(false)
      onClose()
    }
  }

  return (
    <>
    <Sheet open={Boolean(ticket)} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
        {liveTicket && (
          <>
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              {parentTicket && onTicketChange && (
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); onTicketChange(parentTicket) }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 -mt-1 w-fit"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[240px]">{parentTicket.title}</span>
                </button>
              )}
              <div className="flex items-start gap-2">
                <SheetTitle className="flex-1 text-base font-semibold leading-snug pr-2">
                  {liveTicket.title}
                </SheetTitle>
              </div>
              {!isEditing && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline">{TICKET_STATUS_LABELS[liveTicket.status]}</Badge>
                  <Badge variant="outline">{TICKET_TYPE_LABELS[liveTicket.type]}</Badge>
                  <Badge variant="outline">{TICKET_PRIORITY_LABELS[liveTicket.priority]}</Badge>
                </div>
              )}
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              {isEditing ? (
                <EditTicketForm
                  ticket={liveTicket}
                  workspaceId={workspaceId}
                  members={members}
                  onSuccess={() => setIsEditing(false)}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  {/* Description */}
                  {liveTicket.description ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Description
                      </p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {liveTicket.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Aucune description</p>
                  )}

                  {/* Attachments */}
                  {(liveTicket.attachments.length > 0 || addAttachments.isPending) && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Pièces jointes ({liveTicket.attachments.length})
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {liveTicket.attachments.map((att) => (
                          <li key={att._id} className="flex items-center gap-2 text-xs">
                            <Paperclip className="w-3 h-3 shrink-0 text-muted-foreground" />
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="truncate flex-1 text-foreground/80 hover:text-foreground text-left transition-colors"
                              title="Prévisualiser"
                            >
                              {att.originalname}
                            </button>
                            <a
                              href={filesApi.getUrl(att.fileId, true)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              title="Télécharger"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </li>
                        ))}
                        {addAttachments.isPending && (
                          <li className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Envoi en cours...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleUploadFiles}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={addAttachments.isPending}
                    >
                      <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                      Ajouter une pièce jointe
                    </Button>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Reporté par</span>
                      <p className="font-medium mt-0.5">{liveTicket.reporter.name}</p>
                    </div>
                    {liveTicket.assignee && (
                      <div>
                        <span className="text-muted-foreground">Assigné à</span>
                        <p className="font-medium mt-0.5">{liveTicket.assignee.name}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Créé</span>
                      <p className="font-medium mt-0.5">
                        {formatDistanceToNow(new Date(liveTicket.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Sub-tickets — only for top-level tickets */}
                  {!liveTicket.parentId && onTicketChange && (
                    <>
                      <Separator />
                      <SubTicketsList
                        workspaceId={workspaceId}
                        parentId={liveTicket._id}
                        onTicketClick={onTicketChange}
                      />
                    </>
                  )}

                  <Separator />

                  {/* Comments */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Commentaires ({comments.length})
                    </p>

                    {showCommentsSkeleton && (
                      <div className="flex flex-col gap-3">
                        {[false, true, false].map((isRight, i) => (
                          <div key={i} className={`flex flex-col gap-1.5 ${isRight ? 'items-end' : ''}`}>
                            <Skeleton className="h-2.5 w-20" />
                            <Skeleton className={`h-10 rounded-2xl ${isRight ? 'w-3/4' : 'w-4/5'}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    {!commentsLoading && comments.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">
                        Aucun commentaire pour l&apos;instant
                      </p>
                    )}

                    <div className="flex flex-col gap-3">
                      {comments.map((c) => (
                        <ChatBubble
                          key={c._id}
                          authorName={c.author.name}
                          content={c.content}
                          createdAt={c.createdAt}
                          isOwn={currentUser?._id === c.author._id}
                          canDelete={currentUser?._id === c.author._id}
                          onDelete={() => deleteComment.mutate(c._id)}
                        />
                      ))}
                      <TypingIndicator names={typingUsers.map((u) => u.userName)} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Comment input — fixed at bottom (hidden in edit mode) */}
            {!isEditing && (
              <div className="px-6 py-4 border-t shrink-0">
                <div className="flex items-center gap-3 rounded-full border bg-muted/40 px-4 h-11">
                  <input
                    type="text"
                    placeholder="Ajouter un commentaire... (Entrée pour envoyer)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    value={comment}
                    onChange={handleCommentChange}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={!comment.trim() || createComment.isPending}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {createComment.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>

    <FilePreviewModal
      attachment={previewAttachment}
      onClose={() => setPreviewAttachment(null)}
    />
    </>
  )
}

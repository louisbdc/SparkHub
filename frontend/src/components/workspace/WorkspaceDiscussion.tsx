'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, Smile } from 'lucide-react'
import { ChatBubble, TypingIndicator } from '@/components/ui/ChatBubble'
import { useMessages, useCreateMessage, useDeleteMessage } from '@/hooks/useMessages'
import { useCurrentUser } from '@/hooks/useAuth'
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket'

const TYPING_DEBOUNCE_MS = 1500

interface WorkspaceDiscussionProps {
  workspaceId: string
}

export function WorkspaceDiscussion({ workspaceId }: WorkspaceDiscussionProps) {
  const [content, setContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const { data: currentUser } = useCurrentUser()
  const { data: messages = [], isLoading } = useMessages(workspaceId)
  const createMessage = useCreateMessage(workspaceId)
  const deleteMessage = useDeleteMessage(workspaceId)

  const { typingUsers, emitTypingStart, emitTypingStop } = useWorkspaceSocket(
    workspaceId,
    currentUser?._id
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typingUsers.length])

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      emitTypingStop()
      isTypingRef.current = false
    }
  }, [emitTypingStop])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value)

    if (!isTypingRef.current) {
      emitTypingStart()
      isTypingRef.current = true
    }

    if (typingStopTimer.current) clearTimeout(typingStopTimer.current)
    typingStopTimer.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS)
  }

  const handleSend = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    stopTyping()
    createMessage.mutate(trimmed, { onSuccess: () => setContent('') })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            Aucun message pour l&apos;instant. Démarrez la discussion !
          </p>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg._id}
            authorName={msg.author.name}
            content={msg.content}
            createdAt={msg.createdAt}
            isOwn={currentUser?._id === msg.author._id}
            canDelete={currentUser?._id === msg.author._id}
            onDelete={() => deleteMessage.mutate(msg._id)}
          />
        ))}

        <TypingIndicator names={typingUsers.map((u) => u.userName)} />

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 rounded-full border bg-muted/40 px-4 h-12">
          <Smile className="w-5 h-5 shrink-0 text-muted-foreground" />

          <input
            type="text"
            placeholder="Votre message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!content.trim() || createMessage.isPending}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {createMessage.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Smile className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

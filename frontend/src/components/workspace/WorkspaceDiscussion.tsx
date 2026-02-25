'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageIcon, Reply, Send, Smile, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import data from '@emoji-mart/data'

const EmojiPicker = dynamic(() => import('@emoji-mart/react'), { ssr: false })
import { ChatBubble, TypingIndicator } from '@/components/ui/ChatBubble'
import {
  useCreateMessage,
  useDeleteMessage,
  useEditMessage,
  useMessages,
} from '@/hooks/useMessages'
import { useCurrentUser } from '@/hooks/useAuth'
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket'
import { useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '@/lib/api'
import type { Message } from '@/types'

const TYPING_DEBOUNCE_MS = 1500

interface WorkspaceDiscussionProps {
  workspaceId: string
}

export function WorkspaceDiscussion({ workspaceId }: WorkspaceDiscussionProps) {
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const { data: currentUser } = useCurrentUser()
  const { data: messages = [], isLoading } = useMessages(workspaceId)
  const createMessage = useCreateMessage(workspaceId)
  const deleteMessage = useDeleteMessage(workspaceId)
  const editMessage = useEditMessage(workspaceId)

  const { typingUsers, emitTypingStart, emitTypingStop } = useWorkspaceSocket(
    workspaceId,
    currentUser?._id
  )

  const queryClient = useQueryClient()

  useEffect(() => {
    messagesApi.markAsRead(workspaceId).then(() => {
      queryClient.setQueryData(['messages', 'unread', workspaceId], { count: 0 })
    }).catch(() => {})
  }, [workspaceId, queryClient])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typingUsers.length])

  // Cleanup object URLs on unmount
  const imagePreviewsRef = useRef(imagePreviews)
  imagePreviewsRef.current = imagePreviews
  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach(URL.revokeObjectURL)
    }
  }, [])

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

  const addImages = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    const previews = imageFiles.map((f) => URL.createObjectURL(f))
    setPendingImages((prev) => [...prev, ...imageFiles])
    setImagePreviews((prev) => [...prev, ...previews])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showEmojiPicker])

  const handleEmojiSelect = (emoji: { native: string }) => {
    const input = inputRef.current
    const native = emoji.native
    if (!input) {
      setContent((prev) => prev + native)
    } else {
      const start = input.selectionStart ?? content.length
      const end = input.selectionEnd ?? content.length
      setContent(content.slice(0, start) + native + content.slice(end))
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start + native.length, start + native.length)
      })
    }
    setShowEmojiPicker(false)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const files = Array.from(e.clipboardData.files)
    if (files.length > 0) {
      e.preventDefault()
      addImages(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addImages(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleSend = () => {
    const trimmed = content.trim()
    if (!trimmed && pendingImages.length === 0) return
    if (!currentUser) return

    stopTyping()

    // Capture before clearing state
    const capturedFiles = [...pendingImages]
    const capturedPreviews = [...imagePreviews]
    const capturedReplyTo = replyingTo

    const optimistic: Message = {
      _id: `optimistic-${Date.now()}`,
      workspace: workspaceId,
      author: currentUser,
      content: trimmed,
      replyTo: capturedReplyTo
        ? {
            _id: capturedReplyTo._id,
            content: capturedReplyTo.content,
            author: { _id: capturedReplyTo.author._id, name: capturedReplyTo.author.name },
          }
        : undefined,
      images: capturedFiles.map((file, i) => ({
        _id: `optimistic-img-${i}`,
        mimeType: file.type,
        originalname: file.name,
        size: file.size,
        url: capturedPreviews[i],
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Clear input immediately — feedback is the optimistic message
    setContent('')
    setPendingImages([])
    setImagePreviews([])
    setReplyingTo(null)

    createMessage.mutate(
      {
        content: trimmed,
        replyTo: capturedReplyTo?._id,
        images: capturedFiles.length > 0 ? capturedFiles : undefined,
        optimistic,
      },
      {
        // Revoke object URLs once the optimistic message is replaced or rolled back
        onSettled: () => capturedPreviews.forEach(URL.revokeObjectURL),
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = content.trim().length > 0 || pendingImages.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="relative flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
        {/* Skeleton overlay */}
        <div
          className={cn(
            'absolute inset-0 px-6 py-5 flex flex-col gap-4 pointer-events-none transition-opacity duration-200 z-10',
            isLoading ? 'opacity-100' : 'opacity-0'
          )}
        >
          {[
            { right: false, w: 'w-[55%]' },
            { right: true,  w: 'w-[45%]' },
            { right: false, w: 'w-[65%]' },
            { right: true,  w: 'w-[38%]' },
            { right: false, w: 'w-[50%]' },
          ].map(({ right, w }, i) => (
            <div key={i} className={`flex flex-col gap-1.5 ${right ? 'items-end' : 'items-start'}`}>
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className={`h-10 rounded-2xl ${w}`} />
            </div>
          ))}
        </div>

        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            Aucun message pour l&apos;instant. Démarrez la discussion !
          </p>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg._id}
            authorName={msg.author.name}
            authorAvatar={msg.author.avatar}
            content={msg.content}
            createdAt={msg.createdAt}
            updatedAt={msg.updatedAt}
            isOwn={currentUser?._id === msg.author._id}
            canDelete={currentUser?._id === msg.author._id}
            replyTo={msg.replyTo}
            images={msg.images}
            onDelete={() => deleteMessage.mutate(msg._id)}
            onReply={() => setReplyingTo(msg)}
            onEdit={(newContent) =>
              editMessage.mutate({ messageId: msg._id, content: newContent })
            }
          />
        ))}

        <TypingIndicator names={typingUsers.map((u) => u.userName)} />

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 shrink-0 flex flex-col gap-2">
        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, i) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reply banner */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 text-xs text-muted-foreground">
            <Reply className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-foreground/70">{replyingTo.author.name}</span>
            <span className="truncate flex-1 opacity-70">{replyingTo.content}</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="shrink-0 hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="relative flex items-center gap-3 rounded-full border bg-muted/40 px-4 h-12">
          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-14 left-0 z-50"
            >
              <EmojiPicker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                locale="fr"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder="Votre message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />

          <div className="flex items-center gap-1 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              title="Joindre une image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Envoyer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

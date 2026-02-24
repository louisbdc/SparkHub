'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'
import type { Comment } from '@/types'

interface TypingUser {
  userId: string
  userName: string
}

export function useTicketSocket(
  workspaceId: string,
  ticketId: string | undefined,
  currentUserId: string | undefined
) {
  const queryClient = useQueryClient()
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!ticketId) return

    const socket = getSocket()
    const room = `ticket:${ticketId}`

    socket.emit('join-ticket', ticketId)

    socket.on('ticket:comment', ({ comment }: { comment: Comment }) => {
      if (comment.author._id === currentUserId) return
      queryClient.setQueryData<Comment[]>(
        ['comments', workspaceId, ticketId],
        (prev) => (prev ? [...prev, comment] : [comment])
      )
    })

    socket.on('typing:start', ({ userId, userName }: TypingUser) => {
      setTypingUsers((prev) =>
        prev.find((u) => u.userId === userId) ? prev : [...prev, { userId, userName }]
      )
      const existing = typingTimeouts.current.get(userId)
      if (existing) clearTimeout(existing)
      const t = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
        typingTimeouts.current.delete(userId)
      }, 4000)
      typingTimeouts.current.set(userId, t)
    })

    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
      const t = typingTimeouts.current.get(userId)
      if (t) { clearTimeout(t); typingTimeouts.current.delete(userId) }
    })

    return () => {
      socket.emit('leave-ticket', ticketId)
      socket.off('ticket:comment')
      socket.off('typing:start')
      socket.off('typing:stop')
      typingTimeouts.current.forEach((t) => clearTimeout(t))
      typingTimeouts.current.clear()
    }
  }, [ticketId, workspaceId, currentUserId, queryClient])

  const emitTypingStart = () => {
    if (!ticketId) return
    getSocket().emit('typing:start', { room: `ticket:${ticketId}` })
  }

  const emitTypingStop = () => {
    if (!ticketId) return
    getSocket().emit('typing:stop', { room: `ticket:${ticketId}` })
  }

  return { typingUsers, emitTypingStart, emitTypingStop }
}

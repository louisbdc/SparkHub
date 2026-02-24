'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'
import type { Message } from '@/types'

interface TypingUser {
  userId: string
  userName: string
}

export function useWorkspaceSocket(workspaceId: string, currentUserId: string | undefined) {
  const queryClient = useQueryClient()
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!workspaceId) return

    const socket = getSocket()
    const room = `workspace:${workspaceId}`

    socket.emit('join-workspace', workspaceId)

    // New message from another user
    socket.on('workspace:message', ({ message }: { message: Message }) => {
      if (message.author._id === currentUserId) return
      queryClient.setQueryData<Message[]>(
        ['messages', workspaceId],
        (prev) => (prev ? [...prev, message] : [message])
      )
    })

    socket.on('typing:start', ({ userId, userName }: TypingUser) => {
      setTypingUsers((prev) =>
        prev.find((u) => u.userId === userId) ? prev : [...prev, { userId, userName }]
      )
      // Auto-clear after 4s in case typing:stop never arrives
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
      socket.emit('leave-workspace', workspaceId)
      socket.off('workspace:message')
      socket.off('typing:start')
      socket.off('typing:stop')
      typingTimeouts.current.forEach((t) => clearTimeout(t))
      typingTimeouts.current.clear()
    }
  }, [workspaceId, currentUserId, queryClient])

  const emitTypingStart = () => {
    getSocket().emit('typing:start', { room: `workspace:${workspaceId}` })
  }

  const emitTypingStop = () => {
    getSocket().emit('typing:stop', { room: `workspace:${workspaceId}` })
  }

  return { typingUsers, emitTypingStart, emitTypingStop }
}

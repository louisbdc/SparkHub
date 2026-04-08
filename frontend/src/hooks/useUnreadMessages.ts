'use client'

import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useCurrentUser } from '@/hooks/useAuth'
import type { Message } from '@/types'

export function useUnreadMessages(workspaceId: string, isActive = false) {
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()

  const { data } = useQuery({
    queryKey: ['messages', 'unread', workspaceId],
    queryFn: () => messagesApi.getUnreadCount(workspaceId),
    enabled: !!workspaceId && !!currentUser,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (!currentUser || !workspaceId) return

    const socket = getSocket()

    const handleMessage = ({ message }: { message: Message }) => {
      if (message.author._id === currentUser._id) return
      if (isActive) return
      queryClient.setQueryData(
        ['messages', 'unread', workspaceId],
        (prev: { count: number } | undefined) => ({ count: (prev?.count ?? 0) + 1 })
      )
    }

    socket.on('workspace:message', handleMessage)

    return () => {
      socket.off('workspace:message', handleMessage)
    }
  }, [workspaceId, currentUser, isActive, queryClient])

  const markAsRead = useCallback(async () => {
    await messagesApi.markAsRead(workspaceId)
    queryClient.setQueryData(['messages', 'unread', workspaceId], { count: 0 })
  }, [workspaceId, queryClient])

  return { count: data?.count ?? 0, markAsRead }
}

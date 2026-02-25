'use client'

import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '@/lib/api'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useAuth'

export function useUnreadMessages(workspaceId: string, isActive = false) {
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()

  const { data } = useQuery({
    queryKey: ['messages', 'unread', workspaceId],
    queryFn: () => messagesApi.getUnreadCount(workspaceId),
    enabled: !!workspaceId && !!currentUser,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!currentUser) return

    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`messages:unread:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const msg = payload.new as { author_id: string }
          if (msg.author_id === currentUser._id) return
          if (isActive) return
          queryClient.setQueryData(
            ['messages', 'unread', workspaceId],
            (prev: { count: number } | undefined) => ({ count: (prev?.count ?? 0) + 1 })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, currentUser, isActive, queryClient])

  const markAsRead = useCallback(async () => {
    await messagesApi.markAsRead(workspaceId)
    queryClient.setQueryData(['messages', 'unread', workspaceId], { count: 0 })
  }, [workspaceId, queryClient])

  return { count: data?.count ?? 0, markAsRead }
}

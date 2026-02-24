'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '@/lib/api'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Message } from '@/types'

const messagesKey = (workspaceId: string) => ['messages', workspaceId]

export function useMessages(workspaceId: string) {
  const queryClient = useQueryClient()

  // Initial fetch — no polling, Realtime handles updates
  const query = useQuery({
    queryKey: messagesKey(workspaceId),
    queryFn: () => messagesApi.list(workspaceId),
    enabled: Boolean(workspaceId),
  })

  // Supabase Realtime subscription
  useEffect(() => {
    if (!workspaceId) return

    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`messages:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newId = (payload.new as { id: string }).id
            try {
              const message = await messagesApi.getById(workspaceId, newId)
              queryClient.setQueryData<Message[]>(
                messagesKey(workspaceId),
                (prev) => {
                  if (!prev) return [message]
                  if (prev.some((m) => m._id === message._id)) return prev
                  return [...prev, message]
                }
              )
            } catch {
              // Fallback: refetch everything if enrichment fails
              queryClient.invalidateQueries({ queryKey: messagesKey(workspaceId) })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedId = (payload.new as { id: string }).id
            try {
              const message = await messagesApi.getById(workspaceId, updatedId)
              queryClient.setQueryData<Message[]>(
                messagesKey(workspaceId),
                (prev) => prev?.map((m) => (m._id === message._id ? message : m)) ?? []
              )
            } catch {
              queryClient.invalidateQueries({ queryKey: messagesKey(workspaceId) })
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            queryClient.setQueryData<Message[]>(
              messagesKey(workspaceId),
              (prev) => prev?.filter((m) => m._id !== deletedId) ?? []
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, queryClient])

  return query
}

export function useCreateMessage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { content: string; replyTo?: string; images?: File[] }) =>
      messagesApi.create(workspaceId, payload),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<Message[]>(
        messagesKey(workspaceId),
        (prev) => {
          if (!prev) return [newMessage]
          if (prev.some((m) => m._id === newMessage._id)) return prev
          return [...prev, newMessage]
        }
      )
    },
  })
}

export function useEditMessage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      messagesApi.update(workspaceId, messageId, content),
    onSuccess: (updated) => {
      queryClient.setQueryData<Message[]>(
        messagesKey(workspaceId),
        (prev) => prev?.map((m) => (m._id === updated._id ? updated : m)) ?? []
      )
    },
  })
}

export function useDeleteMessage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => messagesApi.delete(workspaceId, messageId),
    onSuccess: (_data, messageId) => {
      queryClient.setQueryData<Message[]>(
        messagesKey(workspaceId),
        (prev) => prev?.filter((m) => m._id !== messageId) ?? []
      )
    },
  })
}

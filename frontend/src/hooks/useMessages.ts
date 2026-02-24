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

type CreatePayload = {
  content: string
  replyTo?: string
  images?: File[]
  optimistic?: Message
}

export function useCreateMessage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ content, replyTo, images }: CreatePayload) =>
      messagesApi.create(workspaceId, { content, replyTo, images }),

    onMutate: async ({ optimistic }) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: messagesKey(workspaceId) })
      const snapshot = queryClient.getQueryData<Message[]>(messagesKey(workspaceId))
      if (optimistic) {
        queryClient.setQueryData<Message[]>(
          messagesKey(workspaceId),
          (old) => (old ? [...old, optimistic] : [optimistic])
        )
      }
      return { snapshot, optimisticId: optimistic?._id }
    },

    onError: (_err, _vars, context) => {
      // Roll back to pre-send state on failure
      if (context?.snapshot) {
        queryClient.setQueryData(messagesKey(workspaceId), context.snapshot)
      }
    },

    onSuccess: (real, _vars, context) => {
      // Replace the optimistic message with the real one
      queryClient.setQueryData<Message[]>(messagesKey(workspaceId), (prev) => {
        if (!prev) return [real]
        const without = context?.optimisticId
          ? prev.filter((m) => m._id !== context.optimisticId)
          : prev
        return without.some((m) => m._id === real._id) ? without : [...without, real]
      })
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

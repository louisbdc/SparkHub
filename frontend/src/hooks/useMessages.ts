'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '@/lib/api'
import type { Message } from '@/types'

const messagesKey = (workspaceId: string) => ['messages', workspaceId]

export function useMessages(workspaceId: string) {
  return useQuery({
    queryKey: messagesKey(workspaceId),
    queryFn: () => messagesApi.list(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: 10_000,
  })
}

export function useCreateMessage(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { content: string; replyTo?: string; images?: File[] }) =>
      messagesApi.create(workspaceId, payload),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<Message[]>(
        messagesKey(workspaceId),
        (prev) => (prev ? [...prev, newMessage] : [newMessage])
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

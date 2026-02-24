'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '@/lib/api'
import type { Comment } from '@/types'

const commentsKey = (ticketId: string) => ['comments', ticketId]

export function useComments(workspaceId: string, ticketId: string) {
  return useQuery({
    queryKey: commentsKey(ticketId),
    queryFn: () => commentsApi.list(workspaceId, ticketId),
    enabled: Boolean(workspaceId) && Boolean(ticketId),
  })
}

export function useCreateComment(workspaceId: string, ticketId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) => commentsApi.create(workspaceId, ticketId, content),
    onSuccess: (newComment) => {
      queryClient.setQueryData<Comment[]>(
        commentsKey(ticketId),
        (prev) => (prev ? [...prev, newComment] : [newComment])
      )
    },
  })
}

export function useDeleteComment(workspaceId: string, ticketId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) =>
      commentsApi.delete(workspaceId, ticketId, commentId),
    onSuccess: (_data, commentId) => {
      queryClient.setQueryData<Comment[]>(
        commentsKey(ticketId),
        (prev) => prev?.filter((c) => c._id !== commentId) ?? []
      )
    },
  })
}

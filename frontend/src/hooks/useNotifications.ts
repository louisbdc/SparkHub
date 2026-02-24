'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'
import { getToken } from '@/lib/auth'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: Boolean(getToken()),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { workspacesApi } from '@/lib/api'
import type { Workspace } from '@/types'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => workspacesApi.getById(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: string
      payload: { name?: string; description?: string; color?: string }
    }) => workspacesApi.update(workspaceId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Workspace>(['workspaces', updated._id], updated)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: string
      payload: { email: string; role?: 'admin' | 'dev' | 'client' }
    }) => workspacesApi.inviteMember(workspaceId, payload),
    onSuccess: ({ workspace }) => {
      queryClient.setQueryData<Workspace>(['workspaces', workspace._id], workspace)
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspace._id] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      memberId,
    }: {
      workspaceId: string
      memberId: string
    }) => workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: (updated) => {
      queryClient.setQueryData<Workspace>(['workspaces', updated._id], updated)
      queryClient.invalidateQueries({ queryKey: ['workspaces', updated._id] })
    },
  })
}

export function useArchiveWorkspace() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (workspaceId: string) => workspacesApi.archive(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      router.push('/dashboard')
    },
  })
}

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { setToken, removeToken, getToken } from '@/lib/auth'
import type { LoginCredentials, User } from '@/types'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: Boolean(getToken()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (payload: {
      name: string
      email: string
      password: string
      role: 'dev' | 'client'
    }) => authApi.register(payload),
    onSuccess: (data) => {
      setToken(data.token)
      queryClient.setQueryData(['auth', 'me'], data.user)
      router.push('/dashboard')
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setToken(data.token)
      queryClient.setQueryData(['auth', 'me'], data.user)
      router.push('/dashboard')
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return () => {
    removeToken()
    authApi.logout()
    queryClient.clear()
    router.push('/login')
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name?: string; avatar?: string }) =>
      authApi.updateMe(payload),
    onSuccess: (user: User) => {
      queryClient.setQueryData(['auth', 'me'], user)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(payload),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: { accessToken: string; newPassword: string }) =>
      authApi.resetPassword(payload),
  })
}

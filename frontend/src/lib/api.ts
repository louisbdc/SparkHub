import axios, { AxiosError } from 'axios'
import Cookies from 'js-cookie'
import type {
  ApiResponse,
  AuthResponse,
  Comment,
  CreateTicketDto,
  LoginCredentials,
  Message,
  Ticket,
  UpdateTicketDto,
  Workspace,
} from '@/types'

// In dev, Next.js API routes are same-origin (/api/...).
// NEXT_PUBLIC_API_URL can be set for non-default ports, but empty = same origin.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export const TOKEN_KEY = 'sparkhub_token'
export const REFRESH_TOKEN_KEY = 'sparkhub_refresh_token'

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: false,
})

// Attach JWT and Content-Type to every request
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Let the browser set multipart/form-data boundary automatically for FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

// Normalize error shape — attempt token refresh on 401 before redirecting
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse<never>>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = Cookies.get(REFRESH_TOKEN_KEY)

      if (refreshToken) {
        if (isRefreshing) {
          // Queue this request until the refresh completes
          return new Promise((resolve) => {
            pendingRequests.push((token) => {
              originalRequest.headers.set('Authorization', `Bearer ${token}`)
              resolve(apiClient(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const { data } = await axios.post<ApiResponse<{ token: string; refreshToken: string }>>(
            `${originalRequest.baseURL ?? ''}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )
          const newToken = data.data!.token
          const newRefresh = data.data!.refreshToken

          Cookies.set(TOKEN_KEY, newToken)
          Cookies.set(REFRESH_TOKEN_KEY, newRefresh)

          // Replay queued requests
          pendingRequests.forEach((cb) => cb(newToken))
          pendingRequests = []

          originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
          return apiClient(originalRequest)
        } catch {
          pendingRequests = []
          Cookies.remove(TOKEN_KEY)
          Cookies.remove(REFRESH_TOKEN_KEY)
          if (typeof window !== 'undefined') window.location.href = '/login'
        } finally {
          isRefreshing = false
        }
      } else {
        Cookies.remove(TOKEN_KEY)
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }

    const message =
      error.response?.data?.error ?? error.message ?? 'Une erreur est survenue'
    return Promise.reject(new Error(message))
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/auth/register  → { data: { token, user } }
// POST /api/auth/login     → { data: { token, user } }
// GET  /api/auth/me        → { data: { user } }
// PATCH /api/auth/me       → { data: { user } }

export const authApi = {
  register: async (payload: {
    name: string
    email: string
    password: string
    role?: 'dev' | 'client'
  }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse & { refreshToken: string }>>(
      '/auth/register',
      payload
    )
    if (data.data?.refreshToken) Cookies.set(REFRESH_TOKEN_KEY, data.data.refreshToken)
    return data.data!
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse & { refreshToken: string }>>(
      '/auth/login',
      credentials
    )
    if (data.data?.refreshToken) Cookies.set(REFRESH_TOKEN_KEY, data.data.refreshToken)
    return data.data!
  },

  getMe: async (): Promise<AuthResponse['user']> => {
    const { data } = await apiClient.get<ApiResponse<{ user: AuthResponse['user'] }>>(
      '/auth/me'
    )
    return data.data!.user
  },

  updateMe: async (payload: {
    name?: string
    avatar?: string
  }): Promise<AuthResponse['user']> => {
    const { data } = await apiClient.patch<ApiResponse<{ user: AuthResponse['user'] }>>(
      '/auth/me',
      payload
    )
    return data.data!.user
  },

  changePassword: async (payload: {
    currentPassword: string
    newPassword: string
  }): Promise<{ message: string }> => {
    const { data } = await apiClient.patch<ApiResponse<{ message: string }>>(
      '/auth/password',
      payload
    )
    return data.data!
  },

  logout: () => {
    Cookies.remove(TOKEN_KEY)
    Cookies.remove(REFRESH_TOKEN_KEY)
  },
}

// ── Workspaces ────────────────────────────────────────────────────────────────
// API wraps single resources: { data: { workspace: {...} } }
// List uses workspaceId (ObjectId) — route param :workspaceId

export const workspacesApi = {
  list: async (): Promise<Workspace[]> => {
    const { data } = await apiClient.get<ApiResponse<{ workspaces: Workspace[] }>>(
      '/workspaces'
    )
    return data.data?.workspaces ?? []
  },

  getById: async (workspaceId: string): Promise<Workspace> => {
    const { data } = await apiClient.get<ApiResponse<{ workspace: Workspace }>>(
      `/workspaces/${workspaceId}`
    )
    return data.data!.workspace
  },

  create: async (payload: {
    name: string
    description?: string
    color?: string
  }): Promise<Workspace> => {
    const { data } = await apiClient.post<ApiResponse<{ workspace: Workspace }>>(
      '/workspaces',
      payload
    )
    return data.data!.workspace
  },

  update: async (
    workspaceId: string,
    payload: { name?: string; description?: string; color?: string }
  ): Promise<Workspace> => {
    const { data } = await apiClient.patch<ApiResponse<{ workspace: Workspace }>>(
      `/workspaces/${workspaceId}`,
      payload
    )
    return data.data!.workspace
  },

  archive: async (workspaceId: string): Promise<Workspace> => {
    const { data } = await apiClient.patch<ApiResponse<{ workspace: Workspace }>>(
      `/workspaces/${workspaceId}/archive`
    )
    return data.data!.workspace
  },

  addMember: async (
    workspaceId: string,
    payload: { userId: string; role?: 'admin' | 'dev' | 'client' }
  ): Promise<Workspace> => {
    const { data } = await apiClient.post<ApiResponse<{ workspace: Workspace }>>(
      `/workspaces/${workspaceId}/members`,
      payload
    )
    return data.data!.workspace
  },

  removeMember: async (workspaceId: string, memberId: string): Promise<Workspace> => {
    const { data } = await apiClient.delete<ApiResponse<{ workspace: Workspace }>>(
      `/workspaces/${workspaceId}/members/${memberId}`
    )
    return data.data!.workspace
  },

  inviteMember: async (
    workspaceId: string,
    payload: { email: string; role?: 'admin' | 'dev' | 'client' }
  ): Promise<{ workspace: Workspace; invitedUser: { name: string; email: string }; status: 'added' | 'invited' }> => {
    const { data } = await apiClient.post<
      ApiResponse<{ workspace: Workspace; invitedUser: { name: string; email: string }; status: 'added' | 'invited' }>
    >(`/workspaces/${workspaceId}/invite`, payload)
    return data.data!
  },
}

// ── Tickets ──────────────────────────────────────────────────────────────────
// Routes: /workspaces/:workspaceId/tickets[/:ticketId]
// API wraps single resources: { data: { ticket: {...} } }
// Dedicated status endpoint for Kanban DnD: PATCH .../tickets/:ticketId/status

export const ticketsApi = {
  list: async (workspaceId: string): Promise<Ticket[]> => {
    const { data } = await apiClient.get<ApiResponse<{ tickets: Ticket[] }>>(
      `/workspaces/${workspaceId}/tickets`
    )
    return data.data?.tickets ?? []
  },

  getById: async (workspaceId: string, ticketId: string): Promise<Ticket> => {
    const { data } = await apiClient.get<ApiResponse<{ ticket: Ticket }>>(
      `/workspaces/${workspaceId}/tickets/${ticketId}`
    )
    return data.data!.ticket
  },

  create: async (workspaceId: string, payload: CreateTicketDto, files?: File[]): Promise<Ticket> => {
    let body: FormData | CreateTicketDto
    let headers: Record<string, string> = {}

    if (files && files.length > 0) {
      const form = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) form.append(key, String(value))
      })
      files.forEach((file) => form.append('attachments', file))
      body = form
    } else {
      body = payload
      headers['Content-Type'] = 'application/json'
    }

    const { data } = await apiClient.post<ApiResponse<{ ticket: Ticket }>>(
      `/workspaces/${workspaceId}/tickets`,
      body,
      { headers }
    )
    return data.data!.ticket
  },

  update: async (
    workspaceId: string,
    ticketId: string,
    payload: UpdateTicketDto,
    files?: File[]
  ): Promise<Ticket> => {
    let body: FormData | UpdateTicketDto
    let headers: Record<string, string> = {}

    if (files && files.length > 0) {
      const form = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) form.append(key, String(value))
      })
      files.forEach((file) => form.append('attachments', file))
      body = form
    } else {
      body = payload
      headers['Content-Type'] = 'application/json'
    }

    const { data } = await apiClient.patch<ApiResponse<{ ticket: Ticket }>>(
      `/workspaces/${workspaceId}/tickets/${ticketId}`,
      body,
      { headers }
    )
    return data.data!.ticket
  },

  // Dedicated endpoint for Kanban drag-and-drop (status + order only)
  updateStatus: async (
    workspaceId: string,
    ticketId: string,
    payload: { status: string; order?: number }
  ): Promise<Ticket> => {
    const { data } = await apiClient.patch<ApiResponse<{ ticket: Ticket }>>(
      `/workspaces/${workspaceId}/tickets/${ticketId}/status`,
      payload
    )
    return data.data!.ticket
  },

  delete: async (workspaceId: string, ticketId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/tickets/${ticketId}`)
  },
}

// ── Comments ─────────────────────────────────────────────────────────────────
// Routes: /tickets/:workspaceId/:ticketId/comments[/:commentId]
// API wraps single resources: { data: { comment: {...} } }

export const commentsApi = {
  list: async (workspaceId: string, ticketId: string): Promise<Comment[]> => {
    const { data } = await apiClient.get<ApiResponse<{ comments: Comment[] }>>(
      `/tickets/${workspaceId}/${ticketId}/comments`
    )
    return data.data?.comments ?? []
  },

  create: async (
    workspaceId: string,
    ticketId: string,
    content: string
  ): Promise<Comment> => {
    const { data } = await apiClient.post<ApiResponse<{ comment: Comment }>>(
      `/tickets/${workspaceId}/${ticketId}/comments`,
      { content }
    )
    return data.data!.comment
  },

  update: async (
    workspaceId: string,
    ticketId: string,
    commentId: string,
    content: string
  ): Promise<Comment> => {
    const { data } = await apiClient.patch<ApiResponse<{ comment: Comment }>>(
      `/tickets/${workspaceId}/${ticketId}/comments/${commentId}`,
      { content }
    )
    return data.data!.comment
  },

  delete: async (
    workspaceId: string,
    ticketId: string,
    commentId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/tickets/${workspaceId}/${ticketId}/comments/${commentId}`
    )
  },
}

// ── Messages ──────────────────────────────────────────────────────────────────
// Routes: /workspaces/:workspaceId/messages[/:messageId]

export const messagesApi = {
  list: async (workspaceId: string): Promise<Message[]> => {
    const { data } = await apiClient.get<ApiResponse<{ messages: Message[] }>>(
      `/workspaces/${workspaceId}/messages`
    )
    return data.data?.messages ?? []
  },

  create: async (
    workspaceId: string,
    payload: { content: string; replyTo?: string; images?: File[] }
  ): Promise<Message> => {
    let body: FormData | { content: string; replyTo?: string }

    if (payload.images && payload.images.length > 0) {
      const form = new FormData()
      form.append('content', payload.content)
      if (payload.replyTo) form.append('replyTo', payload.replyTo)
      payload.images.forEach((img) => form.append('images', img))
      body = form
    } else {
      body = { content: payload.content, ...(payload.replyTo ? { replyTo: payload.replyTo } : {}) }
    }

    const { data } = await apiClient.post<ApiResponse<{ message: Message }>>(
      `/workspaces/${workspaceId}/messages`,
      body
    )
    return data.data!.message
  },

  update: async (workspaceId: string, messageId: string, content: string): Promise<Message> => {
    const { data } = await apiClient.patch<ApiResponse<{ message: Message }>>(
      `/workspaces/${workspaceId}/messages/${messageId}`,
      { content }
    )
    return data.data!.message
  },

  delete: async (workspaceId: string, messageId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/messages/${messageId}`)
  },
}

// ── Files ─────────────────────────────────────────────────────────────────────
// Routes: /files/:fileId
// Files are stored in MongoDB GridFS

export const filesApi = {
  getUrl: (fileId: string, download = false): string => {
    const base = `${API_BASE_URL}/api/files/${fileId}`
    return download ? `${base}?download=1` : base
  },

  getSignedUrl: async (fileId: string): Promise<string> => {
    const { data } = await apiClient.get<ApiResponse<{ url: string }>>(
      `/files/${fileId}?json=1`
    )
    return data.data!.url
  },

  delete: async (fileId: string): Promise<void> => {
    await apiClient.delete(`/files/${fileId}`)
  },
}

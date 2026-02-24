export type UserRole = 'admin' | 'dev' | 'client'

export type TicketStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketType = 'bug' | 'feature' | 'task' | 'improvement'

export interface User {
  _id: string
  name: string
  email: string
  avatar: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  user: User
  role: UserRole
  joinedAt: string
}

export interface Workspace {
  _id: string
  name: string
  slug: string
  description: string
  color: string
  owner: User
  members: WorkspaceMember[]
  memberCount: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  _id: string
  fileId: string       // GridFS file ID — utilisé pour /api/files/:fileId
  filename: string     // nom stocké (ex: "1703012345678-file.pdf")
  originalname: string // nom original de l'utilisateur (ex: "file.pdf") — à afficher
  mimeType: string
  size: number
  uploadedAt: string
}

export interface Comment {
  _id: string
  ticket: string
  author: User
  content: string
  createdAt: string
  updatedAt: string
}

export interface MessageImage {
  _id: string
  mimeType: string
  originalname: string
  size: number
  url?: string
}

export interface MessageReply {
  _id: string
  content: string
  author: Pick<User, '_id' | 'name'>
}

export interface Message {
  _id: string
  workspace: string
  author: User
  content: string
  replyTo?: MessageReply
  images: MessageImage[]
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  _id: string
  workspace: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  type: TicketType
  reporter: User
  assignee: User | null
  attachments: Attachment[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export interface AuthTokenPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface CreateTicketDto {
  title: string
  description?: string
  priority: TicketPriority
  type: TicketType
  assigneeId?: string
}

export interface UpdateTicketDto {
  title?: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  type?: TicketType
  assigneeId?: string | null
  order?: number
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  todo: 'À faire',
  in_progress: 'En cours',
  review: 'En revue',
  done: 'Terminé',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Tâche',
  improvement: 'Amélioration',
}

export type NotificationType = 'ticket_created' | 'ticket_assigned' | 'ticket_commented' | 'ticket_status_changed'

export interface Notification {
  _id: string
  type: NotificationType
  title: string
  body: string
  link: string
  isRead: boolean
  createdAt: string
}

export const TICKET_STATUSES: TicketStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
]

/**
 * DB row types (snake_case from Supabase) → frontend types (_id, camelCase)
 * All mapping goes through these helpers so the frontend stays unchanged.
 */
import type {
  Attachment,
  Comment,
  Message,
  MessageImage,
  MessageReply,
  Ticket,
  User,
  Workspace,
  WorkspaceMember,
} from '@/types'

// ── Raw DB row types ──────────────────────────────────────────────────────────

export interface DbProfile {
  id: string
  name: string
  email: string
  avatar: string | null
  role: 'admin' | 'dev' | 'client'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbWorkspace {
  id: string
  name: string
  slug: string
  description: string
  color: string
  owner_id: string
  is_archived: boolean
  created_at: string
  updated_at: string
  owner: DbProfile
  members: DbWorkspaceMember[]
}

export interface DbWorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'admin' | 'dev' | 'client'
  joined_at: string
  user: DbProfile
}

export interface DbTicket {
  id: string
  workspace_id: string
  title: string
  description: string
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type: 'bug' | 'feature' | 'task' | 'improvement'
  reporter_id: string
  assignee_id: string | null
  order: number
  created_at: string
  updated_at: string
  reporter: DbProfile
  assignee: DbProfile | null
  attachments: DbAttachment[]
}

export interface DbAttachment {
  id: string
  ticket_id: string
  storage_key: string
  filename: string
  originalname: string
  mime_type: string
  size: number
  uploaded_at: string
}

export interface DbComment {
  id: string
  ticket_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  author: DbProfile
}

export interface DbMessageImage {
  id: string
  mime_type: string
  originalname: string
  size: number
  storage_key: string
  url?: string
}

export interface DbReplyMessage {
  id: string
  content: string
  author: { id: string; name: string }
}

export interface DbMessage {
  id: string
  workspace_id: string
  author_id: string
  content: string
  reply_to: string | null
  reply_to_message: DbReplyMessage | null
  images: DbMessageImage[]
  created_at: string
  updated_at: string
  author: DbProfile
}

// ── Mappers ───────────────────────────────────────────────────────────────────

export function mapProfile(row: DbProfile): User {
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapWorkspace(row: DbWorkspace): Workspace {
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    owner: mapProfile(row.owner),
    members: row.members.map(mapWorkspaceMember),
    memberCount: row.members.length,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapWorkspaceMember(row: DbWorkspaceMember): WorkspaceMember {
  return {
    user: mapProfile(row.user),
    role: row.role,
    joinedAt: row.joined_at,
  }
}

export function mapAttachment(row: DbAttachment): Attachment {
  return {
    _id: row.id,
    fileId: row.id,        // fileId used to build /api/files/:fileId download URL
    filename: row.filename,
    originalname: row.originalname,
    mimeType: row.mime_type,
    size: row.size,
    uploadedAt: row.uploaded_at,
  }
}

export function mapTicket(row: DbTicket): Ticket {
  return {
    _id: row.id,
    workspace: row.workspace_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    type: row.type,
    reporter: mapProfile(row.reporter),
    assignee: row.assignee ? mapProfile(row.assignee) : null,
    attachments: (row.attachments ?? []).map(mapAttachment),
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapComment(row: DbComment): Comment {
  return {
    _id: row.id,
    ticket: row.ticket_id,
    author: mapProfile(row.author),
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessageImage(row: DbMessageImage): MessageImage {
  return {
    _id: row.id,
    mimeType: row.mime_type,
    originalname: row.originalname,
    size: row.size,
    url: row.url,
  }
}

function mapReplyMessage(row: DbReplyMessage): MessageReply {
  return {
    _id: row.id,
    content: row.content,
    author: { _id: row.author.id, name: row.author.name },
  }
}

export function mapMessage(row: DbMessage): Message {
  return {
    _id: row.id,
    workspace: row.workspace_id,
    author: mapProfile(row.author),
    content: row.content,
    replyTo: row.reply_to_message ? mapReplyMessage(row.reply_to_message) : undefined,
    images: (row.images ?? []).map(mapMessageImage),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

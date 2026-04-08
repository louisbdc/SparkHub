'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownTextarea } from '@/components/ui/MarkdownTextarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEditTicket } from '@/hooks/useTickets'
import { TodoEditor, type TodoItem } from './TodoEditor'
import {
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  type Ticket,
  type TicketPriority,
  type TicketType,
  type TicketStatus,
  type User,
} from '@/types'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
const TYPES: TicketType[] = ['task', 'bug', 'feature', 'improvement']

const schema = z.object({
  title: z.string().min(3, 'Minimum 3 caractères').max(200, 'Maximum 200 caractères'),
  description: z.string().max(10000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done'] as const),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  type: z.enum(['bug', 'feature', 'task', 'improvement'] as const),
})

type FormValues = z.infer<typeof schema>

interface EditTicketFormProps {
  ticket: Ticket
  workspaceId: string
  members: User[]
  onSuccess: () => void
  onCancel: () => void
}

export function EditTicketForm({ ticket, workspaceId, members, onSuccess, onCancel }: EditTicketFormProps) {
  const editTicket = useEditTicket(workspaceId)
  const [assigneeValue, setAssigneeValue] = useState<string>(ticket.assignee?._id ?? 'none')
  const [todos, setTodos] = useState<TodoItem[]>(() =>
    ticket.todos.map((t) => ({ text: t.text, done: t.done }))
  )
  // Map from blob URL → File for newly pasted inline images in this edit session
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map())

  useEffect(() => {
    return () => {
      pendingImages.forEach((_file, blobUrl) => URL.revokeObjectURL(blobUrl))
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: ticket.title,
      description: ticket.description ?? '',
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
    },
  })

  const handleImagePaste = (file: File, insertMarkdown: (md: string) => void) => {
    const blobUrl = URL.createObjectURL(file)
    setPendingImages((prev) => new Map(prev).set(blobUrl, file))
    insertMarkdown(`![image](${blobUrl})`)
  }

  const onSubmit = (values: FormValues) => {
    let description = values.description ?? ''
    const imageFiles: File[] = []

    // Replace only newly-pasted blob: URLs with __IMGPASTE_N__ tokens
    // Existing /api/ticket-images/:id references are left untouched
    if (pendingImages.size > 0) {
      let idx = 0
      for (const [blobUrl, file] of pendingImages) {
        if (description.includes(blobUrl)) {
          description = description.replace(blobUrl, `__IMGPASTE_${idx}__`)
          imageFiles.push(file)
          idx++
        } else {
          URL.revokeObjectURL(blobUrl)
        }
      }
    }

    const payload = {
      ...values,
      description,
      assigneeId: assigneeValue === 'none' ? null : assigneeValue,
      todos: todos.map((t) => ({ text: t.text, done: t.done })),
    }

    editTicket.mutate(
      {
        ticketId: ticket._id,
        payload,
        descriptionImages: imageFiles.length > 0 ? imageFiles : undefined,
      },
      {
        onSuccess: () => {
          pendingImages.forEach((_file, blobUrl) => URL.revokeObjectURL(blobUrl))
          setPendingImages(new Map())
          onSuccess()
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="edit-title">Titre *</Label>
        <Input id="edit-title" {...register('title')} />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <MarkdownTextarea
          id="edit-description"
          rows={6}
          placeholder="Décrivez le ticket... (Markdown supporté, images collables)"
          value={watch('description') ?? ''}
          onImagePaste={handleImagePaste}
          onValueChange={(v) => setValue('description', v)}
          {...register('description')}
        />
      </div>

      {/* Todos */}
      <div className="space-y-2">
        <Label>Tâches</Label>
        <TodoEditor todos={todos} onChange={setTodos} />
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select
            defaultValue={ticket.status}
            onValueChange={(v) => setValue('status', v as TicketStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priorité</Label>
          <Select
            defaultValue={ticket.priority}
            onValueChange={(v) => setValue('priority', v as TicketPriority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {TICKET_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          defaultValue={ticket.type}
          onValueChange={(v) => setValue('type', v as TicketType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TICKET_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      {members.length > 0 && (
        <div className="space-y-2">
          <Label>Assigné à</Label>
          <Select value={assigneeValue} onValueChange={setAssigneeValue}>
            <SelectTrigger>
              <SelectValue placeholder="Non assigné" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non assigné</SelectItem>
              {members.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {editTicket.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2">
          <p className="text-xs text-destructive">{editTicket.error.message}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={editTicket.isPending} className="flex-1">
          {editTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={editTicket.isPending}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

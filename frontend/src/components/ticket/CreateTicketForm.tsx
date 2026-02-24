'use client'

import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTicket } from '@/hooks/useTickets'
import { useWorkspace } from '@/hooks/useWorkspaces'
import {
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
  type TicketPriority,
  type TicketType,
} from '@/types'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
const TYPES: TicketType[] = ['task', 'bug', 'feature', 'improvement']

const schema = z.object({
  title: z
    .string()
    .min(3, 'Minimum 3 caractères')
    .max(200, 'Maximum 200 caractères'),
  description: z.string().max(10000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  type: z.enum(['bug', 'feature', 'task', 'improvement'] as const),
  assigneeId: z.string().uuid().optional(),
})

type FormValues = z.infer<typeof schema>

interface CreateTicketFormProps {
  workspaceId: string
  onSuccess: () => void
}

export function CreateTicketForm({ workspaceId, onSuccess }: CreateTicketFormProps) {
  const createTicket = useCreateTicket(workspaceId)
  const { data: workspace } = useWorkspace(workspaceId)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const members = [
    ...(workspace?.owner ? [workspace.owner] : []),
    ...(workspace?.members.map((m) => m.user) ?? []),
  ].filter((u, i, arr) => arr.findIndex((x) => x._id === u._id) === i)

  const devMembers = members.filter((m) => m.role === 'dev' || m.role === 'admin')
  const soloDefault = devMembers.length === 1 ? devMembers[0] : null

  const [assigneeValue, setAssigneeValue] = useState<string>('none')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', type: 'task' },
  })

  useEffect(() => {
    if (soloDefault) {
      setAssigneeValue(soloDefault._id)
      setValue('assigneeId', soloDefault._id)
    }
  }, [soloDefault?._id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (values: FormValues) => {
    createTicket.mutate(
      { payload: values, files: files.length > 0 ? files : undefined },
      {
        onSuccess: () => {
          reset()
          setFiles([])
          setAssigneeValue(soloDefault?._id ?? 'none')
          setValue('assigneeId', soloDefault?._id)
          onSuccess()
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          placeholder="Ex: Le bouton de paiement ne fonctionne pas"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Décrivez le problème ou la demande..."
          rows={4}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Type + Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            defaultValue="task"
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

        <div className="space-y-2">
          <Label>Priorité</Label>
          <Select
            defaultValue="medium"
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

      {/* Assignee */}
      {members.length > 0 && (
        <div className="space-y-2">
          <Label>Assigné à</Label>
          <Select
            value={assigneeValue}
            onValueChange={(v) => {
              setAssigneeValue(v)
              setValue('assigneeId', v === 'none' ? undefined : v)
            }}
          >
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

      {/* File attachments */}
      <div className="space-y-2">
        <Label>Pièces jointes</Label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-3.5 h-3.5 mr-1.5" />
          Ajouter des fichiers
        </Button>
        {files.length > 0 && (
          <ul className="flex flex-col gap-1 mt-1">
            {files.map((file, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createTicket.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2">
          <p className="text-xs text-destructive">{createTicket.error.message}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => { reset(); setFiles([]) }}>
          Réinitialiser
        </Button>
        <Button type="submit" disabled={createTicket.isPending || assigneeValue === 'none'}>
          {createTicket.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          Créer le ticket
        </Button>
      </div>
    </form>
  )
}

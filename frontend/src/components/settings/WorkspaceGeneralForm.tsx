'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateWorkspace } from '@/hooks/useWorkspaces'
import type { Workspace } from '@/types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

type FormValues = z.infer<typeof schema>

interface Props {
  workspace: Workspace
}

export function WorkspaceGeneralForm({ workspace }: Props) {
  const updateWorkspace = useUpdateWorkspace()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description ?? '',
      color: workspace.color,
    },
  })

  useEffect(() => {
    reset({
      name: workspace.name,
      description: workspace.description ?? '',
      color: workspace.color,
    })
  }, [workspace, reset])

  const selectedColor = watch('color')

  const onSubmit = (values: FormValues) => {
    updateWorkspace.mutate({ workspaceId: workspace._id, payload: values })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nom
          </Label>
          <Input {...register('name')} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Couleur
          </Label>
          <div className="flex items-center gap-2 h-9">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color, { shouldDirty: true })}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110 shrink-0"
                style={{
                  backgroundColor: color,
                  outline: selectedColor === color ? `2px solid ${color}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Description
        </Label>
        <Textarea rows={2} placeholder="Décrivez ce workspace…" {...register('description')} />
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-xs">
          {updateWorkspace.isSuccess && (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Workspace mis à jour
            </span>
          )}
          {updateWorkspace.error && (
            <span className="text-destructive">{updateWorkspace.error.message}</span>
          )}
        </div>
        <Button type="submit" size="sm" disabled={updateWorkspace.isPending || !isDirty}>
          {updateWorkspace.isPending && (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          )}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

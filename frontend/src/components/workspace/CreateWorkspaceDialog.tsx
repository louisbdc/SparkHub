'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateWorkspace } from '@/hooks/useWorkspaces'

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

interface CreateWorkspaceDialogProps {
  trigger?: React.ReactNode
}

export function CreateWorkspaceDialog({ trigger }: CreateWorkspaceDialogProps = {}) {
  const [open, setOpen] = useState(false)
  const createWorkspace = useCreateWorkspace()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { color: '#6366f1' },
    })

  const selectedColor = watch('color')

  const onSubmit = (values: FormValues) => {
    createWorkspace.mutate(values, {
      onSuccess: () => {
        reset()
        setOpen(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nouveau workspace
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un workspace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input placeholder="Mon projet client" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              placeholder="Décrivez le projet..."
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-2"
                  style={{
                    backgroundColor: color,
                    outline: selectedColor === color ? `2px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {createWorkspace.error && (
            <p className="text-xs text-destructive">{createWorkspace.error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

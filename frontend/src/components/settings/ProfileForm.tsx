'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentUser, useUpdateProfile } from '@/hooks/useAuth'

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(100),
  avatar: z.union([z.string().url('URL invalide'), z.literal('')]).optional(),
})

type FormValues = z.infer<typeof schema>

export function ProfileForm() {
  const { data: user } = useCurrentUser()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', avatar: '' },
  })

  useEffect(() => {
    if (user) {
      reset({ name: user.name, avatar: user.avatar ?? '' })
    }
  }, [user, reset])

  const onSubmit = (values: FormValues) => {
    const payload: { name?: string; avatar?: string } = {}
    if (values.name !== user?.name) payload.name = values.name
    const newAvatar = values.avatar || undefined
    if (newAvatar !== (user?.avatar ?? undefined)) payload.avatar = newAvatar
    if (Object.keys(payload).length === 0) return
    updateProfile.mutate(payload)
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
            Avatar (URL)
          </Label>
          <Input
            placeholder="https://…"
            {...register('avatar')}
          />
          {errors.avatar && (
            <p className="text-xs text-destructive">{errors.avatar.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-xs">
          {updateProfile.isSuccess && (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Profil mis à jour
            </span>
          )}
          {updateProfile.error && (
            <span className="text-destructive">{updateProfile.error.message}</span>
          )}
        </div>
        <Button type="submit" size="sm" disabled={updateProfile.isPending || !isDirty}>
          {updateProfile.isPending && (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          )}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

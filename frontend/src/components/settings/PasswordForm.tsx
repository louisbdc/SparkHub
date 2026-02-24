'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChangePassword } from '@/hooks/useAuth'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8, 'Minimum 8 caractères').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function PasswordForm() {
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset() }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Mot de passe actuel
        </Label>
        <Input type="password" className="max-w-sm" {...register('currentPassword')} />
        {errors.currentPassword && (
          <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nouveau mot de passe
          </Label>
          <Input type="password" {...register('newPassword')} />
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Confirmer
          </Label>
          <Input type="password" {...register('confirmPassword')} />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-xs">
          {changePassword.isSuccess && (
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mot de passe mis à jour
            </span>
          )}
          {changePassword.error && (
            <span className="text-destructive">{changePassword.error.message}</span>
          )}
        </div>
        <Button type="submit" size="sm" disabled={changePassword.isPending}>
          {changePassword.isPending && (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          )}
          Modifier le mot de passe
        </Button>
      </div>
    </form>
  )
}

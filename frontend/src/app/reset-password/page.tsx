'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '@/hooks/useAuth'

const schema = z
  .object({
    password: z.string().min(8, 'Minimum 8 caractères').max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState(false)
  const [done, setDone] = useState(false)
  const resetPassword = useResetPassword()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type = params.get('type')

    if (token && type === 'recovery') {
      setAccessToken(token)
    } else {
      setTokenError(true)
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (values: FormValues) => {
    if (!accessToken) return
    resetPassword.mutate(
      { accessToken, newPassword: values.password },
      { onSuccess: () => setDone(true) }
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-5">
            <Image
              src="/logo_sparkhub.png"
              alt="Sparkhub"
              width={56}
              height={56}
              className="rounded-2xl shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Nouveau mot de passe
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-7">
          {tokenError ? (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Lien invalide</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ce lien de réinitialisation est invalide ou a expiré.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link href="/forgot-password">Demander un nouveau lien</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Mot de passe mis à jour</p>
                <p className="text-sm text-muted-foreground">
                  Votre mot de passe a été modifié avec succès.
                </p>
              </div>
              <Button asChild className="w-full mt-2">
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  autoFocus
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {resetPassword.error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <p className="text-xs text-destructive">{resetPassword.error.message}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={resetPassword.isPending || !accessToken}
              >
                {resetPassword.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Réinitialiser le mot de passe
              </Button>
            </form>
          )}
        </div>

        {!done && !tokenError && (
          <p className="text-center text-sm text-muted-foreground mt-5">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Retour à la connexion
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

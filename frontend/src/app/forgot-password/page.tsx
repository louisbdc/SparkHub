'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPassword } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Adresse email invalide'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const forgotPassword = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (values: FormValues) => {
    forgotPassword.mutate(values.email, {
      onSuccess: () => {
        setSentEmail(values.email)
        setSent(true)
      },
    })
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
            Mot de passe oublié
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Recevez un lien de réinitialisation par email
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-7">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Email envoyé</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Si un compte existe pour{' '}
                  <span className="font-medium text-foreground">{sentEmail}</span>,
                  vous recevrez un lien de réinitialisation dans quelques minutes.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Pensez à vérifier vos spams.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {forgotPassword.error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <p className="text-xs text-destructive">{forgotPassword.error.message}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Envoyer le lien
              </Button>
            </form>
          )}
        </div>

        <p className="text-center mt-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}

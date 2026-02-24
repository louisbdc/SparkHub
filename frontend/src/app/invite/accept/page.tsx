'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Cookies from 'js-cookie'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1, 'Requis').max(100),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

type FormValues = z.infer<typeof schema>
type PageState = 'loading' | 'form' | 'success' | 'error'

export default function InviteAcceptPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tokens, setTokens] = useState<{ token: string; refreshToken: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token') ?? ''
    const type = params.get('type')

    if (!accessToken || type !== 'invite') {
      setErrorMsg("Ce lien d'invitation est invalide ou a déjà été utilisé.")
      setPageState('error')
      return
    }

    setTokens({ token: accessToken, refreshToken })
    setPageState('form')
  }, [])

  const onSubmit = async (values: FormValues) => {
    if (!tokens) return
    setErrorMsg(null)

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tokens, ...values }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setErrorMsg(data.error ?? 'Une erreur est survenue')
      return
    }

    Cookies.set(TOKEN_KEY, data.data.token)
    if (data.data.refreshToken) Cookies.set(REFRESH_TOKEN_KEY, data.data.refreshToken)

    setPageState('success')
    setTimeout(() => router.push('/dashboard'), 1500)
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
            Sparkhub
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Vous avez été invité à rejoindre un workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-7">
          {pageState === 'loading' && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {pageState === 'error' && (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Lien invalide</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
              </div>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link href="/login">Aller à la connexion</Link>
              </Button>
            </div>
          )}

          {pageState === 'success' && (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Compte créé !</p>
                <p className="text-sm text-muted-foreground">Redirection vers votre dashboard…</p>
              </div>
            </div>
          )}

          {pageState === 'form' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Votre nom</Label>
                <Input
                  id="name"
                  placeholder="Jean Dupont"
                  autoFocus
                  autoComplete="name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Choisissez un mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <p className="text-xs text-destructive">{errorMsg}</p>
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Rejoindre le workspace
              </Button>
            </form>
          )}
        </div>

        {pageState === 'form' && (
          <p className="text-center text-sm text-muted-foreground mt-5">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-foreground hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

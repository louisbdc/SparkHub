'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Cookies from 'js-cookie'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1, 'Requis').max(100),
  password: z.string().min(6, 'Minimum 6 caractères'),
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

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
            {errorMsg}
          </p>
          <Button variant="outline" onClick={() => router.push('/login')}>
            Aller à la connexion
          </Button>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <p className="font-semibold text-sm">Compte créé ! Redirection en cours…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">Rejoindre Sparkhub</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez votre nom et un mot de passe pour accéder à votre workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Votre nom</Label>
            <Input
              id="name"
              placeholder="Jean Dupont"
              autoFocus
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 caractères"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errorMsg && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {errorMsg}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Rejoindre le workspace
          </Button>
        </form>
      </div>
    </div>
  )
}

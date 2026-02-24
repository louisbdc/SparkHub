'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Layout,
  Loader2,
  MessageSquare,
  MousePointer2,
  PenTool,

} from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const inputCls =
  'w-full px-4 py-3 bg-white/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-zinc-400 dark:focus:border-zinc-600 outline-none transition-all text-sm shadow-sm text-zinc-900 dark:text-white placeholder:text-zinc-400'

export default function LoginPage() {
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (values: LoginFormValues) => login.mutate(values)

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 overflow-hidden relative text-zinc-900 dark:text-zinc-100">

      {/* ── Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">

        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Chat — top left */}
        <div className="absolute top-[12%] left-[8%] animate-float opacity-40 dark:opacity-[0.15]">
          <div className="relative">
            <div className="p-5 border-[1.5px] border-zinc-300 dark:border-zinc-700 rounded-2xl bg-white/50 dark:bg-transparent">
              <MessageSquare className="w-10 h-10 text-zinc-400" strokeWidth={1} />
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center text-[10px] text-white dark:text-zinc-900 font-bold">3</div>
            </div>
            <span className="absolute -bottom-8 left-0 text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">realtime_chat</span>
          </div>
        </div>

        {/* Progress bars — top right */}
        <div className="absolute top-[8%] right-[10%] animate-float-delayed opacity-40 dark:opacity-[0.15]">
          <div className="w-64 border-[1.5px] border-zinc-300 dark:border-zinc-700 rounded-2xl p-4 bg-white/50 dark:bg-transparent">
            <div className="flex gap-1.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-[65%] bg-zinc-300 dark:bg-zinc-600 rounded-full" />
              </div>
              <div className="h-2 w-[85%] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-[40%] bg-zinc-300 dark:bg-zinc-600 rounded-full" />
              </div>
              <div className="h-2 w-[70%] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-[80%] bg-zinc-300 dark:bg-zinc-600 rounded-full" />
              </div>
            </div>
            <span className="block mt-3 text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] text-right">kanban_board</span>
          </div>
        </div>

        {/* Branding circle — bottom right */}
        <div className="absolute bottom-[12%] right-[8%] animate-float opacity-40 dark:opacity-[0.15]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-36 h-36 border-[1.5px] border-dashed border-zinc-300 dark:border-zinc-700 rounded-full flex items-center justify-center relative">
              <Layout className="w-10 h-10 text-zinc-300" strokeWidth={1} />
              <div className="absolute top-0 right-3 p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm">
                <PenTool className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">workspace</span>
          </div>
        </div>

        {/* SVG connectors */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.15] dark:opacity-[0.04]" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M150,250 Q300,400 500,350 T850,200" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" className="text-zinc-500" />
          <path d="M100,700 C250,850 450,600 550,800 S800,900 950,750" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500" />
        </svg>

        {/* Mouse glow */}
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.03), transparent)` }}
        />
      </div>

      {/* ── Main card ── */}
      <div className="w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-700">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10 group cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100 blur-2xl opacity-10 dark:opacity-30 scale-150 group-hover:scale-[1.8] transition-transform duration-700" />
            <div className="relative z-10 transition-transform group-hover:scale-110 duration-500">
              <Image src="/logo_sparkhub.png" alt="Sparkhub" width={56} height={56} className="rounded-2xl shadow-lg" />
            </div>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Sparkhub</h1>
        </div>

        {/* Card */}
        <div className="relative group">
          <div className="absolute -inset-[1px] bg-gradient-to-b from-white/80 dark:from-white/10 to-transparent rounded-[2.5rem] -z-10 pointer-events-none" />
          <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/5 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] p-10 relative overflow-hidden">

            {/* Corner dots */}
            <div className="absolute top-0 right-0 p-5 opacity-[0.07]">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-zinc-900 dark:bg-white rounded-full" />
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <div className="mb-7">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Bon retour</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Gérez vos projets et tickets en un clin d&apos;œil.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div className="space-y-1.5 group/field">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 ml-0.5 group-focus-within/field:text-zinc-700 dark:group-focus-within/field:text-zinc-300 transition-colors">
                    Email professionnel
                  </label>
                  <input
                    type="email"
                    placeholder="vous@entreprise.com"
                    autoComplete="email"
                    className={inputCls}
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-red-500 ml-0.5">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5 group/field">
                  <div className="flex justify-between items-center ml-0.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 group-focus-within/field:text-zinc-700 dark:group-focus-within/field:text-zinc-300 transition-colors">
                      Mot de passe
                    </label>
                    <Link href="/forgot-password" className="text-[11px] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                      Oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className={`${inputCls} pr-11`}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 ml-0.5">{errors.password.message}</p>}
                </div>

                {login.error && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-3">
                    <p className="text-xs text-red-600 dark:text-red-400">{login.error.message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={login.isPending}
                  className="group/btn relative w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3.5 rounded-2xl shadow-xl hover:shadow-zinc-500/10 transition-all flex items-center justify-center gap-2 mt-2 overflow-hidden active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  {login.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin relative" />
                  ) : (
                    <>
                      <span className="relative text-sm tracking-wide">INITIALISER LA SESSION</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform relative" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-in fade-in slide-in-from-top-2 duration-1000">
          <div className="group text-sm text-zinc-500 dark:text-zinc-400">
            Nouveau sur la plateforme ?{' '}
            <Link
              href="/register"
              className="inline-flex items-center ml-1 font-bold text-zinc-900 dark:text-zinc-100 underline-offset-4 hover:underline"
            >
              Créer un espace
              <MousePointer2 className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 -translate-y-0.5 group-hover:translate-y-0 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div className="fixed bottom-6 right-8 hidden lg:flex items-center gap-2.5 py-2 px-4 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm opacity-50 hover:opacity-100 transition-opacity">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Server Status: Optimal</span>
      </div>
    </div>
  )
}

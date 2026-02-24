'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser, useUpdateProfile } from '@/hooks/useAuth'
import { TOKEN_KEY } from '@/lib/api'

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(100),
  avatar: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ProfileForm() {
  const { data: user } = useCurrentUser()
  const updateProfile = useUpdateProfile()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', avatar: '' },
  })

  useEffect(() => {
    if (user) {
      reset({ name: user.name, avatar: user.avatar ?? '' })
      setPreviewUrl(user.avatar ?? null)
    }
  }, [user, reset])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setUploadError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = Cookies.get(TOKEN_KEY)
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload échoué')

      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(json.data.url)
      setValue('avatar', json.data.url, { shouldDirty: true })
    } catch (err) {
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(user?.avatar ?? null)
      setUploadError(err instanceof Error ? err.message : 'Upload échoué')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const onSubmit = (values: FormValues) => {
    const payload: { name?: string; avatar?: string } = {}
    if (values.name !== user?.name) payload.name = values.name
    const newAvatar = values.avatar || undefined
    if (newAvatar !== (user?.avatar ?? undefined)) payload.avatar = newAvatar
    if (Object.keys(payload).length === 0) return
    updateProfile.mutate(payload)
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <Avatar
            className="w-16 h-16 cursor-pointer ring-2 ring-border hover:ring-primary/50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <AvatarImage src={previewUrl ?? undefined} />
            <AvatarFallback className="text-xl font-medium">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {uploading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Camera className="w-3 h-3" />
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {uploadError && (
            <p className="text-xs text-destructive mt-1">{uploadError}</p>
          )}
          {!uploadError && (
            <p className="text-xs text-muted-foreground mt-1">
              Cliquez pour changer (max 5 MB)
            </p>
          )}
        </div>
      </div>

      {/* Name */}
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
        <Button
          type="submit"
          size="sm"
          disabled={updateProfile.isPending || !isDirty || uploading}
        >
          {updateProfile.isPending && (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          )}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

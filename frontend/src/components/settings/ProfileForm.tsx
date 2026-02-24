'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useCurrentUser, useUpdateProfile } from '@/hooks/useAuth'
import { TOKEN_KEY } from '@/lib/api'

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(100),
})

type FormValues = z.infer<typeof schema>

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas error'))), 'image/jpeg', 0.9)
  })
}

export function ProfileForm() {
  const { data: user } = useCurrentUser()
  const updateProfile = useUpdateProfile()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (user) {
      reset({ name: user.name })
      setPreviewUrl(user.avatar ?? null)
    }
  }, [user, reset])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    e.target.value = ''
  }

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return

    setUploading(true)
    setUploadError(null)

    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
      URL.revokeObjectURL(cropSrc)
      setCropSrc(null)

      // Local preview
      const localUrl = URL.createObjectURL(blob)
      setPreviewUrl(localUrl)

      const formData = new FormData()
      formData.append('file', blob, 'avatar.jpg')

      const token = Cookies.get(TOKEN_KEY)
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload échoué')

      URL.revokeObjectURL(localUrl)
      setPreviewUrl(json.data.url)

      // Save avatar to profile immediately — no need to click Enregistrer
      updateProfile.mutate({ avatar: json.data.url })
    } catch (err) {
      setPreviewUrl(user?.avatar ?? null)
      setUploadError(err instanceof Error ? err.message : 'Upload échoué')
    } finally {
      setUploading(false)
    }
  }

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const onSubmit = (values: FormValues) => {
    if (values.name === user?.name) return
    updateProfile.mutate({ name: values.name })
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <>
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
            {uploadError
              ? <p className="text-xs text-destructive mt-1">{uploadError}</p>
              : <p className="text-xs text-muted-foreground mt-1">Cliquez pour changer (max 5 MB)</p>
            }
          </div>
        </div>

        {/* Name */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nom
            </Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
          <Button type="submit" size="sm" disabled={updateProfile.isPending || !isDirty || uploading}>
            {updateProfile.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>

      {/* Crop modal */}
      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) handleCropCancel() }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="relative w-full" style={{ height: 320 }}>
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          {/* Zoom slider */}
          <div className="px-5 py-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1" onClick={handleCropCancel}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleCropConfirm} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Copy, Download, Loader2 } from 'lucide-react'
import { messagesApi } from '@/lib/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface MessageImageItemProps {
  imageId: string
  originalname: string
  preloadedUrl?: string
}

export function MessageImageItem({ imageId, originalname, preloadedUrl }: MessageImageItemProps) {
  const [url, setUrl] = useState<string | null>(preloadedUrl ?? null)
  const [mimeType, setMimeType] = useState('image/png')
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (preloadedUrl) return
    messagesApi.getImageUrl(imageId).then(({ url: u, mimeType: m }) => {
      setUrl(u)
      setMimeType(m)
    }).catch((err) => {
      console.error('[MessageImageItem] getImageUrl failed:', err)
      setUrl('error')
    })
  }, [imageId, preloadedUrl])

  const handleDownload = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = originalname
    a.click()
  }

  const handleCopy = async () => {
    if (!url) return
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: copy URL
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!url) {
    return (
      <div className="w-[160px] h-[120px] rounded-lg bg-muted/60 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={originalname}
        onClick={() => setIsOpen(true)}
        className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
      />

      {/* Lightbox */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl w-full p-4 gap-3">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={originalname}
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />

          <p className="text-xs text-muted-foreground text-center truncate">{originalname}</p>
        </DialogContent>
      </Dialog>
    </>
  )
}

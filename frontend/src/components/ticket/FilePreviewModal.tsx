'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { filesApi } from '@/lib/api'
import type { Attachment } from '@/types'

interface FilePreviewModalProps {
  attachment: Attachment | null
  onClose: () => void
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/')
}

function isPdf(mimeType: string) {
  return mimeType === 'application/pdf'
}

export function FilePreviewModal({ attachment, onClose }: FilePreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!attachment) {
      setSignedUrl(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    filesApi
      .getSignedUrl(attachment.fileId)
      .then((url) => setSignedUrl(url))
      .catch(() => setError('Impossible de charger le fichier'))
      .finally(() => setLoading(false))
  }, [attachment])

  return (
    <Dialog open={Boolean(attachment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium truncate pr-8">
            {attachment?.originalname}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[300px] flex items-center justify-center">
          {loading && (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          )}

          {error && (
            <p className="text-sm text-muted-foreground">{error}</p>
          )}

          {signedUrl && attachment && !loading && (
            <>
              {isImage(attachment.mimeType) && (
                <img
                  src={signedUrl}
                  alt={attachment.originalname}
                  className="max-w-full max-h-[65vh] object-contain rounded-md"
                />
              )}
              {isPdf(attachment.mimeType) && (
                <iframe
                  src={signedUrl}
                  className="w-full h-[65vh] rounded-md border"
                  title={attachment.originalname}
                />
              )}
              {!isImage(attachment.mimeType) && !isPdf(attachment.mimeType) && (
                <p className="text-sm text-muted-foreground">
                  Aperçu non disponible pour ce type de fichier.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a
              href={filesApi.getUrl(attachment?.fileId ?? '', true)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Télécharger
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

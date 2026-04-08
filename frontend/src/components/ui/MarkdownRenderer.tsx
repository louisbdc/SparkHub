'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Cookies from 'js-cookie'
import { TOKEN_KEY } from '@/lib/api'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renders an <img> that may require auth (e.g. /api/ticket-images/:id).
 * For same-origin /api/ URLs, fetches a signed URL with the Bearer token first.
 * External URLs and blob: URLs are rendered directly.
 */
function AuthenticatedImage({ src, alt }: { src?: string; alt?: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!src) return

    // Pass through external URLs and local blob previews directly
    if (!src.startsWith('/api/')) {
      setResolvedSrc(src)
      return
    }

    const token = Cookies.get(TOKEN_KEY)
    fetch(`${src}?json=1`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((body) => {
        const url = body?.data?.url
        if (url) setResolvedSrc(url)
      })
      .catch(() => {})
  }, [src])

  if (!resolvedSrc) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolvedSrc} alt={alt ?? 'image'} className="max-w-full rounded" />
  )
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-p:text-foreground/80 prose-p:leading-relaxed',
        'prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:text-foreground',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md prose-pre:text-xs',
        'prose-pre:code:bg-transparent prose-pre:code:p-0',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-blockquote:border-l-border prose-blockquote:text-muted-foreground',
        'prose-li:text-foreground/80',
        'prose-hr:border-border',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Intercept img tags: same-origin /api/ URLs need auth-resolved signed URLs
          img: ({ src, alt }) => (
            <AuthenticatedImage src={typeof src === 'string' ? src : undefined} alt={alt} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

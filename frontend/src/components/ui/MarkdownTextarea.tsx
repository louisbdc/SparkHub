'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { cn } from '@/lib/utils'

interface MarkdownTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
}

export function MarkdownTextarea({ value, onChange, rows = 6, className, ...props }: MarkdownTextareaProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  return (
    <div className="rounded-md border border-input overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-input bg-muted/40">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            tab === 'write'
              ? 'bg-background text-foreground border-r border-input'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Écrire
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            tab === 'preview'
              ? 'bg-background text-foreground border-r border-input'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Aperçu
        </button>
        <span className="ml-auto px-3 py-1.5 text-xs text-muted-foreground select-none">Markdown</span>
      </div>

      {/* Content */}
      {tab === 'write' ? (
        <Textarea
          value={value}
          onChange={onChange}
          rows={rows}
          className={cn(
            'rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none',
            className
          )}
          {...props}
        />
      ) : (
        <div className="min-h-[120px] px-3 py-2 text-sm">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-muted-foreground italic text-xs">Rien à prévisualiser</p>
          )}
        </div>
      )}
    </div>
  )
}

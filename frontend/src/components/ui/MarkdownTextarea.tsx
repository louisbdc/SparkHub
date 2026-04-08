'use client'

import { useRef, useState } from 'react'
import { SquareCheck } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { cn } from '@/lib/utils'

interface MarkdownTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  onImagePaste?: (file: File, insertMarkdown: (md: string) => void) => void
  onValueChange?: (value: string) => void
}

export function MarkdownTextarea({
  value,
  onChange,
  rows = 6,
  className,
  onImagePaste,
  onValueChange,
  ...props
}: MarkdownTextareaProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    // If we're at the start of a line or the field is empty, no newline prefix needed
    const prefix = start > 0 && value[start - 1] !== '\n' ? '\n' : ''
    const newValue = value.slice(0, start) + prefix + text + value.slice(end)
    onValueChange?.(newValue)
    // Restore focus and move cursor after inserted text
    requestAnimationFrame(() => {
      if (el) {
        const cursor = start + prefix.length + text.length
        el.focus()
        el.setSelectionRange(cursor, cursor)
      }
    })
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onImagePaste) return
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith('image/')
    )
    if (!imageItem) return

    const file = imageItem.getAsFile()
    if (!file) return

    e.preventDefault()

    const insertMarkdown = (md: string) => {
      const el = textareaRef.current
      const start = el?.selectionStart ?? value.length
      const end = el?.selectionEnd ?? value.length
      const newValue = value.slice(0, start) + md + value.slice(end)
      onValueChange?.(newValue)
    }

    onImagePaste(file, insertMarkdown)
  }

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

        {/* Insert task shortcut — only shown in write tab */}
        {tab === 'write' && (
          <button
            type="button"
            title="Insérer une tâche (- [ ] )"
            onClick={() => insertAtCursor('- [ ] ')}
            className="ml-2 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SquareCheck className="w-3.5 h-3.5" />
          </button>
        )}

        <span className="ml-auto px-3 py-1.5 text-xs text-muted-foreground select-none">
          {onImagePaste ? 'Markdown · images' : 'Markdown'}
        </span>
      </div>

      {/* Content */}
      {tab === 'write' ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onPaste={handlePaste}
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

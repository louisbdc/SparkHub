'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface TodoItem {
  text: string
  done: boolean
}

interface TodoEditorProps {
  todos: TodoItem[]
  onChange: (todos: TodoItem[]) => void
}

export function TodoEditor({ todos, onChange }: TodoEditorProps) {
  const [newText, setNewText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTodo = () => {
    const trimmed = newText.trim()
    if (!trimmed) return
    onChange([...todos, { text: trimmed, done: false }])
    setNewText('')
    inputRef.current?.focus()
  }

  const removeTodo = (index: number) => {
    onChange(todos.filter((_, i) => i !== index))
  }

  const updateText = (index: number, text: string) => {
    onChange(todos.map((t, i) => (i === index ? { ...t, text } : t)))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTodo()
    }
  }

  return (
    <div className="space-y-1.5">
      {todos.map((todo, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
          <input
            type="text"
            value={todo.text}
            onChange={(e) => updateText(index, e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground border-b border-transparent hover:border-input focus:border-input transition-colors py-0.5"
            placeholder="Tâche..."
          />
          <button
            type="button"
            onClick={() => removeTodo(index)}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 mt-1">
        <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ajouter une tâche..."
          className="h-7 text-sm border-0 border-b rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent"
        />
        {newText.trim() && (
          <button
            type="button"
            onClick={addTodo}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

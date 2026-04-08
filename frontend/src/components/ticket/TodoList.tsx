'use client'

import { useToggleTodo } from '@/hooks/useTickets'
import type { TicketTodo } from '@/types'

interface TodoListProps {
  todos: TicketTodo[]
  ticketId: string
  workspaceId: string
}

export function TodoList({ todos, ticketId, workspaceId }: TodoListProps) {
  const toggleTodo = useToggleTodo(workspaceId, ticketId)
  const doneCount = todos.filter((t) => t.done).length

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${todos.length > 0 ? (doneCount / todos.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {doneCount}/{todos.length}
        </span>
      </div>

      {/* Todo items */}
      <ul className="space-y-1.5">
        {todos.map((todo) => (
          <li key={todo._id} className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => toggleTodo.mutate({ todoId: todo._id, done: !todo.done })}
              disabled={toggleTodo.isPending}
              className="mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 border-muted-foreground/40 hover:border-primary transition-colors flex items-center justify-center"
              style={todo.done ? { borderColor: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary))' } : {}}
            >
              {todo.done && (
                <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-primary-foreground fill-current">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span
              className={`text-sm leading-5 transition-colors ${
                todo.done ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {todo.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

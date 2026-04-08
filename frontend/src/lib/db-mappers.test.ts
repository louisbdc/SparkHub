import { describe, it, expect } from 'vitest'
import { mapTicket, mapTicketTodo, type DbTicket, type DbTicketTodo, type DbProfile } from './db-mappers'

const BASE_PROFILE: DbProfile = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@test.com',
  avatar: null,
  role: 'dev',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const BASE_TICKET: DbTicket = {
  id: 'ticket-1',
  workspace_id: 'ws-1',
  title: 'My ticket',
  description: 'Some description',
  status: 'backlog',
  priority: 'medium',
  type: 'task',
  reporter_id: 'user-1',
  assignee_id: null,
  parent_id: null,
  order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_comment_at: null,
  reporter: BASE_PROFILE,
  assignee: null,
  attachments: [],
  ticket_todos: [],
}

const TODO_ROW: DbTicketTodo = {
  id: 'todo-1',
  ticket_id: 'ticket-1',
  text: 'First task',
  done: false,
  order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('mapTicketTodo', () => {
  it('maps all fields correctly', () => {
    const result = mapTicketTodo(TODO_ROW)
    expect(result._id).toBe('todo-1')
    expect(result.text).toBe('First task')
    expect(result.done).toBe(false)
    expect(result.order).toBe(0)
  })
})

describe('mapTicket', () => {
  it('maps basic fields', () => {
    const result = mapTicket(BASE_TICKET)
    expect(result._id).toBe('ticket-1')
    expect(result.title).toBe('My ticket')
    expect(result.status).toBe('backlog')
    expect(result.priority).toBe('medium')
    expect(result.parentId).toBeNull()
    expect(result.assignee).toBeNull()
  })

  it('returns empty todos array when ticket_todos is empty', () => {
    const result = mapTicket(BASE_TICKET)
    expect(result.todos).toEqual([])
  })

  it('returns empty todos array when ticket_todos is undefined', () => {
    const row: DbTicket = { ...BASE_TICKET, ticket_todos: undefined }
    const result = mapTicket(row)
    expect(result.todos).toEqual([])
  })

  it('maps and sorts todos by order', () => {
    const row: DbTicket = {
      ...BASE_TICKET,
      ticket_todos: [
        { ...TODO_ROW, id: 'todo-2', order: 1, text: 'Second' },
        { ...TODO_ROW, id: 'todo-1', order: 0, text: 'First' },
      ],
    }
    const result = mapTicket(row)
    expect(result.todos).toHaveLength(2)
    expect(result.todos[0]._id).toBe('todo-1')
    expect(result.todos[1]._id).toBe('todo-2')
  })

  it('maps assignee when present', () => {
    const row: DbTicket = { ...BASE_TICKET, assignee: BASE_PROFILE, assignee_id: 'user-1' }
    const result = mapTicket(row)
    expect(result.assignee).not.toBeNull()
    expect(result.assignee?._id).toBe('user-1')
  })

  it('maps parentId from parent_id', () => {
    const row: DbTicket = { ...BASE_TICKET, parent_id: 'parent-ticket' }
    const result = mapTicket(row)
    expect(result.parentId).toBe('parent-ticket')
  })
})

describe('GFM checkbox toggle logic', () => {
  // Mirrors the handleCheckboxToggle logic in TicketDetailPanel
  function toggleCheckbox(description: string, targetIndex: number, checked: boolean): string {
    let count = -1
    return description.replace(/- \[([ x])\]/g, (match) => {
      count++
      if (count === targetIndex) return checked ? '- [x]' : '- [ ]'
      return match
    })
  }

  it('checks the first checkbox', () => {
    const desc = '- [ ] task 1\n- [ ] task 2'
    expect(toggleCheckbox(desc, 0, true)).toBe('- [x] task 1\n- [ ] task 2')
  })

  it('unchecks the second checkbox', () => {
    const desc = '- [x] task 1\n- [x] task 2'
    expect(toggleCheckbox(desc, 1, false)).toBe('- [x] task 1\n- [ ] task 2')
  })

  it('only affects the targeted index', () => {
    const desc = '- [ ] a\n- [ ] b\n- [ ] c'
    expect(toggleCheckbox(desc, 1, true)).toBe('- [ ] a\n- [x] b\n- [ ] c')
  })

  it('handles already checked → unchecked', () => {
    const desc = '- [x] done'
    expect(toggleCheckbox(desc, 0, false)).toBe('- [ ] done')
  })

  it('returns description unchanged when index out of range', () => {
    const desc = '- [ ] only one'
    expect(toggleCheckbox(desc, 5, true)).toBe(desc)
  })

  it('handles description with no checkboxes', () => {
    const desc = 'just some text'
    expect(toggleCheckbox(desc, 0, true)).toBe('just some text')
  })
})

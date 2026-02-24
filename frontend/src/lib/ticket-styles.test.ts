import { describe, it, expect } from 'vitest'
import {
  PRIORITY_STYLES,
  TYPE_ICON,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from './ticket-styles'
import type { TicketPriority, TicketStatus, TicketType } from '@/types'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
const TYPES: TicketType[] = ['bug', 'feature', 'task', 'improvement']
const STATUSES: TicketStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done']

describe('PRIORITY_STYLES', () => {
  it('has entries for all 4 priorities', () => {
    for (const p of PRIORITIES) {
      expect(PRIORITY_STYLES[p]).toBeDefined()
    }
  })

  it('values are non-empty strings', () => {
    for (const p of PRIORITIES) {
      expect(typeof PRIORITY_STYLES[p]).toBe('string')
      expect(PRIORITY_STYLES[p].length).toBeGreaterThan(0)
    }
  })
})

describe('TYPE_ICON', () => {
  it('has entries for all 4 ticket types', () => {
    for (const t of TYPES) {
      expect(TYPE_ICON[t]).toBeDefined()
    }
  })

  it('values are non-empty strings', () => {
    for (const t of TYPES) {
      expect(typeof TYPE_ICON[t]).toBe('string')
      expect(TYPE_ICON[t].length).toBeGreaterThan(0)
    }
  })
})

describe('PRIORITY_COLORS', () => {
  it('has entries for all 4 priorities', () => {
    for (const p of PRIORITIES) {
      expect(PRIORITY_COLORS[p]).toBeDefined()
    }
  })

  it('values are non-empty strings', () => {
    for (const p of PRIORITIES) {
      expect(typeof PRIORITY_COLORS[p]).toBe('string')
      expect(PRIORITY_COLORS[p].length).toBeGreaterThan(0)
    }
  })
})

describe('STATUS_COLORS', () => {
  it('has entries for all 5 statuses', () => {
    for (const s of STATUSES) {
      expect(STATUS_COLORS[s]).toBeDefined()
    }
  })

  it('values are non-empty strings', () => {
    for (const s of STATUSES) {
      expect(typeof STATUS_COLORS[s]).toBe('string')
      expect(STATUS_COLORS[s].length).toBeGreaterThan(0)
    }
  })
})

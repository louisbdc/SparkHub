import type { TicketPriority, TicketStatus, TicketType } from '@/types'

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export const TYPE_ICON: Record<TicketType, string> = {
  bug: '🐛', feature: '✨', task: '📋', improvement: '⚡',
}

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low:    'bg-muted text-muted-foreground',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  backlog:     'bg-muted text-muted-foreground',
  todo:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  review:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  done:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

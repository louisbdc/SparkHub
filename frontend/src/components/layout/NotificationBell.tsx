'use client'

import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, GitPullRequest, MessageSquare, ArrowRightLeft, TicketPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'
import type { Notification, NotificationType } from '@/types'

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  ticket_created: TicketPlus,
  ticket_assigned: GitPullRequest,
  ticket_commented: MessageSquare,
  ticket_status_changed: ArrowRightLeft,
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string, link: string) => void
}) {
  const Icon = TYPE_ICON[notification.type]

  return (
    <button
      onClick={() => onRead(notification._id, notification.link)}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60',
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <div className={cn(
        'mt-0.5 flex items-center justify-center w-7 h-7 rounded-full shrink-0',
        notification.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
      )}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn('text-sm leading-snug', !notification.isRead && 'font-medium')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
          {notification.body}
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  )
}

export function NotificationBell() {
  const router = useRouter()
  const { data } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  const handleRead = (id: string, link: string) => {
    markRead.mutate(id)
    if (link) router.push(link)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tout lire
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n._id} notification={n} onRead={handleRead} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

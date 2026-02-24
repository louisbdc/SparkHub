'use client'

import { useState } from 'react'
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react'
import { useInviteMember } from '@/hooks/useWorkspaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InviteMemberDialogProps {
  workspaceId: string
}

export function InviteMemberDialog({ workspaceId }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'dev' | 'client'>('client')
  const [invited, setInvited] = useState<{ name: string; email: string; status: 'added' | 'invited' } | null>(null)

  const inviteMember = useInviteMember()

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setEmail('')
      setRole('client')
      setInvited(null)
      inviteMember.reset()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await inviteMember.mutateAsync({ workspaceId, payload: { email, role } })
      setInvited({ ...result.invitedUser, status: result.status })
    } catch {
      // error displayed inline via inviteMember.error
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-1.5" />
          Inviter
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>
            Compte existant : ajout immédiat. Sinon, un email d&apos;invitation est envoyé.
          </DialogDescription>
        </DialogHeader>

        {invited ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <div>
              {invited.status === 'added' ? (
                <p className="font-semibold text-sm">{invited.name} a été ajouté·e</p>
              ) : (
                <p className="font-semibold text-sm">Invitation envoyée à {invited.email}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {invited.status === 'invited'
                  ? 'Il recevra un email pour créer son compte.'
                  : invited.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setEmail('')
                setRole('client')
                setInvited(null)
                inviteMember.reset()
              }}
            >
              Inviter quelqu'un d'autre
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Adresse email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="alice@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Rôle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'dev' | 'client')}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <span className="flex flex-col items-start">
                      <span>Client</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Peut créer des tickets et commenter
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value="dev">
                    <span className="flex flex-col items-start">
                      <span>Développeur</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Accès complet au workspace
                      </span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteMember.isError && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                {(inviteMember.error as Error).message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={inviteMember.isPending}>
              {inviteMember.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Envoyer l'invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth-guard'
import { sendSuccess, sendError } from '@/lib/api-utils'
import { fetchWorkspace } from '@/lib/workspace-queries'

type Params = { params: Promise<{ id: string }> }

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'dev', 'client']).optional().default('client'),
})

// POST /api/workspaces/:id/invite
// - existing user  → add to workspace directly
// - unknown email  → send Supabase invite email
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await requireAuth(request)
    const { id } = await params

    const workspace = await fetchWorkspace(id)
    if (!workspace) return sendError('Workspace introuvable', 404)
    if (workspace.owner._id !== userId) return sendError('Accès refusé', 403)

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) return sendError(parsed.error.issues[0].message, 422)

    const { email, role } = parsed.data

    // Check if user already has an account
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle()

    if (profile) {
      // User exists — add directly, no email sent
      if (profile.id === workspace.owner._id) {
        return sendError('Le propriétaire est déjà dans le workspace', 400)
      }
      const { error } = await supabaseAdmin
        .from('workspace_members')
        .upsert(
          { workspace_id: id, user_id: profile.id, role },
          { onConflict: 'workspace_id,user_id' }
        )
      if (error) {
        console.error('[invite] upsert error:', error)
        return sendError('Invitation échouée', 500)
      }

      const updated = await fetchWorkspace(id)
      return sendSuccess({
        workspace: updated,
        invitedUser: { name: profile.name, email: profile.email },
        status: 'added' as const,
      })
    }

    // User doesn't exist — send invite email via Supabase Auth
    const host = request.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { workspaceId: id, role },
      redirectTo: `${appUrl}/invite/accept`,
    })

    if (inviteError) {
      console.error('[invite] inviteUserByEmail error:', inviteError)
      const msg = inviteError.message.toLowerCase().includes('already')
        ? 'Cet utilisateur a déjà un compte. Demandez-lui de se connecter.'
        : "Échec de l'envoi de l'invitation : " + inviteError.message
      return sendError(msg, 500)
    }

    return sendSuccess({
      workspace,
      invitedUser: { name: email, email },
      status: 'invited' as const,
    })
  } catch (e) {
    if (e instanceof Response) return e
    return sendError('Erreur serveur', 500)
  }
}

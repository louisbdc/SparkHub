'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Trash2, Key } from 'lucide-react'
import { tokensApi, type ApiToken } from '@/lib/api'

export function ApiTokensForm() {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['personal-api-tokens'],
    queryFn: () => tokensApi.list(),
  })

  const createToken = useMutation({
    mutationFn: (name: string) => tokensApi.create(name),
    onSuccess: (created) => {
      queryClient.setQueryData<ApiToken[]>(
        ['personal-api-tokens'],
        (prev) => [{ id: created.id, name: created.name, createdAt: created.createdAt }, ...(prev ?? [])]
      )
      setRevealedToken(created.token)
      setNewName('')
      setShowForm(false)
    },
  })

  const revokeToken = useMutation({
    mutationFn: (id: string) => tokensApi.revoke(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ApiToken[]>(
        ['personal-api-tokens'],
        (prev) => prev?.filter((t) => t.id !== id) ?? []
      )
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    createToken.mutate(trimmed)
  }

  const handleCopy = async () => {
    if (!revealedToken) return
    await navigator.clipboard.writeText(revealedToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Revealed token banner — shown once after creation */}
      {revealedToken && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Copiez ce token maintenant — il ne sera plus affiché.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono break-all bg-background/60 rounded px-2 py-1.5 border">
              {revealedToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Copier"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <p className="text-xs text-green-600 dark:text-green-400">Copié !</p>}
          <button
            type="button"
            onClick={() => setRevealedToken(null)}
            className="text-xs text-muted-foreground underline"
          >
            J&apos;ai copié le token
          </button>
        </div>
      )}

      {/* Token list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun token pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3"
            >
              <Key className="w-4 h-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  Créé le {new Date(token.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revokeToken.mutate(token.id)}
                disabled={revokeToken.isPending}
                className="shrink-0 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                title="Révoquer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create form */}
      {showForm ? (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du token (ex: Claude Desktop)"
            maxLength={80}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newName.trim() || createToken.isPending}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Créer
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setNewName('') }}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Annuler
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau token
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        Utilisez ces tokens pour connecter Claude Desktop ou d&apos;autres outils via MCP.
        Chaque token donne accès à votre compte — ne le partagez pas.
      </p>
    </div>
  )
}

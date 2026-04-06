# MCP Server Sparkhub — Design Spec

## Contexte

Sparkhub est une app de gestion de projet (kanban, tickets, chat) deployee sur Vercel (Next.js). L'objectif est de creer un serveur MCP local qui permet a Claude (Desktop ou Code) d'acceder aux donnees du kanban via l'API REST existante.

## Architecture

```
Claude Desktop / Claude Code
        |
        v  (stdio)
   MCP Server (Node.js local)
        |
        v  (HTTPS + JWT)
   sparkhub.fr/api/*
        |
        v
   Supabase (PostgreSQL)
```

Le MCP server est un process local lance par Claude en subprocess. Il ne se deploie pas — il tourne sur la machine du developpeur et appelle l'API REST de Sparkhub.

## Emplacement

```
Sparkhub/
  frontend/          # App Next.js (inchangee)
  mcp-server/        # Script local pour Claude
    package.json
    tsconfig.json
    src/
      index.ts       # Serveur MCP complet
```

## Authentification

- Variable d'environnement `SPARKHUB_API_TOKEN` contenant un JWT valide
- Variable d'environnement `SPARKHUB_API_URL` (defaut: `https://sparkhub.fr`)
- Le token est passe dans le header `Authorization: Bearer <token>` a chaque requete
- Le token doit etre rafraichi manuellement quand il expire (7 jours)

## Tools — Lecture

### list_workspaces

- **Endpoint:** `GET /api/workspaces`
- **Parametres:** aucun
- **Retourne:** liste des workspaces (id, name, slug, description, color, memberCount)

### get_workspace

- **Endpoint:** `GET /api/workspaces/:workspaceId`
- **Parametres:** `workspaceId` (string, requis)
- **Retourne:** detail du workspace + membres + invitations pendantes

### list_tickets

- **Endpoint:** `GET /api/workspaces/:workspaceId/tickets`
- **Parametres:**
  - `workspaceId` (string, requis)
  - `status` (string, optionnel) — filtre par statut: backlog, todo, in_progress, review, done
  - `priority` (string, optionnel) — filtre par priorite: low, medium, high, urgent
  - `type` (string, optionnel) — filtre par type: bug, feature, task, improvement
- **Retourne:** liste des tickets (id, title, status, priority, type, assignee, order)

### get_ticket

- **Endpoint:** `GET /api/workspaces/:workspaceId/tickets/:ticketId`
- **Parametres:** `workspaceId`, `ticketId` (strings, requis)
- **Retourne:** detail complet du ticket + sous-tickets via `GET /api/workspaces/:workspaceId/tickets?parentId=:ticketId`

### list_comments

- **Endpoint:** `GET /api/tickets/:workspaceId/:ticketId/comments`
- **Parametres:** `workspaceId`, `ticketId` (strings, requis)
- **Retourne:** liste des commentaires (id, author, content, createdAt)

## Tools — Ecriture (limitee)

### create_ticket

- **Endpoint:** `POST /api/workspaces/:workspaceId/tickets`
- **Parametres:**
  - `workspaceId` (string, requis)
  - `title` (string, requis)
  - `description` (string, optionnel)
  - `status` (string, optionnel, defaut: "todo")
  - `priority` (string, optionnel, defaut: "medium")
  - `type` (string, optionnel, defaut: "task")
- **Retourne:** le ticket cree

### update_ticket_status

- **Endpoint:** `PATCH /api/workspaces/:workspaceId/tickets/:ticketId/status`
- **Parametres:**
  - `workspaceId` (string, requis)
  - `ticketId` (string, requis)
  - `status` (string, requis) — backlog, todo, in_progress, review, done
- **Retourne:** le ticket mis a jour

### add_comment

- **Endpoint:** `POST /api/tickets/:workspaceId/:ticketId/comments`
- **Parametres:**
  - `workspaceId` (string, requis)
  - `ticketId` (string, requis)
  - `content` (string, requis)
- **Retourne:** le commentaire cree

## Operations exclues

- Suppression de tickets, commentaires, workspaces
- Modification de tickets (titre, description, assignee, priorite)
- Gestion des membres et invitations
- Messages / chat
- Upload de fichiers

## Stack technique

- TypeScript
- `@modelcontextprotocol/sdk` — SDK officiel MCP
- `node-fetch` ou fetch natif (Node 18+) — appels HTTP
- `zod` — validation des parametres des tools

## Configuration Claude Desktop

```json
{
  "mcpServers": {
    "sparkhub": {
      "command": "node",
      "args": ["--import", "tsx", "/path/to/Sparkhub/mcp-server/src/index.ts"],
      "env": {
        "SPARKHUB_API_TOKEN": "<jwt-token>",
        "SPARKHUB_API_URL": "https://sparkhub.fr"
      }
    }
  }
}
```

## Gestion d'erreurs

- Si le token est invalide/expire: le tool retourne un message clair "Token invalide ou expire, reconnectez-vous"
- Si l'API est injoignable: "API Sparkhub injoignable"
- Si un workspace/ticket n'existe pas: message d'erreur de l'API forwarde
- Toutes les erreurs sont retournees comme contenu texte (pas d'exception MCP)

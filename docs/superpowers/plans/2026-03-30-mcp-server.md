# MCP Server Sparkhub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local MCP server that gives Claude read access + limited write access to the Sparkhub kanban via the existing REST API.

**Architecture:** Standalone TypeScript MCP server in `mcp-server/` that communicates via stdio with Claude and calls `sparkhub.fr/api/*` over HTTPS with a JWT token. Single file server with all tools defined inline.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` 1.x, `zod`, Node 18+ native fetch, `tsx` for execution.

---

## File Structure

```
mcp-server/
  package.json          # Dependencies + scripts
  tsconfig.json         # TypeScript config
  src/
    index.ts            # MCP server — all tools defined here
```

---

### Task 1: Scaffold the mcp-server package

**Files:**
- Create: `mcp-server/package.json`
- Create: `mcp-server/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sparkhub-mcp-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "build": "tsc",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.28.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd mcp-server && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git add mcp-server/package.json mcp-server/tsconfig.json mcp-server/package-lock.json
git commit -m "chore: scaffold mcp-server package"
```

---

### Task 2: Create the MCP server with API client helper

**Files:**
- Create: `mcp-server/src/index.ts`

- [ ] **Step 1: Create the base server with API helper**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_URL = process.env.SPARKHUB_API_URL ?? "https://sparkhub.fr";
const API_TOKEN = process.env.SPARKHUB_API_TOKEN;

if (!API_TOKEN) {
  console.error("SPARKHUB_API_TOKEN is required");
  process.exit(1);
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  return res.json() as Promise<ApiResponse<T>>;
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ApiResponse<T>>;
}

async function apiPatch<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ApiResponse<T>>;
}

function formatError(res: ApiResponse<unknown>): string {
  return res.error ?? "Erreur inconnue de l'API Sparkhub";
}

function textContent(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// --- Server setup ---

const server = new Server(
  { name: "sparkhub", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tools will be registered in the next tasks.
// For now, just verify the server starts.

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sparkhub MCP server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the server starts**

Run: `cd mcp-server && echo '{}' | timeout 3 npx tsx src/index.ts 2>&1 || true`
Expected: Output includes "Sparkhub MCP server running" on stderr (will timeout after 3s since it waits for stdio input, that's fine).

- [ ] **Step 3: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat(mcp): base server with API client helpers"
```

---

### Task 3: Add read tools — list_workspaces, get_workspace

**Files:**
- Modify: `mcp-server/src/index.ts`

- [ ] **Step 1: Define tool schemas and tool list entries**

Add before the `// --- Server setup ---` comment:

```typescript
// --- Tool schemas ---

const listWorkspacesSchema = z.object({});

const getWorkspaceSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
});
```

- [ ] **Step 2: Register tools in ListToolsRequestSchema handler**

Replace the empty tools array with:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_workspaces",
      description: "Lister tous les workspaces accessibles. Retourne le nom, slug, description, couleur et nombre de membres de chaque workspace.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "get_workspace",
      description: "Obtenir les details d'un workspace: membres, invitations en attente, description.",
      inputSchema: {
        type: "object" as const,
        properties: {
          workspaceId: { type: "string", description: "ID du workspace" },
        },
        required: ["workspaceId"],
      },
    },
  ],
}));
```

- [ ] **Step 3: Implement tool handlers in CallToolRequestSchema**

Replace the throw in CallToolRequestSchema handler with:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_workspaces": {
        const res = await apiGet<{ workspaces: unknown[] }>("/api/workspaces");
        if (!res.success) return textContent(formatError(res));
        return textContent(JSON.stringify(res.data?.workspaces, null, 2));
      }

      case "get_workspace": {
        const { workspaceId } = getWorkspaceSchema.parse(args);
        const res = await apiGet<{ workspace: unknown }>(`/api/workspaces/${workspaceId}`);
        if (!res.success) return textContent(formatError(res));
        return textContent(JSON.stringify(res.data?.workspace, null, 2));
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return textContent(`Erreur: ${message}`);
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat(mcp): add list_workspaces and get_workspace tools"
```

---

### Task 4: Add read tools — list_tickets, get_ticket

**Files:**
- Modify: `mcp-server/src/index.ts`

- [ ] **Step 1: Add ticket tool schemas**

Add to the tool schemas section:

```typescript
const listTicketsSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional().describe("Filtrer par statut"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Filtrer par priorite"),
  type: z.enum(["bug", "feature", "task", "improvement"]).optional().describe("Filtrer par type"),
});

const getTicketSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
});
```

- [ ] **Step 2: Add tool entries to ListToolsRequestSchema**

Append to the tools array:

```typescript
{
  name: "list_tickets",
  description: "Lister les tickets d'un workspace (vue kanban). Peut filtrer par statut, priorite ou type. Retourne titre, statut, priorite, type, assignee.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspaceId: { type: "string", description: "ID du workspace" },
      status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"], description: "Filtrer par statut" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Filtrer par priorite" },
      type: { type: "string", enum: ["bug", "feature", "task", "improvement"], description: "Filtrer par type" },
    },
    required: ["workspaceId"],
  },
},
{
  name: "get_ticket",
  description: "Obtenir les details complets d'un ticket: description, assignee, reporter, pieces jointes, et sous-tickets.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspaceId: { type: "string", description: "ID du workspace" },
      ticketId: { type: "string", description: "ID du ticket" },
    },
    required: ["workspaceId", "ticketId"],
  },
},
```

- [ ] **Step 3: Add case handlers**

Add to the switch statement:

```typescript
case "list_tickets": {
  const { workspaceId, status, priority, type } = listTicketsSchema.parse(args);
  const res = await apiGet<{ tickets: Record<string, unknown>[] }>(
    `/api/workspaces/${workspaceId}/tickets`
  );
  if (!res.success) return textContent(formatError(res));

  let tickets = res.data?.tickets ?? [];

  if (status) tickets = tickets.filter((t) => t.status === status);
  if (priority) tickets = tickets.filter((t) => t.priority === priority);
  if (type) tickets = tickets.filter((t) => t.type === type);

  return textContent(JSON.stringify(tickets, null, 2));
}

case "get_ticket": {
  const { workspaceId, ticketId } = getTicketSchema.parse(args);

  const [ticketRes, childrenRes] = await Promise.all([
    apiGet<{ ticket: unknown }>(`/api/workspaces/${workspaceId}/tickets/${ticketId}`),
    apiGet<{ tickets: unknown[] }>(`/api/workspaces/${workspaceId}/tickets?parentId=${ticketId}`),
  ]);

  if (!ticketRes.success) return textContent(formatError(ticketRes));

  const result = {
    ticket: ticketRes.data?.ticket,
    subTickets: childrenRes.data?.tickets ?? [],
  };

  return textContent(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat(mcp): add list_tickets and get_ticket tools"
```

---

### Task 5: Add read tool — list_comments

**Files:**
- Modify: `mcp-server/src/index.ts`

- [ ] **Step 1: Add comment tool schema**

```typescript
const listCommentsSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
});
```

- [ ] **Step 2: Add tool entry to ListToolsRequestSchema**

```typescript
{
  name: "list_comments",
  description: "Lister les commentaires d'un ticket. Retourne auteur, contenu et date.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspaceId: { type: "string", description: "ID du workspace" },
      ticketId: { type: "string", description: "ID du ticket" },
    },
    required: ["workspaceId", "ticketId"],
  },
},
```

- [ ] **Step 3: Add case handler**

```typescript
case "list_comments": {
  const { workspaceId, ticketId } = listCommentsSchema.parse(args);
  const res = await apiGet<{ comments: unknown[] }>(
    `/api/tickets/${workspaceId}/${ticketId}/comments`
  );
  if (!res.success) return textContent(formatError(res));
  return textContent(JSON.stringify(res.data?.comments, null, 2));
}
```

- [ ] **Step 4: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat(mcp): add list_comments tool"
```

---

### Task 6: Add write tools — create_ticket, update_ticket_status, add_comment

**Files:**
- Modify: `mcp-server/src/index.ts`

- [ ] **Step 1: Add write tool schemas**

```typescript
const createTicketSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  title: z.string().min(1).max(200).describe("Titre du ticket"),
  description: z.string().max(5000).optional().describe("Description du ticket (supporte le markdown)"),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional().describe("Statut initial (defaut: todo)"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Priorite (defaut: medium)"),
  type: z.enum(["bug", "feature", "task", "improvement"]).optional().describe("Type (defaut: task)"),
});

const updateTicketStatusSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).describe("Nouveau statut"),
});

const addCommentSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
  content: z.string().min(1).max(4000).describe("Contenu du commentaire (supporte le markdown)"),
});
```

- [ ] **Step 2: Add tool entries to ListToolsRequestSchema**

```typescript
{
  name: "create_ticket",
  description: "Creer un nouveau ticket dans un workspace. Necessite au minimum un titre.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspaceId: { type: "string", description: "ID du workspace" },
      title: { type: "string", description: "Titre du ticket" },
      description: { type: "string", description: "Description (markdown)" },
      status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"], description: "Statut initial (defaut: todo)" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priorite (defaut: medium)" },
      type: { type: "string", enum: ["bug", "feature", "task", "improvement"], description: "Type (defaut: task)" },
    },
    required: ["workspaceId", "title"],
  },
},
{
  name: "update_ticket_status",
  description: "Changer le statut d'un ticket (deplacer sur le kanban). Ex: todo -> in_progress -> review -> done.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspaceId: { type: "string", description: "ID du workspace" },
      ticketId: { type: "string", description: "ID du ticket" },
      status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"], description: "Nouveau statut" },
    },
    required: ["workspaceId", "ticketId", "status"],
  },
},
{
  name: "add_comment",
  description: "Ajouter un commentaire sur un ticket.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workspaceId: { type: "string", description: "ID du workspace" },
      ticketId: { type: "string", description: "ID du ticket" },
      content: { type: "string", description: "Contenu du commentaire (markdown)" },
    },
    required: ["workspaceId", "ticketId", "content"],
  },
},
```

- [ ] **Step 3: Add case handlers**

```typescript
case "create_ticket": {
  const { workspaceId, title, description, status, priority, type } =
    createTicketSchema.parse(args);

  const body: Record<string, unknown> = { title };
  if (description !== undefined) body.description = description;
  if (status !== undefined) body.status = status;
  if (priority !== undefined) body.priority = priority;
  if (type !== undefined) body.type = type;

  const res = await apiPost<{ ticket: unknown }>(
    `/api/workspaces/${workspaceId}/tickets`,
    body
  );
  if (!res.success) return textContent(formatError(res));
  return textContent(JSON.stringify(res.data?.ticket, null, 2));
}

case "update_ticket_status": {
  const { workspaceId, ticketId, status } = updateTicketStatusSchema.parse(args);
  const res = await apiPatch<{ ticket: unknown }>(
    `/api/workspaces/${workspaceId}/tickets/${ticketId}/status`,
    { status }
  );
  if (!res.success) return textContent(formatError(res));
  return textContent(JSON.stringify(res.data?.ticket, null, 2));
}

case "add_comment": {
  const { workspaceId, ticketId, content } = addCommentSchema.parse(args);
  const res = await apiPost<{ comment: unknown }>(
    `/api/tickets/${workspaceId}/${ticketId}/comments`,
    { content }
  );
  if (!res.success) return textContent(formatError(res));
  return textContent(JSON.stringify(res.data?.comment, null, 2));
}
```

- [ ] **Step 4: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat(mcp): add create_ticket, update_ticket_status, add_comment tools"
```

---

### Task 7: Ajouter le .gitignore et documenter la config

**Files:**
- Create: `mcp-server/.gitignore`
- Create: `mcp-server/README.md`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 2: Create README.md with setup instructions**

```markdown
# Sparkhub MCP Server

Serveur MCP local qui donne a Claude acces au kanban Sparkhub.

## Setup

1. Installer les dependances:

```bash
cd mcp-server
npm install
```

2. Obtenir un token JWT:
   - Se connecter sur sparkhub.fr
   - Ouvrir les DevTools > Application > Cookies
   - Copier la valeur de `sparkhub_token`

3. Configurer Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sparkhub": {
      "command": "npx",
      "args": ["tsx", "/chemin/absolu/vers/Sparkhub/mcp-server/src/index.ts"],
      "env": {
        "SPARKHUB_API_TOKEN": "votre-jwt-token",
        "SPARKHUB_API_URL": "https://sparkhub.fr"
      }
    }
  }
}
```

## Tools disponibles

### Lecture
- **list_workspaces** — Lister les workspaces
- **get_workspace** — Detail d'un workspace
- **list_tickets** — Tickets d'un workspace (filtrable)
- **get_ticket** — Detail d'un ticket + sous-tickets
- **list_comments** — Commentaires d'un ticket

### Ecriture
- **create_ticket** — Creer un ticket
- **update_ticket_status** — Changer le statut d'un ticket
- **add_comment** — Commenter un ticket
```

- [ ] **Step 3: Commit**

```bash
git add mcp-server/.gitignore mcp-server/README.md
git commit -m "docs(mcp): add gitignore and setup instructions"
```

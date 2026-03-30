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

// --- Tool schemas ---

const getWorkspaceSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
});

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

const listCommentsSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
});

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

const listAttachmentsSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
});

const getAttachmentSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
  fileId: z.string().describe("ID du fichier (fileId de la piece jointe)"),
});

const addCommentSchema = z.object({
  workspaceId: z.string().describe("ID du workspace"),
  ticketId: z.string().describe("ID du ticket"),
  content: z.string().min(1).max(4000).describe("Contenu du commentaire (supporte le markdown)"),
});

// --- Server setup ---

const server = new Server(
  { name: "sparkhub", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

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
      name: "list_attachments",
      description: "Lister les pieces jointes d'un ticket. Retourne le nom, type MIME, taille et ID de chaque fichier.",
      inputSchema: {
        type: "object" as const,
        properties: {
          workspaceId: { type: "string", description: "ID du workspace" },
          ticketId: { type: "string", description: "ID du ticket" },
        },
        required: ["workspaceId", "ticketId"],
      },
    },
    {
      name: "get_attachment",
      description: "Lire le contenu d'une piece jointe. Pour les fichiers texte (code, markdown, JSON, CSV, etc.), retourne le contenu. Pour les fichiers binaires (images, PDF, etc.), retourne les metadonnees et l'URL de telechargement.",
      inputSchema: {
        type: "object" as const,
        properties: {
          workspaceId: { type: "string", description: "ID du workspace" },
          ticketId: { type: "string", description: "ID du ticket" },
          fileId: { type: "string", description: "ID du fichier (fileId de la piece jointe)" },
        },
        required: ["workspaceId", "ticketId", "fileId"],
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
  ],
}));

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

      case "list_comments": {
        const { workspaceId, ticketId } = listCommentsSchema.parse(args);
        const res = await apiGet<{ comments: unknown[] }>(
          `/api/tickets/${workspaceId}/${ticketId}/comments`
        );
        if (!res.success) return textContent(formatError(res));
        return textContent(JSON.stringify(res.data?.comments, null, 2));
      }

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

      case "list_attachments": {
        const { workspaceId, ticketId } = listAttachmentsSchema.parse(args);
        const res = await apiGet<{ ticket: { attachments: unknown[] } }>(
          `/api/workspaces/${workspaceId}/tickets/${ticketId}`
        );
        if (!res.success) return textContent(formatError(res));

        const attachments = res.data?.ticket?.attachments ?? [];
        if (attachments.length === 0) {
          return textContent("Aucune piece jointe sur ce ticket.");
        }
        return textContent(JSON.stringify(attachments, null, 2));
      }

      case "get_attachment": {
        const { workspaceId, ticketId, fileId } = getAttachmentSchema.parse(args);

        // First get ticket to find attachment metadata
        const ticketRes = await apiGet<{ ticket: { attachments: Array<{ fileId: string; originalname: string; mimeType: string; size: number }> } }>(
          `/api/workspaces/${workspaceId}/tickets/${ticketId}`
        );
        if (!ticketRes.success) return textContent(formatError(ticketRes));

        const attachment = ticketRes.data?.ticket?.attachments?.find(
          (a) => a.fileId === fileId
        );
        if (!attachment) return textContent("Piece jointe introuvable.");

        const isText = /^(text\/|application\/(json|xml|javascript|typescript|x-yaml|x-sh|csv|markdown))/.test(
          attachment.mimeType
        );

        if (isText) {
          // Fetch raw content for text files
          const fileRes = await fetch(`${API_URL}/api/files/${fileId}`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
          });
          if (!fileRes.ok) {
            return textContent(`Erreur lors du telechargement: ${fileRes.status} ${fileRes.statusText}`);
          }
          const content = await fileRes.text();
          return textContent(
            `# ${attachment.originalname}\n\nType: ${attachment.mimeType}\nTaille: ${attachment.size} octets\n\n---\n\n${content}`
          );
        }

        // For binary files, return metadata + download URL
        return textContent(JSON.stringify({
          filename: attachment.originalname,
          mimeType: attachment.mimeType,
          size: attachment.size,
          downloadUrl: `${API_URL}/api/files/${fileId}?download=1`,
        }, null, 2));
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return textContent(`Erreur: ${message}`);
  }
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

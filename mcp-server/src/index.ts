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

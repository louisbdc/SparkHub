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

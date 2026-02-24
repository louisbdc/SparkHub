# FlowSync — API Reference

Backend: **Node.js / Express / MongoDB**
Base URL: `http://localhost:5000`
All endpoints return JSON. All protected routes require a `Bearer` token in the `Authorization` header.

---

## Global Response Shape

Every response follows this envelope:

```json
// Success
{ "success": true, "data": { ... }, "meta": { ... } }

// Error
{ "success": false, "error": "Human-readable message" }
```

**Pagination meta** (on list endpoints):
```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Authentication

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

JWT is returned at register/login and expires after `JWT_EXPIRES_IN` (default: 7 days).

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| All `/api/*` routes | 100 req / 15 min |
| Auth routes only | 10 req / 15 min |

---

## Health Check

### `GET /health`

No authentication required.

**Response 200**
```json
{
  "success": true,
  "data": { "status": "ok", "timestamp": "2026-02-23T10:00:00.000Z" }
}
```

---

## Auth — `/api/auth`

### `POST /api/auth/register`

Create a new account.

**Body**
```json
{
  "name": "Alice Dupont",
  "email": "alice@example.com",
  "password": "securePassword123",
  "role": "dev"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | 2–100 chars |
| email | string | yes | valid email |
| password | string | yes | 8–128 chars |
| role | string | no | `"dev"` \| `"client"` — default `"client"` |

> `"admin"` cannot be self-assigned at registration.

**Response 201**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "_id": "64a1b2c3d4e5f6789abc0001",
      "name": "Alice Dupont",
      "email": "alice@example.com",
      "role": "dev",
      "avatar": null,
      "isActive": true,
      "createdAt": "2026-02-23T10:00:00.000Z"
    }
  }
}
```

**Errors**
| Status | Message |
|--------|---------|
| 400 | Validation error (field detail) |
| 409 | Email already in use |

---

### `POST /api/auth/login`

Authenticate and receive a JWT.

**Body**
```json
{
  "email": "alice@example.com",
  "password": "securePassword123"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": { "_id": "...", "name": "Alice Dupont", "email": "...", "role": "dev" }
  }
}
```

**Errors**
| Status | Message |
|--------|---------|
| 400 | Validation error |
| 401 | Invalid email or password |

---

### `GET /api/auth/me` 🔒

Returns the currently authenticated user.

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Alice Dupont", "email": "...", "role": "dev" }
  }
}
```

---

### `PATCH /api/auth/me` 🔒

Update profile (name or avatar URL).

**Body** (all fields optional)
```json
{
  "name": "Alice Martin",
  "avatar": "https://cdn.example.com/avatar.jpg"
}
```

**Response 200**
```json
{
  "success": true,
  "data": { "user": { ... } }
}
```

---

## Workspaces — `/api/workspaces`

> A **Workspace** represents a client project. The creator becomes the owner. Other users can be invited as members with a role.

### `POST /api/workspaces` 🔒

Create a new workspace.

**Body**
```json
{
  "name": "Refonte Site E-commerce",
  "description": "Projet de refonte complète du site",
  "color": "#6366f1"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | yes | 2–100 chars |
| description | string | no | max 500 chars |
| color | string | no | hex color `#rrggbb` — default `#6366f1` |

**Response 201**
```json
{
  "success": true,
  "data": {
    "workspace": {
      "_id": "64a1b2c3d4e5f6789abc0010",
      "name": "Refonte Site E-commerce",
      "slug": "refonte-site-e-commerce",
      "description": "...",
      "color": "#6366f1",
      "owner": { "_id": "...", "name": "Alice Dupont", "email": "..." },
      "members": [],
      "isArchived": false,
      "memberCount": 1
    }
  }
}
```

---

### `GET /api/workspaces` 🔒

List all workspaces the current user owns or is a member of.

> System admins see all workspaces.

**Query params**
| Param | Default | Description |
|-------|---------|-------------|
| page | 1 | Page number |
| limit | 20 | Items per page (max 50) |

**Response 200** with pagination meta.

---

### `GET /api/workspaces/:workspaceId` 🔒

Get a single workspace with populated owner and members.

**Response 200**
```json
{
  "success": true,
  "data": {
    "workspace": {
      "_id": "...",
      "name": "Refonte Site E-commerce",
      "owner": { "_id": "...", "name": "Alice", "email": "..." },
      "members": [
        {
          "user": { "_id": "...", "name": "Bob", "email": "...", "role": "client" },
          "role": "client",
          "joinedAt": "2026-02-20T10:00:00.000Z"
        }
      ]
    }
  }
}
```

**Errors**
| Status | Message |
|--------|---------|
| 403 | Access denied to this workspace |
| 404 | Workspace not found |

---

### `PATCH /api/workspaces/:workspaceId` 🔒

Update workspace metadata. **Owner only** (or system admin).

**Body** (all fields optional)
```json
{
  "name": "Nouveau Nom",
  "description": "Nouvelle description",
  "color": "#10b981"
}
```

---

### `PATCH /api/workspaces/:workspaceId/archive` 🔒

Archive a workspace (soft delete). **Owner only**.

Archived workspaces are excluded from list results and block new activity.

**Response 200**
```json
{
  "success": true,
  "data": { "workspace": { "isArchived": true, ... } }
}
```

---

### `POST /api/workspaces/:workspaceId/members` 🔒

Add a user to the workspace.

**Body**
```json
{
  "userId": "64a1b2c3d4e5f6789abc0002",
  "role": "client"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| userId | string | yes | MongoDB ObjectId of an existing User |
| role | string | no | `"admin"` \| `"dev"` \| `"client"` — default `"client"` |

**Errors**
| Status | Message |
|--------|---------|
| 409 | User is already a member / User is already the workspace owner |

---

### `DELETE /api/workspaces/:workspaceId/members/:memberId` 🔒

Remove a member from the workspace. Cannot remove the owner.

**Response 200**
```json
{
  "success": true,
  "data": { "workspace": { ... } }
}
```

---

## Tickets — `/api/workspaces/:workspaceId/tickets`

> A **Ticket** is the core unit of work. Each ticket belongs to exactly one workspace.

### Enums

| Field | Values |
|-------|--------|
| status | `backlog` `todo` `in_progress` `review` `done` |
| priority | `low` `medium` `high` `urgent` |
| type | `bug` `feature` `task` `improvement` |

---

### `POST /api/workspaces/:workspaceId/tickets` 🔒

Create a ticket. Accepts `multipart/form-data` for file attachments.

**Body** (`multipart/form-data` or `application/json`)
```json
{
  "title": "La page panier plante sur mobile",
  "description": "Erreur JS sur Safari iOS 17...",
  "status": "todo",
  "priority": "high",
  "type": "bug",
  "assignee": "64a1b2c3d4e5f6789abc0002"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | yes | 3–200 chars |
| description | string | no | max 10 000 chars |
| status | string | no | see enum — default `"backlog"` |
| priority | string | no | see enum — default `"medium"` |
| type | string | no | see enum — default `"task"` |
| assignee | string | no | MongoDB ObjectId |
| attachments | file[] | no | max 5 files, 10 MB each |

**Response 201**
```json
{
  "success": true,
  "data": {
    "ticket": {
      "_id": "64a1b2c3d4e5f6789abc0020",
      "workspace": "64a1b2c3d4e5f6789abc0010",
      "title": "La page panier plante sur mobile",
      "description": "...",
      "status": "todo",
      "priority": "high",
      "type": "bug",
      "order": 0,
      "reporter": { "_id": "...", "name": "Alice", "email": "..." },
      "assignee": { "_id": "...", "name": "Bob", "email": "..." },
      "attachments": [
        {
          "_id": "...",
          "url": "https://res.cloudinary.com/...",
          "filename": "screenshot.png",
          "mimeType": "image/png",
          "size": 245760,
          "uploadedAt": "2026-02-23T10:00:00.000Z"
        }
      ],
      "createdAt": "2026-02-23T10:00:00.000Z",
      "updatedAt": "2026-02-23T10:00:00.000Z"
    }
  }
}
```

---

### `GET /api/workspaces/:workspaceId/tickets` 🔒

List tickets for a workspace. Supports filtering and pagination.

**Query params**
| Param | Example | Description |
|-------|---------|-------------|
| page | `1` | Page number |
| limit | `50` | Items per page (max 100) |
| status | `todo,in_progress` | Comma-separated status values |
| priority | `high,urgent` | Comma-separated priority values |
| type | `bug,feature` | Comma-separated type values |
| assignee | `64a...` or `me` | Filter by assignee ID or `"me"` |
| search | `mobile` | Full-text search on title/description |
| sortBy | `order` | Field to sort by (default: `order`) |
| sortOrder | `asc` | `asc` or `desc` |

**Response 200** with pagination meta.

---

### `GET /api/workspaces/:workspaceId/tickets/:ticketId` 🔒

Get a single ticket by ID.

**Errors**
| Status | Message |
|--------|---------|
| 404 | Ticket not found |

---

### `PATCH /api/workspaces/:workspaceId/tickets/:ticketId` 🔒

Update any ticket field. Accepts `multipart/form-data` to append new attachments.

**Body** (all fields optional)
```json
{
  "title": "Titre corrigé",
  "description": "Nouvelle description",
  "priority": "urgent",
  "assignee": "64a1b2c3d4e5f6789abc0003"
}
```

> New files sent as `attachments` are **appended** to the existing list, not replaced.

---

### `PATCH /api/workspaces/:workspaceId/tickets/:ticketId/status` 🔒

**Dedicated endpoint for Kanban drag-and-drop.** Updates only `status` and optional `order`.

**Body**
```json
{
  "status": "in_progress",
  "order": 2
}
```

| Field | Type | Required |
|-------|------|----------|
| status | string | yes — must be a valid status enum |
| order | integer | no — position within the column |

**Response 200**
```json
{
  "success": true,
  "data": { "ticket": { "status": "in_progress", "order": 2, ... } }
}
```

---

### `DELETE /api/workspaces/:workspaceId/tickets/:ticketId` 🔒

Delete a ticket. **Reporter, workspace owner, or system admin only.**

**Response 200**
```json
{
  "success": true,
  "data": { "message": "Ticket deleted successfully" }
}
```

---

## Comments — `/api/tickets/:workspaceId/:ticketId/comments`

> Comments form the discussion thread on a ticket. The `:workspaceId` is required for access control.

### `POST /api/tickets/:workspaceId/:ticketId/comments` 🔒

Add a comment. Accepts `multipart/form-data` for attachments.

**Body**
```json
{
  "content": "J'ai reproduit le bug sur iPhone 15 Pro, voici la capture."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| content | string | yes | 1–5000 chars |
| attachments | file[] | no | max 3 files, 10 MB each |

**Response 201**
```json
{
  "success": true,
  "data": {
    "comment": {
      "_id": "64a1b2c3d4e5f6789abc0030",
      "ticket": "64a1b2c3d4e5f6789abc0020",
      "author": { "_id": "...", "name": "Alice", "email": "..." },
      "content": "J'ai reproduit le bug...",
      "attachments": [],
      "isEdited": false,
      "editedAt": null,
      "createdAt": "2026-02-23T10:05:00.000Z"
    }
  }
}
```

---

### `GET /api/tickets/:workspaceId/:ticketId/comments` 🔒

List all comments on a ticket, sorted by creation date ascending (chronological thread).

**Query params**: `page`, `limit` (max 100).

---

### `PATCH /api/tickets/:workspaceId/:ticketId/comments/:commentId` 🔒

Edit a comment. **Author only.**

**Body**
```json
{
  "content": "Contenu corrigé"
}
```

Sets `isEdited: true` and records `editedAt`.

---

### `DELETE /api/tickets/:workspaceId/:ticketId/comments/:commentId` 🔒

Delete a comment. **Author, workspace owner, or system admin only.**

---

## Data Models

### User
```
_id          ObjectId
name         String       2–100 chars
email        String       unique, lowercase
password     String       hashed (bcrypt, never returned)
role         String       "admin" | "dev" | "client"
avatar       String?      URL
isActive     Boolean      default true
createdAt    Date
updatedAt    Date
```

### Workspace
```
_id          ObjectId
name         String       2–100 chars
slug         String       unique, auto-generated from name
description  String       max 500 chars
color        String       hex "#rrggbb"
owner        ObjectId     → User
members[]
  user       ObjectId     → User
  role       String       "admin" | "dev" | "client"
  joinedAt   Date
isArchived   Boolean      default false
createdAt    Date
updatedAt    Date
```

### Ticket
```
_id          ObjectId
workspace    ObjectId     → Workspace
title        String       3–200 chars
description  String       max 10 000 chars
status       String       "backlog"|"todo"|"in_progress"|"review"|"done"
priority     String       "low"|"medium"|"high"|"urgent"
type         String       "bug"|"feature"|"task"|"improvement"
reporter     ObjectId     → User
assignee     ObjectId?    → User
order        Number       position within status column
attachments[]
  _id        ObjectId
  fileId     ObjectId     → GridFS file (use GET /api/files/:fileId to download)
  filename   String       stored filename (timestamped)
  originalname String     original upload filename
  mimeType   String
  size       Number       bytes
  uploadedAt Date
createdAt    Date
updatedAt    Date
```

### Comment
```
_id          ObjectId
ticket       ObjectId     → Ticket
author       ObjectId     → User
content      String       1–5000 chars
isEdited     Boolean      default false
editedAt     Date?
attachments[]             same shape as Ticket.attachments (fileId + originalname…)
createdAt    Date
updatedAt    Date
```

---

## Authorization Matrix

| Action | client | dev | workspace admin | system admin |
|--------|--------|-----|-----------------|--------------|
| View workspace | ✅ | ✅ | ✅ | ✅ |
| Create/edit workspace | ❌ | ✅ | ✅ | ✅ |
| Archive workspace | ❌ | owner only | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ | ✅ |
| Create ticket | ✅ | ✅ | ✅ | ✅ |
| Update any ticket | ✅ | ✅ | ✅ | ✅ |
| Delete ticket | reporter only | reporter/owner | ✅ | ✅ |
| Create comment | ✅ | ✅ | ✅ | ✅ |
| Edit comment | author only | author only | author only | ✅ |
| Delete comment | author only | author only | ✅ | ✅ |

---

## Common Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation failed |
| 401 | Missing, expired or invalid token |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, already a member…) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Files — `/api/files`

Files are stored in **MongoDB GridFS** (bucket `uploads`) — aucun service externe requis.

### `GET /api/files/:fileId` 🔒

Stream a file stored in GridFS. The `fileId` is the `fileId` field of an attachment object.

**Query params**
| Param | Value | Description |
|-------|-------|-------------|
| download | `1` | Forces `Content-Disposition: attachment` (browser download) |

**Response**: raw file stream with appropriate `Content-Type`.

```
GET /api/files/64a1b2c3d4e5f6789abc0099
→ streams the file inline (image preview, PDF viewer…)

GET /api/files/64a1b2c3d4e5f6789abc0099?download=1
→ forces download with original filename
```

**Errors**
| Status | Message |
|--------|---------|
| 400 | Invalid file ID |
| 404 | File not found |

---

### `DELETE /api/files/:fileId` 🔒

Permanently delete a file from GridFS. **Uploader or system admin only.**

**Response 200**
```json
{ "success": true, "data": { "message": "File deleted successfully" } }
```

---

## File Upload Rules

- **Allowed types**: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT
- **Max size**: 10 MB per file
- **Max per ticket**: 5 files (`attachments` field, multipart/form-data)
- **Max per comment**: 3 files (`attachments` field, multipart/form-data)
- **Storage**: MongoDB GridFS — bucket `uploads`, no external service
- **Access**: authenticated users only (`Authorization: Bearer <token>`)

# Backend Cloud Sync Design

## Overview

Add a Hono-based backend to the JS/TS playground (AlgoPad) for cloud data synchronization. Users receive a UUID token on first visit, which serves as both identity and authentication. All user data is end-to-end encrypted using AES-256-GCM derived from the token via PBKDF2.

## Requirements

| Requirement | Decision |
|---|---|
| Sync scope | All localStorage data (files, folders, settings, LLM config, UI state, session) |
| Sync mode | Automatic — upload on change (debounced), download on page load |
| Database | PostgreSQL with Drizzle ORM |
| Auth | UUID token, auto-generated on first visit |
| Conflict resolution | Last-Write-Wins (optimistic locking via version field) |
| Deployment | Same-origin; support CF Workers, Vercel, self-hosted, Railway |
| Security | End-to-end encryption (token-derived AES-256-GCM key) |
| Project structure | Monorepo — `server/` directory inside current project |
| API docs | Auto-generated via Scalar + @hono/zod-openapi |
| Storage limit | None |
| Scaffolding | Use `create-hono` and `drizzle-kit init` to initialize |

## Architecture: Fine-Grained Sync with Per-Entity Encryption

Each file, folder, and settings blob is encrypted individually and synced independently. The server only sees encrypted ciphertext — file names, content, and settings are all opaque to the backend.

### Encryption Scheme

1. On first visit, client calls `/api/register` → receives UUID token + server-generated salt
2. Client derives AES-256-GCM key from token using PBKDF2 (salt from server, 100k iterations)
3. Each entity's JSON payload is encrypted independently with a random IV
4. Decryption happens entirely client-side using Web Crypto API (no third-party crypto libraries)

```
Token (UUID) + Salt → PBKDF2 → AES-256-GCM Key
Plaintext JSON + Key + Random IV → Encrypt → Base64 Ciphertext
```

## Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,           -- the token itself
  key_salt TEXT NOT NULL,         -- PBKDF2 salt (base64)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ
);

CREATE TABLE files (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,   -- encrypted JSON: {name, path, content, language, size, timestamps, ...}
  version INT NOT NULL DEFAULT 1, -- optimistic lock
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ          -- soft delete for multi-device sync
);

CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,   -- encrypted JSON: {name, parentId, children, isExpanded, ...}
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,   -- encrypted JSON: {userSettings, llmSettings, uiState}
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_files_updated_at ON files(user_id, updated_at);
CREATE INDEX idx_folders_updated_at ON folders(user_id, updated_at);
```

### Design Decisions

- **files / folders separated**: enables per-file sync — only changed files are transmitted
- **settings merged to single row**: settings data is small; one encrypted blob simplifies management
- **version field**: client sends current version; server compares and only accepts if client version >= server version (Last-Write-Wins)
- **deleted_at soft delete**: deletion is a state change that must propagate to other devices; physical deletion happens via a cleanup job or after all devices have synced
- **encrypted_data is opaque**: server cannot query by file name, path, or content — all operations are by ID or by timestamp/version

## API Design

All endpoints use `@hono/zod-openapi` for type-safe request/response validation. Auto-generated Scalar docs at `GET /api/docs`.

### Endpoints

#### `POST /api/register` — Create new user

No authentication required.

**Request**: empty body

**Response** (200):
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "salt": "base64-encoded-salt"
}
```

**Logic**: Generate UUID → generate random 16-byte salt → insert into `users` table → return token + salt.

---

#### `GET /api/sync/status` — Get sync status

**Auth**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "files": {
    "<file-id>": { "version": 3, "updatedAt": "2026-04-07T10:00:00Z" }
  },
  "folders": {
    "<folder-id>": { "version": 1, "updatedAt": "2026-04-07T09:00:00Z" }
  },
  "settings": { "version": 2, "updatedAt": "2026-04-07T08:00:00Z" }
}
```

**Logic**: Query latest version and updated_at for all entities belonging to the authenticated user. Client uses this to determine what needs pushing/pulling.

---

#### `POST /api/sync/push` — Push changes

**Auth**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "files": [
    {
      "id": "file-uuid",
      "encryptedData": "base64-ciphertext",
      "version": 3,
      "deletedAt": null
    }
  ],
  "folders": [
    {
      "id": "folder-uuid",
      "encryptedData": "base64-ciphertext",
      "version": 1,
      "deletedAt": null
    }
  ],
  "settings": {
    "encryptedData": "base64-ciphertext",
    "version": 2
  }
}
```

**Response** (200):
```json
{
  "results": {
    "files": {
      "<file-id>": { "success": true, "version": 4 }
    },
    "folders": {
      "<folder-id>": { "success": true, "version": 2 }
    },
    "settings": { "success": true, "version": 3 }
  }
}
```

**Logic**: For each entity, compare client version with server version. If client version >= server version, update entity and increment version. Otherwise reject (stale data).

---

#### `POST /api/sync/pull` — Pull changes

**Auth**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "since": "2026-04-07T09:00:00Z"
}
```

**Response** (200):
```json
{
  "files": [
    {
      "id": "file-uuid",
      "encryptedData": "base64-ciphertext",
      "version": 4,
      "updatedAt": "2026-04-07T10:00:00Z",
      "deletedAt": null
    }
  ],
  "folders": [],
  "settings": {
    "encryptedData": "base64-ciphertext",
    "version": 3,
    "updatedAt": "2026-04-07T10:00:00Z"
  }
}
```

**Logic**: Return all entities with `updated_at > since` for the authenticated user, including soft-deleted entities.

## Client Sync Engine

### New Files

| File | Purpose |
|---|---|
| `src/services/cryptoService.ts` | Key derivation (PBKDF2), encrypt/decrypt (AES-256-GCM) using Web Crypto API |
| `src/services/syncService.ts` | Sync lifecycle management, auto-push, pull-on-load, debounce |

### Store Extensions (usePlaygroundStore.ts)

```typescript
// New fields
syncToken: string | null;        // UUID token
syncVersions: {                  // Local version tracking per entity
  files: Record<string, number>;
  folders: Record<string, number>;
  settings: number;
};
syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
isFirstSync: boolean;            // Show token dialog on first registration
```

### Sync Flow

```
Page Load
  ├── No local token? → POST /api/register → save token + salt → show token dialog
  ├── Derive encryption key from token + salt (PBKDF2)
  ├── GET /api/sync/status → compare versions
  ├── Local newer → POST /api/sync/push
  ├── Remote newer → POST /api/sync/pull → decrypt → merge into store
  └── Subscribe to store changes → debounce 3s → encrypt → POST /api/sync/push
```

### First-Time Experience

New user opens the app → auto-register → modal displays the UUID token with a copy button → user saves the token → modal closes → normal usage. The modal appears exactly once (tracked by `isFirstSync` flag).

## Project Structure

```
js-ts-playground/
├── src/                           # Existing frontend
│   ├── services/
│   │   ├── cryptoService.ts       # NEW: encryption/decryption
│   │   ├── syncService.ts         # NEW: sync lifecycle
│   │   └── ...                    # Existing services
│   ├── store/
│   │   └── usePlaygroundStore.ts  # EXTENDED: sync state fields
│   └── ...
├── server/                        # NEW: backend
│   ├── src/
│   │   ├── index.ts               # Hono app + shared logic
│   │   ├── routes/
│   │   │   ├── register.ts        # POST /api/register
│   │   │   └── sync.ts            # GET /api/sync/status, POST push/pull
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle table definitions
│   │   │   ├── client.ts          # Multi-driver DB connection
│   │   │   └── migrations/        # Generated by drizzle-kit
│   │   ├── middleware/
│   │   │   └── auth.ts            # Bearer token auth middleware
│   │   └── types/
│   │       └── api.ts             # Zod schemas + TS types
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
├── package.json                   # Root workspace
├── pnpm-workspace.yaml            # pnpm workspaces config
└── vite.config.ts                 # Extended: proxy /api/* → backend
```

### Multi-Platform Deployment

| Platform | Entry File | DB Driver | Notes |
|---|---|---|---|
| CF Workers | `entry-workers.ts` | `@neondatabase/serverless` | Edge runtime |
| Vercel | `entry-vercel.ts` | `@neondatabase/serverless` | Serverless functions |
| Node.js (self-hosted) | `entry-node.ts` | `postgres` (postgres.js) | Traditional server |
| Railway | `entry-node.ts` | `postgres` | Same as self-hosted |

Platform selection via environment variable `DATABASE_DRIVER` (`"neon"` or `"node-postgres"`).

### Hono Middleware Chain

```
Request → CORS → Logger → Auth (except /register) → Route Handler → Response
```

### Vite Dev Proxy

```typescript
// vite.config.ts extension
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

## Dependencies

### Backend (server/package.json)

| Package | Purpose |
|---|---|
| `hono` | Web framework |
| `@hono/zod-openapi` | Type-safe OpenAPI routes |
| `@hono/scalar` | API documentation UI |
| `zod` | Schema validation |
| `drizzle-orm` | Type-safe ORM |
| `drizzle-kit` | Schema migrations (dev dependency) |
| `postgres` | PostgreSQL driver (Node.js) |
| `@neondatabase/serverless` | PostgreSQL driver (Edge) |
| `@hono/node-server` | Node.js server adapter |

### Frontend

No new npm packages. Encryption uses the browser-native Web Crypto API.

## Implementation Approach

Use scaffolding tools to initialize the backend project to ensure compatibility with latest framework APIs:

1. `create-hono` to scaffold the Hono project in `server/`
2. `drizzle-kit init` to initialize Drizzle ORM configuration
3. Manually implement routes, middleware, and client sync logic on top of the scaffolded structure

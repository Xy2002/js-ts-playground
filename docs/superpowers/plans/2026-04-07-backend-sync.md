# Backend Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Hono backend with Drizzle ORM for cloud sync, using UUID token auth and end-to-end encryption.

**Architecture:** Monorepo with `server/` directory. Hono app with `@hono/zod-openapi` for type-safe API routes. PostgreSQL via Drizzle ORM. Client-side AES-256-GCM encryption via Web Crypto API. Per-entity sync with optimistic locking.

**Tech Stack:** Hono, @hono/zod-openapi, Zod, Drizzle ORM, PostgreSQL (node-postgres / @neondatabase/serverless), Web Crypto API

**Design Spec:** `docs/superpowers/specs/2026-04-07-backend-sync-design.md`

---

## File Structure

```
js-ts-playground/
├── pnpm-workspace.yaml                    # NEW: workspace config
├── vite.config.ts                         # MODIFY: add dev proxy
├── package.json                           # MODIFY: add dev scripts
├── server/                                # NEW: backend
│   ├── package.json                       # NEW: server dependencies
│   ├── tsconfig.json                      # NEW: server TS config
│   ├── drizzle.config.ts                  # NEW: Drizzle Kit config
│   ├── .env.example                       # NEW: env template
│   └── src/
│       ├── index.ts                       # NEW: Hono app entry
│       ├── db/
│       │   ├── schema.ts                  # NEW: Drizzle table definitions
│       │   └── client.ts                  # NEW: DB connection (multi-driver)
│       ├── types/
│       │   └── api.ts                     # NEW: Zod schemas for all API types
│       ├── middleware/
│       │   └── auth.ts                    # NEW: Bearer token auth
│       └── routes/
│           ├── register.ts                # NEW: POST /api/register
│           └── sync.ts                    # NEW: sync/status, push, pull
├── src/
│   ├── services/
│   │   ├── cryptoService.ts              # NEW: encryption/decryption
│   │   └── syncService.ts               # NEW: sync lifecycle
│   ├── store/
│   │   └── usePlaygroundStore.ts         # MODIFY: add sync state
│   ├── components/
│   │   └── TokenDialog.tsx              # NEW: first-time token display
│   └── App.tsx                           # MODIFY: integrate sync
```

---

### Task 1: Monorepo Setup & Server Scaffold

**Files:**
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: Create pnpm workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - "server"
```

- [ ] **Step 2: Scaffold Hono server**

```bash
cd /Users/weixiangyu/Projects/react/js-ts-playground
mkdir -p server
cd server
pnpm init
```

Then install dependencies:

```bash
cd server
pnpm add hono @hono/zod-openapi @hono/node-server @hono/cors drizzle-orm postgres dotenv
pnpm add -D drizzle-kit tsx @types/node typescript
```

- [ ] **Step 3: Configure server package.json**

After `pnpm init`, update `server/package.json`:

```json
{
  "name": "algopad-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  }
}
```

Keep the `dependencies` and `devDependencies` that were installed in Step 2. Only update the `scripts`, `name`, `private`, and `type` fields.

- [ ] **Step 4: Create server tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create server .env.example**

```
DATABASE_URL=postgresql://user:password@localhost:5432/algopad
DATABASE_DRIVER=node-postgres
PORT=3000
```

- [ ] **Step 6: Create minimal server/src/index.ts placeholder**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

const app = new Hono();

app.use("*", logger());
app.use(
	"/api/*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

app.get("/api/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3000;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
```

- [ ] **Step 7: Install workspace dependencies**

```bash
cd /Users/weixiangyu/Projects/react/js-ts-playground
pnpm install
```

- [ ] **Step 8: Verify server starts**

```bash
cd server && pnpm dev
```

Expected: `Server running on http://localhost:3000`. Then `curl http://localhost:3000/api/health` returns `{"status":"ok"}`. Stop the server after verifying.

- [ ] **Step 9: Commit**

```bash
git add pnpm-workspace.yaml server/ -f ':!server/node_modules'
git commit -m "chore: scaffold hono backend server"
```

---

### Task 2: Database Schema & Drizzle Config

**Files:**
- Create: `server/drizzle.config.ts`
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/client.ts`

- [ ] **Step 1: Create Drizzle config**

```typescript
// server/drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
```

- [ ] **Step 2: Create database schema**

```typescript
// server/src/db/schema.ts
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey(),
	keySalt: text("key_salt").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

export const files = pgTable(
	"files",
	{
		id: uuid("id").primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		encryptedData: text("encrypted_data").notNull(),
		version: integer("version").notNull().default(1),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [index("idx_files_user_id").on(table.userId)],
);

export const folders = pgTable(
	"folders",
	{
		id: uuid("id").primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		encryptedData: text("encrypted_data").notNull(),
		version: integer("version").notNull().default(1),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [index("idx_folders_user_id").on(table.userId)],
);

export const settings = pgTable("settings", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	encryptedData: text("encrypted_data").notNull(),
	version: integer("version").notNull().default(1),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
```

- [ ] **Step 3: Create database client**

```typescript
// server/src/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
	if (_db) return _db;

	const driver = process.env.DATABASE_DRIVER || "node-postgres";
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	if (driver === "neon") {
		throw new Error(
			"Neon driver not configured yet. Use node-postgres for now.",
		);
	}

	_db = drizzle(url, { schema });
	return _db;
}
```

- [ ] **Step 4: Generate migration**

Create a `.env` file in `server/` with your PostgreSQL connection string:

```bash
cd server
echo "DATABASE_URL=postgresql://user:password@localhost:5432/algopad" > .env
echo "DATABASE_DRIVER=node-postgres" >> .env
echo "PORT=3000" >> .env
```

Then generate the migration:

```bash
cd server && pnpm drizzle-kit generate
```

Expected: Creates `server/drizzle/` directory with SQL migration file.

- [ ] **Step 5: Apply migration to database**

```bash
cd server && pnpm db:push
```

Expected: Tables `users`, `files`, `folders`, `settings` created in PostgreSQL.

- [ ] **Step 6: Commit**

```bash
git add server/drizzle.config.ts server/src/db/ server/drizzle/ server/.env.example
git commit -m "feat: add database schema and drizzle config"
```

Note: Make sure `server/.env` is in `.gitignore` (it should be by default from the root `.gitignore`).

---

### Task 3: API Types (Zod Schemas)

**Files:**
- Create: `server/src/types/api.ts`

- [ ] **Step 1: Define all Zod schemas**

```typescript
// server/src/types/api.ts
import { createRoute, z } from "@hono/zod-openapi";

// === Register ===

export const RegisterResponseSchema = z.object({
	token: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
	salt: z.string().openapi({ example: "base64-encoded-salt" }),
});

export const registerRoute = createRoute({
	method: "post",
	path: "/api/register",
	responses: {
		200: {
			content: { "application/json": { schema: RegisterResponseSchema } },
			description: "User registered successfully",
		},
	},
});

// === Auth Error ===

export const ErrorResponseSchema = z.object({
	error: z.string(),
});

// === Sync Status ===

export const EntityVersionSchema = z.object({
	version: z.number().int().openapi({ example: 3 }),
	updatedAt: z.string().openapi({ example: "2026-04-07T10:00:00Z" }),
});

export const SyncStatusResponseSchema = z.object({
	files: z.record(z.string(), EntityVersionSchema),
	folders: z.record(z.string(), EntityVersionSchema),
	settings: EntityVersionSchema.nullable(),
});

export const syncStatusRoute = createRoute({
	method: "get",
	path: "/api/sync/status",
	responses: {
		200: {
			content: {
				"application/json": { schema: SyncStatusResponseSchema },
			},
			description: "Sync status retrieved",
		},
		401: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Unauthorized",
		},
	},
});

// === Sync Push ===

export const PushFileSchema = z.object({
	id: z.string().uuid(),
	encryptedData: z.string(),
	version: z.number().int(),
	deletedAt: z.string().nullable().optional(),
});

export const PushFolderSchema = z.object({
	id: z.string().uuid(),
	encryptedData: z.string(),
	version: z.number().int(),
	deletedAt: z.string().nullable().optional(),
});

export const PushSettingsSchema = z.object({
	encryptedData: z.string(),
	version: z.number().int(),
});

export const PushRequestSchema = z.object({
	files: z.array(PushFileSchema).optional(),
	folders: z.array(PushFolderSchema).optional(),
	settings: PushSettingsSchema.optional(),
});

export const PushResultSchema = z.object({
	success: z.boolean(),
	version: z.number().int().optional(),
	error: z.string().optional(),
});

export const PushResponseSchema = z.object({
	results: z.object({
		files: z.record(z.string(), PushResultSchema).optional(),
		folders: z.record(z.string(), PushResultSchema).optional(),
		settings: PushResultSchema.optional(),
	}),
});

export const syncPushRoute = createRoute({
	method: "post",
	path: "/api/sync/push",
	request: {
		body: {
			content: { "application/json": { schema: PushRequestSchema } },
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: PushResponseSchema } },
			description: "Push results",
		},
		401: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Unauthorized",
		},
	},
});

// === Sync Pull ===

export const PullRequestSchema = z.object({
	since: z.string().openapi({ example: "2026-04-07T09:00:00Z" }),
});

export const PulledFileSchema = z.object({
	id: z.string().uuid(),
	encryptedData: z.string(),
	version: z.number().int(),
	updatedAt: z.string(),
	deletedAt: z.string().nullable(),
});

export const PulledFolderSchema = z.object({
	id: z.string().uuid(),
	encryptedData: z.string(),
	version: z.number().int(),
	updatedAt: z.string(),
	deletedAt: z.string().nullable(),
});

export const PulledSettingsSchema = z.object({
	encryptedData: z.string(),
	version: z.number().int(),
	updatedAt: z.string(),
});

export const PullResponseSchema = z.object({
	files: z.array(PulledFileSchema),
	folders: z.array(PulledFolderSchema),
	settings: PulledSettingsSchema.nullable(),
});

export const syncPullRoute = createRoute({
	method: "post",
	path: "/api/sync/pull",
	request: {
		body: {
			content: { "application/json": { schema: PullRequestSchema } },
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: PullResponseSchema } },
			description: "Pulled changes",
		},
		401: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Unauthorized",
		},
	},
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/types/
git commit -m "feat: add API zod schemas for openapi routes"
```

---

### Task 4: Auth Middleware

**Files:**
- Create: `server/src/middleware/auth.ts`

- [ ] **Step 1: Create auth middleware**

```typescript
// server/src/middleware/auth.ts
import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import { getDb } from "../db/client";

export async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Missing or invalid Authorization header" }, 401);
	}

	const token = authHeader.slice(7);
	if (!token) {
		return c.json({ error: "Empty token" }, 401);
	}

	const db = getDb();
	const user = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, token))
		.get();

	if (!user) {
		return c.json({ error: "Invalid token" }, 401);
	}

	c.set("userId", user.id);
	await next();
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/
git commit -m "feat: add bearer token auth middleware"
```

---

### Task 5: Register Route

**Files:**
- Create: `server/src/routes/register.ts`

- [ ] **Step 1: Implement register route**

```typescript
// server/src/routes/register.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { registerRoute } from "../types/api";

const app = new OpenAPIHono();

app.openapi(registerRoute, async (c) => {
	const token = randomUUID();
	const salt = randomBytes(16).toString("base64");

	const db = getDb();
	await db.insert(users).values({
		id: token,
		keySalt: salt,
	});

	return c.json({ token, salt }, 200);
});

export default app;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/register.ts
git commit -m "feat: implement register route"
```

---

### Task 6: Sync Routes

**Files:**
- Create: `server/src/routes/sync.ts`

- [ ] **Step 1: Implement sync routes**

```typescript
// server/src/routes/sync.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { files, folders, settings, users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import {
	syncPullRoute,
	syncPushRoute,
	syncStatusRoute,
} from "../types/api";

const app = new OpenAPIHono();

// All sync routes require auth
app.use("*", authMiddleware);

// === GET /api/sync/status ===
app.openapi(syncStatusRoute, async (c) => {
	const userId = c.get("userId") as string;
	const db = getDb();

	const userFiles = await db
		.select({ id: files.id, version: files.version, updatedAt: files.updatedAt })
		.from(files)
		.where(eq(files.userId, userId));

	const userFolders = await db
		.select({ id: folders.id, version: folders.version, updatedAt: folders.updatedAt })
		.from(folders)
		.where(eq(folders.userId, userId));

	const userSettings = await db
		.select({ version: settings.version, updatedAt: settings.updatedAt })
		.from(settings)
		.where(eq(settings.userId, userId))
		.get();

	const fileMap: Record<string, { version: number; updatedAt: string }> = {};
	for (const f of userFiles) {
		fileMap[f.id] = {
			version: f.version,
			updatedAt: f.updatedAt.toISOString(),
		};
	}

	const folderMap: Record<string, { version: number; updatedAt: string }> = {};
	for (const f of userFolders) {
		folderMap[f.id] = {
			version: f.version,
			updatedAt: f.updatedAt.toISOString(),
		};
	}

	return c.json({
		files: fileMap,
		folders: folderMap,
		settings: userSettings
			? {
					version: userSettings.version,
					updatedAt: userSettings.updatedAt.toISOString(),
				}
			: null,
	}, 200);
});

// === POST /api/sync/push ===
app.openapi(syncPushRoute, async (c) => {
	const userId = c.get("userId") as string;
	const body = c.req.valid("json");
	const db = getDb();

	const results: {
		files?: Record<string, { success: boolean; version?: number; error?: string }>;
		folders?: Record<string, { success: boolean; version?: number; error?: string }>;
		settings?: { success: boolean; version?: number; error?: string };
	} = {};

	// Push files
	if (body.files && body.files.length > 0) {
		results.files = {};
		for (const file of body.files) {
			const existing = await db
				.select({ version: files.version })
				.from(files)
				.where(and(eq(files.id, file.id), eq(files.userId, userId)))
				.get();

			if (!existing) {
				// New file — insert
				await db.insert(files).values({
					id: file.id,
					userId,
					encryptedData: file.encryptedData,
					version: 1,
					deletedAt: file.deletedAt ? new Date(file.deletedAt) : null,
				});
				results.files[file.id] = { success: true, version: 1 };
			} else if (file.version >= existing.version) {
				// Update — client version >= server version
				const newVersion = existing.version + 1;
				await db
					.update(files)
					.set({
						encryptedData: file.encryptedData,
						version: newVersion,
						updatedAt: new Date(),
						deletedAt: file.deletedAt ? new Date(file.deletedAt) : null,
					})
					.where(eq(files.id, file.id));
				results.files[file.id] = { success: true, version: newVersion };
			} else {
				// Stale — client has older version
				results.files[file.id] = {
					success: false,
					version: existing.version,
					error: "Stale version",
				};
			}
		}
	}

	// Push folders (same logic as files)
	if (body.folders && body.folders.length > 0) {
		results.folders = {};
		for (const folder of body.folders) {
			const existing = await db
				.select({ version: folders.version })
				.from(folders)
				.where(and(eq(folders.id, folder.id), eq(folders.userId, userId)))
				.get();

			if (!existing) {
				await db.insert(folders).values({
					id: folder.id,
					userId,
					encryptedData: folder.encryptedData,
					version: 1,
					deletedAt: folder.deletedAt ? new Date(folder.deletedAt) : null,
				});
				results.folders[folder.id] = { success: true, version: 1 };
			} else if (folder.version >= existing.version) {
				const newVersion = existing.version + 1;
				await db
					.update(folders)
					.set({
						encryptedData: folder.encryptedData,
						version: newVersion,
						updatedAt: new Date(),
						deletedAt: folder.deletedAt ? new Date(folder.deletedAt) : null,
					})
					.where(eq(folders.id, folder.id));
				results.folders[folder.id] = { success: true, version: newVersion };
			} else {
				results.folders[folder.id] = {
					success: false,
					version: existing.version,
					error: "Stale version",
				};
			}
		}
	}

	// Push settings
	if (body.settings) {
		const existing = await db
			.select({ version: settings.version })
			.from(settings)
			.where(eq(settings.userId, userId))
			.get();

		if (!existing) {
			await db.insert(settings).values({
				userId,
				encryptedData: body.settings.encryptedData,
				version: 1,
			});
			results.settings = { success: true, version: 1 };
		} else if (body.settings.version >= existing.version) {
			const newVersion = existing.version + 1;
			await db
				.update(settings)
				.set({
					encryptedData: body.settings.encryptedData,
					version: newVersion,
					updatedAt: new Date(),
				})
				.where(eq(settings.userId, userId));
			results.settings = { success: true, version: newVersion };
		} else {
			results.settings = {
				success: false,
				version: existing.version,
				error: "Stale version",
			};
		}
	}

	// Update lastSyncAt
	await db
		.update(users)
		.set({ lastSyncAt: new Date() })
		.where(eq(users.id, userId));

	return c.json({ results }, 200);
});

// === POST /api/sync/pull ===
app.openapi(syncPullRoute, async (c) => {
	const userId = c.get("userId") as string;
	const body = c.req.valid("json");
	const since = new Date(body.since);
	const db = getDb();

	const pulledFiles = await db
		.select({
			id: files.id,
			encryptedData: files.encryptedData,
			version: files.version,
			updatedAt: files.updatedAt,
			deletedAt: files.deletedAt,
		})
		.from(files)
		.where(and(eq(files.userId, userId), gt(files.updatedAt, since)));

	const pulledFolders = await db
		.select({
			id: folders.id,
			encryptedData: folders.encryptedData,
			version: folders.version,
			updatedAt: folders.updatedAt,
			deletedAt: folders.deletedAt,
		})
		.from(folders)
		.where(and(eq(folders.userId, userId), gt(folders.updatedAt, since)));

	const pulledSettings = await db
		.select({
			encryptedData: settings.encryptedData,
			version: settings.version,
			updatedAt: settings.updatedAt,
		})
		.from(settings)
		.where(and(eq(settings.userId, userId), gt(settings.updatedAt, since)))
		.get();

	return c.json({
		files: pulledFiles.map((f) => ({
			id: f.id,
			encryptedData: f.encryptedData,
			version: f.version,
			updatedAt: f.updatedAt.toISOString(),
			deletedAt: f.deletedAt?.toISOString() ?? null,
		})),
		folders: pulledFolders.map((f) => ({
			id: f.id,
			encryptedData: f.encryptedData,
			version: f.version,
			updatedAt: f.updatedAt.toISOString(),
			deletedAt: f.deletedAt?.toISOString() ?? null,
		})),
		settings: pulledSettings
			? {
					encryptedData: pulledSettings.encryptedData,
					version: pulledSettings.version,
					updatedAt: pulledSettings.updatedAt.toISOString(),
				}
			: null,
	}, 200);
});

export default app;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/sync.ts
git commit -m "feat: implement sync status, push, and pull routes"
```

---

### Task 7: App Entry & API Docs

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Wire up routes and Scalar docs**

Replace the placeholder `server/src/index.ts`:

```typescript
// server/src/index.ts
import "dotenv/config";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import registerRoutes from "./routes/register";
import syncRoutes from "./routes/sync";

const app = new OpenAPIHono();

// Middleware
app.use("*", logger());
app.use(
	"/api/*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/", registerRoutes);
app.route("/", syncRoutes);

// OpenAPI spec
app.doc("/api/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "AlgoPad Sync API",
	},
});

// Scalar API docs UI
app.get("/api/docs", (c) => {
	const html = `<!DOCTYPE html>
<html>
<head>
  <title>AlgoPad Sync API</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <script id="api-reference" data-url="/api/doc"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
	return c.html(html);
});

const port = Number(process.env.PORT) || 3000;
console.log(`Server running on http://localhost:${port}`);
console.log(`API docs at http://localhost:${port}/api/docs`);
serve({ fetch: app.fetch, port });

export default app;
```

- [ ] **Step 2: Verify server starts and docs load**

```bash
cd server && pnpm dev
```

Expected: Server starts, `http://localhost:3000/api/docs` shows Scalar UI.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: wire up routes and scalar api docs"
```

---

### Task 8: Frontend Crypto Service

**Files:**
- Create: `src/services/cryptoService.ts`

- [ ] **Step 1: Implement encryption service**

```typescript
// src/services/cryptoService.ts

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function bufferToBase64(buffer: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

export async function deriveKey(
	token: string,
	saltBase64: string,
): Promise<CryptoKey> {
	const salt = base64ToBuffer(saltBase64);
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(token),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: KEY_LENGTH },
		false,
		["encrypt", "decrypt"],
	);
}

export async function encrypt(
	key: CryptoKey,
	plaintext: string,
): Promise<string> {
	const encoder = new TextEncoder();
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encoder.encode(plaintext),
	);

	// Format: base64(iv) + "." + base64(ciphertext)
	const ivBase64 = bufferToBase64(iv.buffer);
	const ctBase64 = bufferToBase64(ciphertext);
	return `${ivBase64}.${ctBase64}`;
}

export async function decrypt(
	key: CryptoKey,
	encrypted: string,
): Promise<string> {
	const [ivBase64, ctBase64] = encrypted.split(".");
	const iv = base64ToBuffer(ivBase64);
	const ciphertext = base64ToBuffer(ctBase64);

	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		key,
		ciphertext,
	);

	return new TextDecoder().decode(plaintext);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/cryptoService.ts
git commit -m "feat: add client-side encryption service"
```

---

### Task 9: Store Extensions

**Files:**
- Modify: `src/store/usePlaygroundStore.ts`

- [ ] **Step 1: Add sync state fields to store**

Add the following types and state fields to the store. Find the `PlaygroundState` interface and add these fields:

```typescript
// Add to PlaygroundState interface
syncToken: string | null;
syncSalt: string | null;
syncVersions: {
	files: Record<string, number>;
	folders: Record<string, number>;
	settings: number;
};
syncStatus: "idle" | "syncing" | "error" | "offline";
isFirstSync: boolean;
```

Add corresponding actions:

```typescript
// Add to the actions part of PlaygroundState
setSyncToken: (token: string | null) => void;
setSyncSalt: (salt: string | null) => void;
setSyncVersions: (versions: {
	files?: Record<string, number>;
	folders?: Record<string, number>;
	settings?: number;
}) => void;
setSyncStatus: (status: "idle" | "syncing" | "error" | "offline") => void;
setIsFirstSync: (value: boolean) => void;
```

Add initial state values in the `create` call:

```typescript
syncToken: null,
syncSalt: null,
syncVersions: { files: {}, folders: {}, settings: 0 },
syncStatus: "idle",
isFirstSync: false,
```

Add action implementations:

```typescript
setSyncToken: (token) => set({ syncToken: token }),
setSyncSalt: (salt) => set({ syncSalt: salt }),
setSyncVersions: (versions) =>
	set((state) => ({
		syncVersions: {
			files: { ...state.syncVersions.files, ...versions.files },
			folders: { ...state.syncVersions.folders, ...versions.folders },
			settings: versions.settings ?? state.syncVersions.settings,
		},
	})),
setSyncStatus: (status) => set({ syncStatus: status }),
setIsFirstSync: (value) => set({ isFirstSync: value }),
```

Also update `loadFromStorage` to load `syncToken` and `syncSalt` from localStorage (key: `"playground_sync_token"` and `"playground_sync_salt"`), and update `saveToStorage` to persist them.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: No new errors related to sync state.

- [ ] **Step 3: Commit**

```bash
git add src/store/usePlaygroundStore.ts
git commit -m "feat: add sync state fields to playground store"
```

---

### Task 10: Frontend Sync Service

**Files:**
- Create: `src/services/syncService.ts`

- [ ] **Step 1: Implement sync service**

```typescript
// src/services/syncService.ts
import type { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { decrypt, deriveKey, encrypt } from "./cryptoService";

type StoreType = ReturnType<typeof usePlaygroundStore.getState>;

const API_BASE = "/api";
const SYNC_DEBOUNCE_MS = 3000;

let cryptoKey: CryptoKey | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function getOrDeriveKey(store: StoreType): Promise<CryptoKey> {
	if (cryptoKey) return cryptoKey;
	const { syncToken, syncSalt } = store;
	if (!syncToken || !syncSalt) throw new Error("No sync credentials");
	cryptoKey = await deriveKey(syncToken, syncSalt);
	return cryptoKey;
}

async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
	token?: string | null,
): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options.headers as Record<string, string>),
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: "Request failed" }));
		throw new Error(body.error || `HTTP ${res.status}`);
	}
	return res.json();
}

// === Register ===

export async function register(store: StoreType): Promise<void> {
	const data = await apiFetch<{ token: string; salt: string }>(
		"/register",
		{ method: "POST" },
	);
	store.setSyncToken(data.token);
	store.setSyncSalt(data.salt);
	store.setIsFirstSync(true);

	// Save to localStorage
	localStorage.setItem("playground_sync_token", data.token);
	localStorage.setItem("playground_sync_salt", data.salt);

	// Derive key
	cryptoKey = await deriveKey(data.token, data.salt);
}

// === Pull ===

export async function pull(store: StoreType): Promise<void> {
	const { syncToken } = store;
	if (!syncToken) return;

	const key = await getOrDeriveKey(store);
	const data = await apiFetch<{
		files: Array<{
			id: string;
			encryptedData: string;
			version: number;
			updatedAt: string;
			deletedAt: string | null;
		}>;
		folders: Array<{
			id: string;
			encryptedData: string;
			version: number;
			updatedAt: string;
			deletedAt: string | null;
		}>;
		settings: {
			encryptedData: string;
			version: number;
			updatedAt: string;
		} | null;
	}>("/sync/pull", {
		method: "POST",
		body: JSON.stringify({
			since: new Date(0).toISOString(), // Pull everything for now
		}),
	}, syncToken);

	// Decrypt and merge files
	const fileUpdates: Record<string, number> = {};
	for (const file of data.files) {
		if (file.deletedAt) {
			// Remove from local store
			const currentFiles = { ...store.files };
			delete currentFiles[file.id];
			const currentContents = { ...store.fileContents };
			delete currentContents[file.id];
			set(store, { files: currentFiles, fileContents: currentContents });
		} else {
			try {
				const decrypted = await decrypt(key, file.encryptedData);
				const fileInfo = JSON.parse(decrypted);
				// Merge into store
				set(store, {
					files: { ...store.files, [file.id]: fileInfo },
					fileContents: {
						...store.fileContents,
						[file.id]: fileInfo.content,
					},
				});
			} catch {
				console.error(`Failed to decrypt file ${file.id}`);
			}
		}
		fileUpdates[file.id] = file.version;
	}

	// Decrypt and merge folders
	const folderUpdates: Record<string, number> = {};
	for (const folder of data.folders) {
		if (folder.deletedAt) {
			const currentFolders = { ...store.folders };
			delete currentFolders[folder.id];
			set(store, { folders: currentFolders });
		} else {
			try {
				const decrypted = await decrypt(key, folder.encryptedData);
				const folderInfo = JSON.parse(decrypted);
				set(store, {
					folders: { ...store.folders, [folder.id]: folderInfo },
				});
			} catch {
				console.error(`Failed to decrypt folder ${folder.id}`);
			}
		}
		folderUpdates[folder.id] = folder.version;
	}

	// Decrypt and merge settings
	if (data.settings) {
		try {
			const decrypted = await decrypt(key, data.settings.encryptedData);
			const settingsData = JSON.parse(decrypted);
			if (settingsData.userSettings) {
				set(store, { settings: settingsData.userSettings });
			}
			if (settingsData.llmSettings) {
				set(store, { llmSettings: settingsData.llmSettings });
			}
		} catch {
			console.error("Failed to decrypt settings");
		}
		store.setSyncVersions({
			files: fileUpdates,
			folders: folderUpdates,
			settings: data.settings.version,
		});
	}
}

// === Push ===

export async function push(store: StoreType): Promise<void> {
	const { syncToken, syncVersions } = store;
	if (!syncToken) return;

	store.setSyncStatus("syncing");
	const key = await getOrDeriveKey(store);

	try {
		const body: Record<string, unknown> = {};

		// Encrypt files
		const filesPayload = [];
		for (const [id, fileInfo] of Object.entries(store.files)) {
			const plaintext = JSON.stringify(fileInfo);
			const encryptedData = await encrypt(key, plaintext);
			filesPayload.push({
				id,
				encryptedData,
				version: syncVersions.files[id] ?? 0,
			});
		}
		if (filesPayload.length > 0) {
			body.files = filesPayload;
		}

		// Encrypt folders
		const foldersPayload = [];
		for (const [id, folderInfo] of Object.entries(store.folders)) {
			const plaintext = JSON.stringify(folderInfo);
			const encryptedData = await encrypt(key, plaintext);
			foldersPayload.push({
				id,
				encryptedData,
				version: syncVersions.folders[id] ?? 0,
			});
		}
		if (foldersPayload.length > 0) {
			body.folders = foldersPayload;
		}

		// Encrypt settings
		const settingsPlaintext = JSON.stringify({
			userSettings: store.settings,
			llmSettings: store.llmSettings,
		});
		const settingsEncrypted = await encrypt(key, settingsPlaintext);
		body.settings = {
			encryptedData: settingsEncrypted,
			version: syncVersions.settings,
		};

		const result = await apiFetch<{
			results: {
				files?: Record<string, { success: boolean; version?: number }>;
				folders?: Record<string, { success: boolean; version?: number }>;
				settings?: { success: boolean; version?: number };
			};
		}>("/sync/push", {
			method: "POST",
			body: JSON.stringify(body),
		}, syncToken);

		// Update local versions from server response
		const versionUpdates: {
			files?: Record<string, number>;
			folders?: Record<string, number>;
			settings?: number;
		} = {};

		if (result.results.files) {
			const fileVersions: Record<string, number> = {};
			for (const [id, r] of Object.entries(result.results.files)) {
				if (r.success && r.version) fileVersions[id] = r.version;
			}
			versionUpdates.files = fileVersions;
		}

		if (result.results.folders) {
			const folderVersions: Record<string, number> = {};
			for (const [id, r] of Object.entries(result.results.folders)) {
				if (r.success && r.version) folderVersions[id] = r.version;
			}
			versionUpdates.folders = folderVersions;
		}

		if (result.results.settings?.success && result.results.settings.version) {
			versionUpdates.settings = result.results.settings.version;
		}

		store.setSyncVersions(versionUpdates);
		store.setSyncStatus("idle");
	} catch {
		store.setSyncStatus("error");
	}
}

// === Initialize ===

function set(store: StoreType, partial: Partial<StoreType>): void {
	usePlaygroundStore.setState(partial);
}

export async function initSync(): Promise<void> {
	const store = usePlaygroundStore.getState();

	// Load saved credentials
	const savedToken = localStorage.getItem("playground_sync_token");
	const savedSalt = localStorage.getItem("playground_sync_salt");

	if (savedToken && savedSalt) {
		store.setSyncToken(savedToken);
		store.setSyncSalt(savedSalt);
		cryptoKey = await deriveKey(savedToken, savedSalt);

		// Pull remote data
		try {
			await pull(store);
		} catch (err) {
			console.error("Initial pull failed:", err);
		}

		// Push local data
		try {
			await push(store);
		} catch (err) {
			console.error("Initial push failed:", err);
		}
	} else {
		// Register new user
		await register(store);
		// Push initial local data to server
		try {
			await push(store);
		} catch (err) {
			console.error("Initial push failed:", err);
		}
	}

	// Subscribe to store changes for auto-sync
	subscribeToChanges();
}

function subscribeToChanges(): void {
	if (debounceTimer) clearTimeout(debounceTimer);

	debounceTimer = setTimeout(() => {
		const store = usePlaygroundStore.getState();
		if (store.syncToken && store.syncStatus !== "syncing") {
			push(store).catch((err) => {
				console.error("Auto-push failed:", err);
			});
		}
	}, SYNC_DEBOUNCE_MS);
}

// Call this from store subscription
export function onStoreChange(): void {
	const store = usePlaygroundStore.getState();
	if (!store.syncToken || store.syncStatus === "syncing") return;

	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		push(usePlaygroundStore.getState()).catch((err) => {
			console.error("Auto-push failed:", err);
		});
	}, SYNC_DEBOUNCE_MS);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat: add sync service with auto-push and pull"
```

---

### Task 11: Token Dialog Component

**Files:**
- Create: `src/components/TokenDialog.tsx`

- [ ] **Step 1: Create token display dialog**

```tsx
// src/components/TokenDialog.tsx
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

export function TokenDialog() {
	const { syncToken, isFirstSync, setIsFirstSync } = usePlaygroundStore();
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		if (!syncToken) return;
		await navigator.clipboard.writeText(syncToken);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [syncToken]);

	const handleDismiss = useCallback(() => {
		setIsFirstSync(false);
	}, [setIsFirstSync]);

	if (!isFirstSync || !syncToken) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
				<h2 className="mb-2 text-lg font-semibold text-card-foreground">
					Your Sync Token
				</h2>
				<p className="mb-4 text-sm text-muted-foreground">
					Save this token somewhere safe. You'll need it to sync your data on
					other devices. If you lose it, your cloud data cannot be recovered.
				</p>

				<div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted p-3">
					<code className="flex-1 break-all text-xs text-foreground">
						{syncToken}
					</code>
					<button
						type="button"
						onClick={handleCopy}
						className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						{copied ? (
							<Check className="h-4 w-4 text-green-500" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</button>
				</div>

				<button
					type="button"
					onClick={handleDismiss}
					className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					I've Saved My Token
				</button>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TokenDialog.tsx
git commit -m "feat: add token dialog component"
```

---

### Task 12: App Integration & Dev Config

**Files:**
- Modify: `src/App.tsx`
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Integrate sync into App.tsx**

Add sync initialization and TokenDialog to `App.tsx`. In the `AppContent` component, after `loadFromStorage()` and `setIsStorageLoaded(true)`, add sync init:

```tsx
import { TokenDialog } from "@/components/TokenDialog";
import { initSync, onStoreChange } from "@/services/syncService";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
```

In the `useEffect` that calls `loadFromStorage()`, add after `setIsStorageLoaded(true)`:

```tsx
initSync().catch(console.error);
usePlaygroundStore.subscribe(onStoreChange);
```

In the JSX, add `<TokenDialog />` before the closing `</>` of the fragment:

```tsx
<>
  {/* ... existing content ... */}
  <TokenDialog />
</>
```

- [ ] **Step 2: Configure Vite dev proxy**

Update `vite.config.ts`:

```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		sourcemap: "hidden",
	},
	define: {
		__COMMIT_HASH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || ""),
		__COMMIT_MESSAGE__: JSON.stringify(
			process.env.VERCEL_GIT_COMMIT_MESSAGE || "",
		),
	},
	plugins: [react(), tsconfigPaths()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
});
```

- [ ] **Step 3: Add root dev scripts**

Add these scripts to the root `package.json`:

```json
{
  "scripts": {
    "dev:server": "pnpm --filter algopad-server dev",
    "db:generate": "pnpm --filter algopad-server db:generate",
    "db:migrate": "pnpm --filter algopad-server db:migrate",
    "db:push": "pnpm --filter algopad-server db:push"
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx vite.config.ts package.json
git commit -m "feat: integrate sync into app and configure dev proxy"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Database schema (users, files, folders, settings) — Task 2
- [x] E2E encryption (PBKDF2 + AES-256-GCM) — Task 8
- [x] POST /api/register — Task 5
- [x] GET /api/sync/status — Task 6
- [x] POST /api/sync/push — Task 6
- [x] POST /api/sync/pull — Task 6
- [x] Auth middleware — Task 4
- [x] Scalar API docs — Task 7
- [x] Client sync service (auto-push, pull-on-load) — Task 10
- [x] Store extensions — Task 9
- [x] Token dialog — Task 11
- [x] Vite proxy — Task 12
- [x] Multi-platform DB driver (node-postgres + Neon placeholder) — Task 2
- [x] Monorepo setup — Task 1

**2. Placeholder scan:** No TBD/TODO/fill-in-later found.

**3. Type consistency:** Zod schemas, Drizzle schema, and client-side types use consistent field names (`encryptedData`, `version`, `deletedAt`, `updatedAt`).

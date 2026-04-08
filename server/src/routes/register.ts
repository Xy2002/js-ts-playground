import { OpenAPIHono } from "@hono/zod-openapi";
import { randomBytes, randomUUID } from "node:crypto";
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

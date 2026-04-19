import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-5eb2b086/health", (c) => {
  return c.json({ status: "ok" });
});

// Save user profile
app.post("/make-server-5eb2b086/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    await kv.set(`profile:${userId}`, JSON.stringify(body));
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error saving profile for user: ${err}`);
    return c.json({ error: `Failed to save profile: ${err}` }, 500);
  }
});

// Get user profile
app.get("/make-server-5eb2b086/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const data = await kv.get(`profile:${userId}`);
    if (!data) {
      return c.json({ profile: null });
    }
    return c.json({ profile: JSON.parse(data as string) });
  } catch (err) {
    console.log(`Error fetching profile: ${err}`);
    return c.json({ error: `Failed to fetch profile: ${err}` }, 500);
  }
});

// Get all profiles
app.get("/make-server-5eb2b086/profiles", async (c) => {
  try {
    const data = await kv.getByPrefix("profile:");
    const profiles = data.map((item: any) => {
      try {
        return { key: item.key, ...JSON.parse(item.value as string) };
      } catch {
        return null;
      }
    }).filter(Boolean);
    return c.json({ profiles });
  } catch (err) {
    console.log(`Error fetching profiles: ${err}`);
    return c.json({ error: `Failed to fetch profiles: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "threads.json");

function loadThreads() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveThreads(threads) {
  fs.writeFileSync(DB_FILE, JSON.stringify(threads, null, 2));
}

export default async function handler(req, res) {
  try {
    if (process.env.KV_REST_API_URL) {
      const { Redis } = await import("@upstash/redis");
      const client = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

      if (req.method === "GET") {
        const raw = await client.get("threads");
        const threads = typeof raw === "string" ? JSON.parse(raw) : raw || [];
        threads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return res.status(200).json(threads);
      }

      if (req.method === "POST") {
        const { username, title, body } = req.body;
        if (!username || !title || !body) {
          return res.status(400).json({ error: "username, title, and body required" });
        }
        const raw = await client.get("threads");
        const threads = typeof raw === "string" ? JSON.parse(raw) : raw || [];
        const thread = {
          id: randomUUID(),
          username,
          title,
          body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        threads.push(thread);
        await client.set("threads", JSON.stringify(threads));
        return res.status(201).json(thread);
      }

      if (req.method === "PUT") {
        const { id, username, title, body } = req.body;
        if (!id || !username) {
          return res.status(400).json({ error: "id and username required" });
        }
        const raw = await client.get("threads");
        const threads = typeof raw === "string" ? JSON.parse(raw) : raw || [];
        const idx = threads.findIndex((t) => t.id === id);
        if (idx === -1) return res.status(404).json({ error: "Thread not found" });
        if (threads[idx].username !== username) {
          return res.status(403).json({ error: "You can only edit your own threads" });
        }
        if (title !== undefined) threads[idx].title = title;
        if (body !== undefined) threads[idx].body = body;
        threads[idx].updatedAt = new Date().toISOString();
        await client.set("threads", JSON.stringify(threads));
        return res.status(200).json(threads[idx]);
      }

      if (req.method === "DELETE") {
        const { id, username } = req.body;
        if (!id || !username) {
          return res.status(400).json({ error: "id and username required" });
        }
        const raw = await client.get("threads");
        const threads = typeof raw === "string" ? JSON.parse(raw) : raw || [];
        const idx = threads.findIndex((t) => t.id === id);
        if (idx === -1) return res.status(404).json({ error: "Thread not found" });
        if (threads[idx].username !== username) {
          return res.status(403).json({ error: "You can only delete your own threads" });
        }
        threads.splice(idx, 1);
        await client.set("threads", JSON.stringify(threads));
        return res.status(200).json({ message: "Thread deleted" });
      }

      return res.status(405).json({ error: "Method not allowed" });
    } else {
      if (req.method === "GET") {
        const threads = loadThreads();
        threads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return res.status(200).json(threads);
      }

      if (req.method === "POST") {
        const { username, title, body } = req.body;
        if (!username || !title || !body) {
          return res.status(400).json({ error: "username, title, and body required" });
        }
        const threads = loadThreads();
        const thread = {
          id: randomUUID(),
          username,
          title,
          body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        threads.push(thread);
        saveThreads(threads);
        return res.status(201).json(thread);
      }

      if (req.method === "PUT") {
        const { id, username, title, body } = req.body;
        if (!id || !username) {
          return res.status(400).json({ error: "id and username required" });
        }
        const threads = loadThreads();
        const idx = threads.findIndex((t) => t.id === id);
        if (idx === -1) return res.status(404).json({ error: "Thread not found" });
        if (threads[idx].username !== username) {
          return res.status(403).json({ error: "You can only edit your own threads" });
        }
        if (title !== undefined) threads[idx].title = title;
        if (body !== undefined) threads[idx].body = body;
        threads[idx].updatedAt = new Date().toISOString();
        saveThreads(threads);
        return res.status(200).json(threads[idx]);
      }

      if (req.method === "DELETE") {
        const { id, username } = req.body;
        if (!id || !username) {
          return res.status(400).json({ error: "id and username required" });
        }
        const threads = loadThreads();
        const idx = threads.findIndex((t) => t.id === id);
        if (idx === -1) return res.status(404).json({ error: "Thread not found" });
        if (threads[idx].username !== username) {
          return res.status(403).json({ error: "You can only delete your own threads" });
        }
        threads.splice(idx, 1);
        saveThreads(threads);
        return res.status(200).json({ message: "Thread deleted" });
      }

      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("threads error:", err);
    return res.status(500).json({ error: err.message });
  }
}

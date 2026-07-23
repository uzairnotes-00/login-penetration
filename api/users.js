import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "users.json");

function loadUsers() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (process.env.KV_REST_API_URL) {
      const { default: Redis } = await import("@upstash/redis");
      const client = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
      const raw = await client.get("usernames");
      const usernames = typeof raw === "string" ? JSON.parse(raw) : raw || [];
      const users = [];
      for (const name of usernames) {
        const rawUser = await client.get(`user:${name}`);
        if (rawUser) {
          const user = typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
          users.push({ username: user.username, createdAt: user.createdAt });
        }
      }
      return res.status(200).json(users);
    } else {
      const allUsers = loadUsers();
      const users = allUsers.map((u) => ({ username: u.username, createdAt: u.createdAt }));
      return res.status(200).json(users);
    }
  } catch (err) {
    console.error("users error:", err);
    return res.status(500).json({ error: err.message });
  }
}

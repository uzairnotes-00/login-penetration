import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const isRedis = !!process.env.UPSTASH_REDIS_REST_URL;
let redis;
if (isRedis) {
  const { Redis } = await import("@upstash/redis");
  redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

const DB_FILE = path.join(process.cwd(), "users.json");
function loadUsers() {
  if (!fs.existsSync(DB_FILE)) return [];
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (isRedis) {
      const existing = await redis.get(`user:${username}`);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const user = { id: randomUUID(), username, password, createdAt: new Date().toISOString() };
      await redis.set(`user:${username}`, JSON.stringify(user));
      const allUsers = (await redis.get("usernames")) || [];
      allUsers.push(username);
      await redis.set("usernames", JSON.stringify(allUsers));
    } else {
      const users = loadUsers();
      if (users.find((u) => u.username === username)) {
        return res.status(409).json({ error: "Username already exists" });
      }
      users.push({ username, password, createdAt: new Date().toISOString() });
      saveUsers(users);
    }

    return res.status(200).json({ message: "Signup successful" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

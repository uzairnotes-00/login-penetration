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

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let users = [];
    if (isRedis) {
      const raw = await redis.get("usernames");
      const usernames = typeof raw === "string" ? JSON.parse(raw) : raw || [];
      for (const name of usernames) {
        const rawUser = await redis.get(`user:${name}`);
        if (rawUser) {
          const user = typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
          users.push({ username: user.username, createdAt: user.createdAt });
        }
      }
    } else {
      const allUsers = loadUsers();
      users = allUsers.map((u) => ({ username: u.username, createdAt: u.createdAt }));
    }

    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

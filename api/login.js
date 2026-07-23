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
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    let user;
    if (isRedis) {
      const raw = await redis.get(`user:${username}`);
      if (!raw) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      user = typeof raw === "string" ? JSON.parse(raw) : raw;
    } else {
      const users = loadUsers();
      user = users.find((u) => u.username === username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    return res.status(200).json({ message: "Login successful", username: user.username });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

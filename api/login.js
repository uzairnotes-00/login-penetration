import fs from "fs";
import path from "path";

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

    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { default: Redis } = await import("@upstash/redis");
      const client = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
      const raw = await client.get(`user:${username}`);
      if (!raw) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const user = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      return res.status(200).json({ message: "Login successful", username: user.username });
    } else {
      const users = loadUsers();
      const user = users.find((u) => u.username === username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      return res.status(200).json({ message: "Login successful", username: user.username });
    }
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: err.message });
  }
}

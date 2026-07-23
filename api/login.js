import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const raw = await redis.get(`user:${username}`);
  if (!raw) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const user = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (user.password !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  return res.status(200).json({ message: "Login successful", username: user.username });
}

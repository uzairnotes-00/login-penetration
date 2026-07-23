import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

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

  const existing = await redis.get(`user:${username}`);
  if (existing) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const user = {
    id: randomUUID(),
    username,
    password,
    createdAt: new Date().toISOString(),
  };

  await redis.set(`user:${username}`, JSON.stringify(user));

  const allUsers = (await redis.get("usernames")) || [];
  allUsers.push(username);
  await redis.set("usernames", JSON.stringify(allUsers));

  return res.status(200).json({ message: "Signup successful" });
}

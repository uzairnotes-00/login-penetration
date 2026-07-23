import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const raw = await redis.get("usernames");
  const usernames = typeof raw === "string" ? JSON.parse(raw) : raw || [];
  const users = [];

  for (const name of usernames) {
    const rawUser = await redis.get(`user:${name}`);
    if (rawUser) {
      const user = typeof rawUser === "string" ? JSON.parse(rawUser) : rawUser;
      users.push({ username: user.username, createdAt: user.createdAt });
    }
  }

  return res.status(200).json(users);
}

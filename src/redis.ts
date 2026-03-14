import { createClient } from "redis";

export const redis: ReturnType<typeof createClient> = createClient({
  url: process.env.REDIS_URL as string,
});

export async function connectRedis() {
  if (!redis.open) await redis.connect();
}

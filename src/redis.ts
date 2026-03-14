import { createClient } from "redis";
import { config } from "./config";

export const redis: ReturnType<typeof createClient> = createClient({
  url: config.REDIS_URL,
  password: config.REDIS_PASSWORD,
});

export async function connectRedis() {
  if (!redis.open) await redis.connect();
}

import { Redis } from "ioredis"

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
})

redis.on("error", (error) => {
  console.error("Redis error:", error.message)
})

export default redis
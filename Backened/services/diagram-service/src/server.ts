import "dotenv/config"
import { z } from "zod"
import app from "./app.js"

const envSchema = z.object({
    PORT: z.coerce.number(),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(32),
    REDIS_URL: z.string().min(1),
})

const env = envSchema.parse(process.env)

app.listen(env.PORT, () => {
    console.log(`diagram service is running on port ${env.PORT}`)
})
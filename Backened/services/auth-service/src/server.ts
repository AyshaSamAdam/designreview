import "dotenv/config"
import { z } from "zod"
import app from "./app.js"

const envSchema = z.object({
    PORT: z.coerce.number(),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    FRONTEND_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

app.listen(env.PORT, () => {
    console.log(`auth service running on PORT ${env.PORT}`)
})
import app from './app.js'

import "dotenv/config"
import {z } from 'zod'

const envSchema = z.object({
    PORT : z.coerce.number(),
    DATABASE_URL : z.string().url(),
    JWT_SECRET : z.string().min(32)
 })


const env = envSchema.parse(process.env);



app.listen(env.PORT, () => {
    console.log(`auth service running on PORT ${env.PORT}`)
})
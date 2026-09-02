import app from './app.js'

import "dotenv/config"
import {z } from 'zod'

const envSchema = z.object({
    PORT : z.coerce.number()
})


const env = envSchema.parse(process.env);



app.listen(env.PORT, () => {
    console.log(`auth service running on PORT ${env.PORT}`)
})
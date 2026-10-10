import "dotenv/config"
import { z } from "zod"
import app from "./app.js"
import { library } from "./scenarios.js"

const envSchema = z.object({
    PORT: z.coerce.number(),
    JWT_SECRET: z.string().min(32),
    ANTHROPIC_API_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)

app.listen(env.PORT, () => {
    console.log(`review service is running on port ${env.PORT}`)
})

const roleCount = Object.keys(library.roles).length  // libarry.role is a object with name coming form design-review.json our data file for each role we have "services"  " database" , "cache "  am object.keys just ive u the names as a list [services, databases, cache ].length counts how many are in the list thst 17 variable role count keeps the no
const scenarioCount =
    Object.values(library.roles).reduce((sum, role) => sum + role.scenarios.length, 0) +
    library.system.scenarios.length
console.log(`Loaded ${roleCount} roles and ${scenarioCount} scenarios`)
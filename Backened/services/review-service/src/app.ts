import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import reviewRoutes from "./routes/reviewRoutes.js"
import { requireAuth } from "./requireAuth.js"

const app = express()
app.use(helmet())
app.use(cors({
    // The website address allowed to call this service from a browser.
    // In production set CORS_ORIGIN; the default is for local development.
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true
}))
app.use(express.json({ limit: "100kb" })) // turns the text you send into an object: req.body
app.use(cookieParser())

app.use("/review", requireAuth, reviewRoutes)

app.get("/health", (req, res) => {
    res.json({ status: "review service is alive" })
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: "Something went wrong" })
})

export default app
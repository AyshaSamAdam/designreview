import express from "express"
import helmet from "helmet"
import cors from "cors"
import reviewRoutes from "./routes/reviewRoutes.js"

const app = express()
app.use(helmet())
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))
app.use(express.json({ limit: "100kb" })) // turned the text you sent into an object req.body 

app.use("/review", reviewRoutes)

app.get("/health", (req, res) => {
    res.json({ status: "review service is alive" })
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: "Something went wrong" })
})

export default app
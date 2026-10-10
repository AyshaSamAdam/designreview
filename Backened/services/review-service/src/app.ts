import express from "express"
import helmet from "helmet"
import cors from "cors"

const app = express()
app.use(helmet())
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))
app.use(express.json({ limit: "100kb" }))

app.get("/health", (req, res) => {
    res.json({ status: "review service is alive" })
})

export default app
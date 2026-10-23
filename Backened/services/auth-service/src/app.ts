import express from "express"
import authRoutes from "./routes/authRoutes.js"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.set("trust proxy", 1)
app.use(helmet())
app.use(cors({
    // The website address allowed to call this service from a browser.
    // In production set CORS_ORIGIN; the default is for local development.
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.use("/auth", authRoutes)

export default app
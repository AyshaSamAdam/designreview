import express from "express"
import diagramRoutes from "./routes/diagramRoutes.js"
import promptsRoutes from "./routes/promptRoutes.js"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(helmet())
app.use(cors({
    origin : "http://localhost:3000",
    credentials : true
}))



app.use(express.json())
app.use(cookieParser())



app.use("/diagrams", diagramRoutes)
app.use("/prompts", promptsRoutes)



app.get("/health", (req, res) => {
     res.json({status :  "diagram service is alive"})
});



export default app;
import express from "express"
import diagramRoutes from "./routes/diagramRoutes.js"
import helmet from "helmet"
import cors from "cors"

const app = express()
app.use(helmet())
app.use(cors({
    origin : "http://localhost:3000",
    credentials : true
}))



app.use(express.json())



app.use("/diagrams", diagramRoutes)




app.get("/health", (req, res) => {
     res.json({status :  "diagram service is alive"})
});



export default app;
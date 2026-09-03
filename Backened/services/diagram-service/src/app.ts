import express from "express"
import diagramRoutes from "./routes/diagramRoutes.js"

const app = express()

app.use(express.json())



app.use("/diagram", diagramRoutes)

app.get("/health", (req, res) => {
     res.json({status :  "diagram service is alive"})
});



export default app;
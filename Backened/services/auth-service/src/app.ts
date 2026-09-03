import  express from "express";
import authRoutes  from './routes/authRoutes.js'
import helmet from "helmet";
import cors from "cors"



const app = express();
app.use(helmet())
app.use(cors({
    origin : "http://localhost:3000",
    credentials : true
}))


app.use(express.json());
app.use("/auth", authRoutes)




export default app;
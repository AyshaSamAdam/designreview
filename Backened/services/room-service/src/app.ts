import express from "express"


const app = express()

app.get("/health", (req, res ) =>{
    res.json({ status : 'room service is alive '})

})

export default app
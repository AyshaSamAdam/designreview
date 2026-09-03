import { z } from "zod"
import {Request, Response, NextFunction} from "express"


const diagramSchema = z.object({
    title : z.string().min(1),
    nodes : z.array(z.any()),
    edges : z.array(z.any())
})




export function validateDiagram(req : Request, res : Response, next : NextFunction) {

    const result = diagramSchema.safeParse(req.body)

    if (!result.success) {
        return res.status(400).json({
            error : result.error.issues
        })
    }
    req.body = result.data
    next();

}
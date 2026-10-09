import { z } from "zod"
import {Request, Response, NextFunction} from "express"


const diagramSchema = z.object({
    title : z.string().trim().min(1).max(100),
    nodes : z.array(z.any()),
    edges : z.array(z.any()),
    promptId : z.string().max(100).optional(),
    notes : z.string().max(5000).optional()
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


const updateDiagramSchema = diagramSchema.omit({promptId : true}).partial();

export function validateDiagramUpdate (req : Request, res : Response, next : NextFunction) {
    const result = updateDiagramSchema.safeParse(req.body);

       if (!result.success) {
        return res.status(400).json({
            error : result.error.issues
        })
    }
    req.body = result.data
    next();

}
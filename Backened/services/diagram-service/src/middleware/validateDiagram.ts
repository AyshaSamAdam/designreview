import { z } from "zod"
import {Request, Response, NextFunction} from "express"


const nodeSchema = z.object({
    data : z.object({
        label : z.string().max(100).optional(),
        note : z.string().max(300).optional()
    }).passthrough().optional()
}).passthrough()  //passthrogh mean BY DEFAULT ZOD THROWS AWAY ANY FIELD IT WASNT TOLD ABOUT. BOXES CARRY MANY OTHER FIELDS (ID, POSITION, WIDTH...) WITHOUT PASSTHROUGH() EVERY SAVE WOULD STRIP THEM AND UR BOXES WOULD LOSE THEIR POSITIONS. IT MEANS " CHECK MY TWO FIELDS BUT KEEP EVERYTHING ELSE "

const diagramSchema = z.object({
    title : z.string().trim().min(1).max(100),
    nodes : z.array(nodeSchema).max(300),  // means each item must be  avlaid box and  a diagram can have at most 4300 boxes. this stops someone from sneding huge list
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
import { z } from "zod"
import { Request, Response, NextFunction } from "express"


const updateProfileSchema = z.object({
    name: z.string().min(1).optional()
})


export function validateUpdateProfile(req: Request, res: Response, next: NextFunction) {
    const result = updateProfileSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({
            error: result.error.issues
        })
    }


    req.body = result.data
    next()
}

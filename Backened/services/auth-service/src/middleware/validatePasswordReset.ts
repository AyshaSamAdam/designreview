import { z } from "zod"
import { Request, Response, NextFunction } from "express"


const forgotPasswordSchema = z.object({
    email : z.string().email(),
})

const resetPasswordSchema = z.object({
    token : z.string().min(1),
    newPassword : z.string().min(8)
})


export async function validateForgotPassword(req: Request, res : Response, next: NextFunction) {
      const result = forgotPasswordSchema.safeParse(req.body)


      if(!result.success)  return res.status(400).json({ 
        error : result.error.issues
    }) 


    req.body = result.data
    next();
}

export async function validateResetPassword(req : Request, res : Response, next : NextFunction) {
    
    const result = resetPasswordSchema.safeParse(req.body)
    
    if(!result.success) return res.status(400).json({
        error : result.error.issues
    })

    req.body = result.data
    next();
}
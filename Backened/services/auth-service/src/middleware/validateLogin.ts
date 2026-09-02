import {z } from "zod"

import { Request, Response, NextFunction } from "express"



const loginSchema = z.object({
    email : z.string().email(),
    password : z.string().min(1),
})



export function validateLogin(req : Request, res : Response, next : NextFunction) {
        const result = loginSchema.safeParse(req.body)


        if (!result.success) {
            return res.status(400).json({
                    error : result.error.issues
            })
        }


        req.body = result.data
         next()

    
}
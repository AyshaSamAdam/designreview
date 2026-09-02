import {z } from "zod"

import { Request, Response, NextFunction } from "express"


const signUpSchema = z.object({
    email : z.string().email(),
    password: z.string().min(8),
    name : z.string().min(1)

})


export function validateSignup(req : Request, res : Response, next :NextFunction) {
    const result = signUpSchema.safeParse(req.body)
    // safe parse doest immediately crashes the server like in Server.js which parse() does it returns an obj   if sucess { success : true , data: ... }    if not success then { sucess : false , error: ... }


     if (!result.success) {
        return res.status(400).json({
            error : result.error.issues
        })
     }


     req.body = result.data
     next()

}
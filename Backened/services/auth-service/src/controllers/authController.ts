import { Request, Response } from "express"
import bcrypt from 'bcrypt'
import prisma from "../db.js"



export async function signUp(req: Request, res: Response) {

    const { email, password, name } = req.body

    try {
        const passwordHash = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data : {email, passwordHash, name},
        });


       return res.status(201).json({
            id : user.id,
            email : user.email,
            name : user.name
        })

    }
    catch (err: any) {

        if (err.code === "P2002") {
            return res.status(409).json({
                error : "Email already In Use"
            })
        }



        console.log(err)
        res.status(500).json({
            error : "Something Went Wrong"
        })
    }
}
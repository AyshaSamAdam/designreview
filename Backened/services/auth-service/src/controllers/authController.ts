import { Request, Response } from "express"
import bcrypt from 'bcrypt'
import prisma from "../db.js"
import jwt  from "jsonwebtoken"



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


export async function logIn(req : Request, res : Response) {

    const { email, password} = req.body


    try {
         const user = await prisma.user.findUnique({ where : {email}})

         if ( !user || !user.passwordHash) {
            return res.status(401).json({
                error : "Invalid Email or Password"
            })
         }

         const passwordMatches = await bcrypt.compare(password, user.passwordHash);

         if (!passwordMatches) {
            return res.status(401).json({
                error : "Invalid Email or Password"
            })
         }


       const token  = jwt.sign({userId : user.id}, process.env.JWT_SECRET as string, {expiresIn : "15m"})


         return res.status(200).json({
            token ,
            user : {id : user.id, email : user.email, name : user.name}
         })


    }
    catch(err) {
        console.log(err)
        return res.status(500).json({error : "Something went wrong"})

    }
    
}
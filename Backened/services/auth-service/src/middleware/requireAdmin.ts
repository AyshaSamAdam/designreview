import { Response,NextFunction } from "express";
import prisma from "../db.js";
import { authRequest } from "./autheticate.js";
import test from "node:test";



export async function requireAdmin(req : authRequest , res : Response, next : NextFunction) {

    try{
        const user = await prisma.user.findUnique({
            where : {id : req.userId},
            select : {role : true}
        })

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                error : "admin access required"
            })
        }

        next();

    }
    catch(err) {
        console.log(err)
        return res.status(500).json({ error : "Something Went Wrong"})

    }
    
}
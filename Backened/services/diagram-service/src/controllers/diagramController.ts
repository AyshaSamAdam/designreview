import { Response } from "express";
import prisma from "../db.js";
import { authRequest } from "../middleware/authenticate.js";
import { stripTypeScriptTypes } from "node:module";


export async function createDiagram(req : authRequest, res :Response) {

    const  {title, nodes, edges} = req.body

    try{
         const diagram = await prisma.diagram.create({
            data: {
                title,
                nodes,
                edges,
                userId : req.userId as string,

            }
         })


         return res.status(201).json({
            diagram
         })

    }
    catch(err) {
        console.log(err)
        return res.status(500).json({ error :  "Something Went Wrong "})

    }
}
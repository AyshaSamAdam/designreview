import { Response } from "express";
import prisma from "../db.js";
import { authRequest } from "../middleware/authenticate.js";

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


export async function getAllDiagrams(req : authRequest, res :Response) {
    try{

            const  diagrams = await prisma.diagram.findMany({
                where : {userId : req.userId},
                orderBy : {updatedAt : "desc"}
            })


             return res.status(200).json ({
                diagrams
             })
    }
    catch(error) {
        console.log(error)
        return res.status(500).json({
            error :  "Something Went Wrong"
        })
    }
    
    
}

export async function getOneDiagram(req : authRequest, res :Response) {
      const  id = req.params.id as string;

      try{

        const diagram = await prisma.diagram.findUnique({
            where  : { id}
        })

        if (!diagram) {
            return res.status(404).json({
                error : "Diagram not found"
            })
        }

        if (diagram.userId !== req.userId) {
             return res.status(403).json({
                error : "Forbidden "
            })
        }

        return res.status(200).json(diagram)
        




      }
      catch(error ) {
        console.log(error)
        return res.status(500).json({
             error : "Something Went Wrong"
        })

      }

    
}
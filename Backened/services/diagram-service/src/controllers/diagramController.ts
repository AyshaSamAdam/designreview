import { Request, Response } from "express";
import prisma from "../db.js";
import { authRequest } from "../middleware/authenticate.js";
import { Prisma } from "@prisma/client";
import redis from "../redis.js";

export async function createDiagram(req: authRequest, res: Response) {

  const { title, nodes, edges } = req.body

  try {
    const diagram = await prisma.diagram.create({
      data: {
        title,
        nodes,
        edges,
        userId: req.userId as string,

      }
    })


    return res.status(201).json({
      diagram
    })

  }
  catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Something Went Wrong " })

  }
}


export async function getAllDiagrams(req: authRequest, res: Response) {
  // Pagination 
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {

    const [diagrams, total] = await Promise.all([
      prisma.diagram.findMany({
        where: { userId: req.userId },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.diagram.count({ where: { userId: req.userId } })
    ])

    return res.status(200).json({
      diagrams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  }
  catch (error) {
    console.log(error)
    return res.status(500).json({
      error: "Something Went Wrong"
    })
  }


}

// export async function getOneDiagram(req : authRequest, res :Response) {
//       const  id = req.params.id as string;

//       try{

//         const diagram = await prisma.diagram.findUnique({
//             where  : { id}
//         })

//         if (!diagram) {
//             return res.status(404).json({
//                 error : "Diagram not found"
//             })
//         }

//         if (diagram.userId !== req.userId) {
//              return res.status(403).json({
//                 error : "Forbidden "
//             })
//         }

//         return res.status(200).json(diagram)


//       }
//       catch(error ) {
//         console.log(error)
//         return res.status(500).json({
//              error : "Something Went Wrong"
//         })

//       }


// }


export async function getOneDiagram(req: authRequest, res: Response) {
  const id = req.params.id as string;
  const cacheKey = `diagram:${id}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      const diagram = JSON.parse(cached);

      if (diagram.userId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.status(200).json(diagram);
    }

    const diagram = await prisma.diagram.findUnique({ where: { id } });

    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    if (diagram.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await redis.set(cacheKey, JSON.stringify(diagram), "EX", 300);

    return res.status(200).json(diagram);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function updateDiagram(req: authRequest, res: Response) {

  const id = req.params.id as string;
  const { title, nodes, edges } = req.body;


  try {
    const existing = await prisma.diagram.findUnique({
      where: { id }

    })

    if (!existing) {
      return res.status(404).json({ error: "Diagram not Found" })
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" })
    }

    const updated = await prisma.diagram.update({
      where: { id },
      data: {
        title,
        nodes,
        edges
      }
    })

    await redis.del(`diagram:${id}`)

    return res.status(200).json(updated)


  }
  catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Something Went Wrong" })

  }

}

export async function togglePublic(req: authRequest, res: Response) {

  const id = req.params.id as string;


  try {

    const diagram = await prisma.diagram.findUnique({ where: { id } })

    if (!diagram) {
      return res.status(404).json({ error: "Diagram Not Found" })
    }

    if (diagram.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" })
    }


    const updated = await prisma.diagram.update({
      where: { id },
      data: { isPublic: !diagram.isPublic }
    })

    redis.del(`diagram:${id}`)


    return res.status(200).json({ id: updated.id, isPublic: updated.isPublic })


  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Something Went wrong" })
  }



}


export async function getPublicDiagram(req : Request, res : Response) {
       const id = req.params.id as string;
       

       try{
          const diagram = await prisma.diagram.findUnique({
            where : {id},
            select : {
              id : true,
              title : true,
              nodes : true,
              edges : true,
              isPublic : true,
              createdAt : true
            }
          })

          if (!diagram || !diagram.isPublic){
            return res.status(404).json({error : "Diagram not Found"});

          }


           const {isPublic, ...publicData}  = diagram
            return res.status(200).json(publicData);
       }
       catch(err) {
        console.log(err)
        return res.status(500).json({error : "Something Went Wrong"})
       }

  
}
import { Request, Response } from "express";
import prisma from "../db.js";
import { authRequest } from "../middleware/authenticate.js";
import { Prisma } from "@prisma/client";
import redis from "../redis.js";
import  crypto from "crypto"

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
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;

  try {

    const [diagrams, total] = await Promise.all([
      prisma.diagram.findMany({
        where: { userId: req.userId },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: {id : true, title : true, isPublic: true, createdAt : true, updatedAt : true},
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


async function hasAccess(diagramId : string, ownerId : string, userId : string) {

   if (ownerId === userId) return true;

   const entry  = await prisma.diagramCollaborator.findUnique({
    where : {diagramId_userId : {diagramId, userId}},
    select : {id : true}
   })
   
   return entry !== null;
  
}

export async function getOneDiagram(req: authRequest, res: Response) {
  const id = req.params.id as string;
  const cacheKey = `diagram:${id}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      const diagram = JSON.parse(cached);

      if (!(await hasAccess(id, diagram.userId, req.userId as string))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.status(200).json(diagram);
    }

    const diagram = await prisma.diagram.findUnique({ where: { id } });

    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    if (!(await hasAccess(id, diagram.userId, req.userId as string))) {
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
    if (!(await hasAccess(id, existing.userId, req.userId as string))) {
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


const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const createInvite = async (req: authRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const diagramId = req.params.id as string;

    const diagram = await prisma.diagram.findFirst({
      where: { id: diagramId, userId: req.userId },
      select: { id: true },
    });

    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);

    await prisma.diagramInvite.create({
      data: { diagramId: diagram.id, tokenHash, createdBy: req.userId, expiresAt },
    });

    return res.status(201).json({ token, expiresAt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const acceptInvite = async (req: authRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = req.body?.token;

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(404).json({ error: "Invite not found or expired" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await prisma.diagramInvite.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      select: { diagramId: true, diagram: { select: { userId: true } } },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found or expired" });
    }

    if (invite.diagram.userId !== req.userId) {
      await prisma.diagramCollaborator.upsert({
        where: { diagramId_userId: { diagramId: invite.diagramId, userId: req.userId } },
        create: { diagramId: invite.diagramId, userId: req.userId },
        update: {},
      });
    }

    return res.status(200).json({ diagramId: invite.diagramId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export async function getSharedDiagrams(req: authRequest, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.userId;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;

  const where: Prisma.DiagramWhereInput = {
    collaborators: { some: { userId } },
  };

  try {
    const [diagrams, total] = await Promise.all([
      prisma.diagram.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip,
        select: { id: true, title: true, isPublic: true, createdAt: true, updatedAt: true },
      }),
      prisma.diagram.count({ where }),
    ]);

    return res.status(200).json({
      diagrams,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Something Went Wrong" });
  }
}

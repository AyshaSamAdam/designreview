import { Router } from "express"
import {acceptInvite, createDiagram, createInvite, getAllDiagrams, getOneDiagram, getPublicDiagram, getSharedDiagrams, togglePublic, updateDiagram} from "../controllers/diagramController.js"
import { validateDiagram, validateDiagramUpdate } from "../middleware/validateDiagram.js"
import { authenticate } from "../middleware/authenticate.js"


const router = Router();


 
router.post("/", authenticate, validateDiagram, createDiagram)   // create a diagram 
router.get("/", authenticate, getAllDiagrams )  // geta all diagrams
router.get("/shared", authenticate,  getSharedDiagrams)
router.get("/:id", authenticate , getOneDiagram)  // get one specific diagram   ( whatever text appears in thsi postion of the url capture it and make it avai;able to em as req.paramas.id)
router.patch("/:id" , authenticate, validateDiagramUpdate,  updateDiagram)  // update one specifuc diagram updating a diagram 
router.get("/public/:id", getPublicDiagram)
router.patch("/:id/publish", authenticate, togglePublic)      // LET THE USER MAKE THEIR DIAGRAM PUBLIC THROUGH THIS ROUTE               
router.post("/:id/invites", authenticate, createInvite)
router.post("/invites/accept" ,authenticate, acceptInvite)

export default router;
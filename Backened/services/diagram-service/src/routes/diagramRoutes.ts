import { Router } from "express"
import {createDiagram, getAllDiagrams, getOneDiagram, updateDiagram} from "../controllers/diagramController.js"
import { validateDiagram } from "../middleware/validatediagram.js"
import { authenticate } from "../middleware/authenticate.js"


const router = Router();


 
router.post("/", authenticate, validateDiagram, createDiagram)   // create a diagram 
router.get("/", authenticate, getAllDiagrams )  // geta la diagrams
router.get("/:id", authenticate , getOneDiagram)  // get one specific diagram   ( whatever text appears in thsi postion of the url capture it and make it avai;able to em as req.paramas.id)
router.patch("/:id" , authenticate, validateDiagram,  updateDiagram)  // update one specifuc diagram updating a diagram 


export default router;
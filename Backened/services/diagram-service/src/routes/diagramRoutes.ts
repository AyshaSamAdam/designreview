import { Router } from "express"
import {createDiagram} from "../controllers/diagramController.js"
import { validateDiagram } from "../middleware/validatediagram.js"
import { authenticate } from "../middleware/authenticate.js"


const router = Router();


 
router.post("/", authenticate, validateDiagram, createDiagram)


export default router;
import { Router } from "express";
import { getPrompt, listPrompts } from "../controllers/promptController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, listPrompts);
router.get("/:id", authenticate, getPrompt);

export default router;
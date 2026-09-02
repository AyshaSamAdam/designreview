import { Router } from "express";
import {signUp} from '../controllers/authController.js'
import { validateSignup } from "../middleware/validateSignUp.js";

const router = Router();

router.post("/signup", validateSignup, signUp)


export default router;
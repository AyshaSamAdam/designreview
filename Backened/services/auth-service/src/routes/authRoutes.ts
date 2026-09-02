import { Router } from "express";
import {logIn, signUp} from '../controllers/authController.js'
import { validateSignup } from "../middleware/validateSignUp.js";
import { validateLogin } from "../middleware/validateLogin.js";

const router = Router();



router.post("/signup", validateSignup, signUp)

router.post("/login", validateLogin, logIn)


export default router;
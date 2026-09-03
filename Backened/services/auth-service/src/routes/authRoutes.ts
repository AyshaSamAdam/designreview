import { Router } from "express";
import {logIn, signUp, refresh} from '../controllers/authController.js'
import { validateSignup } from "../middleware/validateSignUp.js";
import { validateLogin } from "../middleware/validateLogin.js";

const router = Router();



router.post("/signup", validateSignup, signUp)

router.post("/login", validateLogin, logIn)
router.post("/refresh", refresh)


export default router;
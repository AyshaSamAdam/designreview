import { Router } from "express";
import {logIn, signUp, refresh} from '../controllers/authController.js'
import { validateSignup } from "../middleware/validateSignUp.js";
import { validateLogin } from "../middleware/validateLogin.js";
import { authenticate, authRequest } from "../middleware/autheticate.js";
import { loginLimiter } from "../middleware/ratelimiter.js";

const router = Router();



router.post("/signup", validateSignup, signUp)

router.post("/login", loginLimiter, validateLogin, logIn)
router.post("/refresh", refresh)


router.get("/me" ,authenticate, (req : authRequest, res) => {
    res.json({userId : req.userId})
})

export default router;
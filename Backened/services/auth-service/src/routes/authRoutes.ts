import { Router } from "express";
import {logIn, signUp, refresh, logOut, getProfile, updateProfile} from '../controllers/authController.js'
import { validateSignup } from "../middleware/validateSignUp.js";
import { validateLogin } from "../middleware/validateLogin.js";
import { authenticate, authRequest } from "../middleware/autheticate.js";
import { loginLimiter } from "../middleware/ratelimiter.js";
import { validateUpdateProfile } from "../middleware/validateProfile.js";

const router = Router();



router.post("/signup", validateSignup, signUp)

router.post("/login", loginLimiter, validateLogin, logIn)
router.post("/refresh", refresh)
router.post("/logout", logOut)
router.get("/me", authenticate, getProfile) // get theprofile 
router.patch("/me", authenticate, validateUpdateProfile, updateProfile) // updta ethe profile




export default router;
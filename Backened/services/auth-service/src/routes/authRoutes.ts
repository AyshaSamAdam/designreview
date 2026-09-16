import { Router } from "express";
import {logIn, signUp, refresh, logOut, getProfile, updateProfile, forgotPassword, resetPassword, googleLogin, googleCallback} from '../controllers/authController.js'
import { validateSignup } from "../middleware/validateSignUp.js";
import { validateLogin } from "../middleware/validateLogin.js";
import { authenticate, authRequest } from "../middleware/autheticate.js";
import { loginLimiter } from "../middleware/ratelimiter.js";
import { validateUpdateProfile } from "../middleware/validateProfile.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import prisma from "../db.js";
import { validateForgotPassword, validateResetPassword } from "../middleware/validatePasswordReset.js";

const router = Router();



router.post("/signup", validateSignup, signUp)

router.post("/login", loginLimiter, validateLogin, logIn)
router.post("/refresh", refresh)
router.post("/logout", logOut)
router.get("/me", authenticate, getProfile) // get theprofile 
router.patch("/me", authenticate, validateUpdateProfile, updateProfile) // updta ethe profile
router.get("/admin/users", authenticate ,requireAdmin, async (req, res) => {
    const users = await prisma.user.findMany({
        select : {id : true, email : true, name : true, role : true, createdAt : true
        }
       
    });
     res.json(users)

})

router.post("/forgot-password", validateForgotPassword, forgotPassword)
router.post("/reset-password", validateResetPassword, resetPassword)
router.get("/google", googleLogin)
router.get("/google/callback", googleCallback)

export default router;
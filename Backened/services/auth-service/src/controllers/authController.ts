import { Request, Response } from "express"
import bcrypt from 'bcrypt'
import prisma from "../db.js"
import jwt  from "jsonwebtoken"
import  crypto from "crypto"
import { authRequest } from "../middleware/autheticate.js"
import { Resend } from "resend"
import { googleClient } from "../googleAuth.js"
const resend = new Resend(process.env.RESEND_API_KEY)



export async function signUp(req: Request, res: Response) {

    const { email, password, name } = req.body

    try {
        const passwordHash = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data : {email, passwordHash, name},
        });


       return res.status(201).json({
            id : user.id,
            email : user.email,
            name : user.name
        })

    }
    catch (err: any) {

        if (err.code === "P2002") {
            return res.status(409).json({
                error : "Email already In Use"
            })
        }



        console.log(err)
        res.status(500).json({
            error : "Something Went Wrong"
        })
    }
}


export async function logIn(req : Request, res : Response) {

    const { email, password} = req.body


    try {
         const user = await prisma.user.findUnique({ where : {email}})

         if ( !user || !user.passwordHash) {
            return res.status(401).json({
                error : "Invalid Email or Password"
            })
         }


         if (user.lockedUntil && user.lockedUntil > new Date()) {
            return res.status(423).json({
                error : "Account temporarily locked due to too many failed attempts. Try again later."
            })
         }

         const passwordMatches = await bcrypt.compare(password, user.passwordHash);

         if (!passwordMatches) {
            const attempts = user.failedLoginAttempts + 1;
            const shouldLock = attempts >=5 ;

            await prisma.user.update({
                where : {id : user.id},
                data : {
                    failedLoginAttempts : attempts,
                    lockedUntil : shouldLock ? new Date(Date.now() + 15 * 60  * 1000) : null,
                }
            })
            return res.status(401).json({
                error : "Invalid Email or Password"
            })
         }
  

         // if he got it correct password like in 2 or 3 or 4 attempt just take evrything back to normal  REST BACK EVERYTHING TO 0 WHEN THEY GET THE PASSWORD RIGHT 

         await prisma.user.update({
            where : {id : user.id},
            data : {failedLoginAttempts : 0, lockedUntil : null}
         })

       const accessToken  = jwt.sign({userId : user.id}, process.env.JWT_SECRET as string, {expiresIn : "15m"})

        const refreshTokenValue = crypto.randomBytes(40).toString("hex")
        const refreshTokenExpiry = new Date (Date.now() +  7 * 24 * 60 * 60 * 1000);

        await prisma.refreshToken.create({
          data : {
            token :  refreshTokenValue,
            userId : user.id,
            expiresAt : refreshTokenExpiry
          }
        })

         return res.status(200).json({
            accessToken ,
            refreshToken : refreshTokenValue,
            user : {id : user.id, email : user.email, name : user.name}
         })

       
    }
    catch(err) {
        console.log(err)
        return res.status(500).json({error : "Something went wrong"})

    }
    
}


export async function refresh(req : Request, res : Response) {
    if (!req.body || !req.body.refreshToken) {
        return res.status(400).json({error : "Refresh token required in request body"})
    }
    const {refreshToken} = req.body

    if ( !refreshToken) {
        return res.status(401).json({
            error : "Refresh token required"
        })
    }

    try{

        const storedToken = await prisma.refreshToken.findUnique({
            where : {token :refreshToken }
        })


        if (!storedToken || storedToken.expiresAt < new Date()) {
            return res.status(401).json({error : "Invalid or expired refresh token "})
        }
        await prisma.refreshToken.delete({
            where : {id : storedToken.id}
        })
        const newAccessToken = jwt.sign(
            {userId : storedToken.userId},
            process.env.JWT_SECRET as string,
            {expiresIn : "15m"}
        
        );

        const newRefreshTokenValue = crypto.randomBytes(40).toString("hex");
        const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);


        await prisma.refreshToken.create({
            data : {
                token : newRefreshTokenValue,
                userId : storedToken.userId,
                expiresAt : newRefreshTokenExpiry
            }
        })

        return res.status(200).json({
         accessToken : newAccessToken,
         refreshToken : newRefreshTokenValue
        })

    }
    catch(error) {
        console.log(error)
        return res.status(500).json({error : "Something went Wrong"})
    }
}

export async function logOut(req : Request, res : Response) {
    const { refreshToken} = req.body;

    if (!refreshToken) {
        return res.status(400).json({error : "Refresh token required"})
    }
    try{

        await prisma.refreshToken.deleteMany(
            {where : {token : refreshToken}}
        )

        return res.status(200).json({message : "Logged Out succesfully !"})


    }
    catch(error) {
        console.log(error)
        return res.status(500).json({error : "Something Went Wrong"})

    }
    
}

export async function getProfile(req : authRequest, res : Response) {
    try {
        const user = await prisma.user.findUnique({
            where : {id : req.userId},
            select : {
                id : true,
                email : true,
                name  : true,
                createdAt : true
            }
        })

        if (!user) {
            return res.status(404).json({
                error : "User not Found"
            })
        }

            return res.status(200).json(user)
    }  
    
    catch(error ) {
        console.log(error)
        
            return res.status(500).json({error : "Something Went Wrong"})

    }
} 
   

export async function updateProfile(req : authRequest, res : Response) {
    const {name } = req.body

    try{
        const user = await prisma.user.update({
            where : {id : req.userId},
            data :{name},
            select : {
                id : true,
                email : true,
                name : true,
                createdAt : true
            }
        })

        return res.status(200).json(user)


    }
    catch(error) {
        console.log(error)
        return res.status(500).json({
            error  : "Something Went Wrong"
        })
    }
    
}


export async function forgotPassword(req : Request, res : Response) {

    const { email } = req.body

    try {
          const user = await prisma.user.findUnique({where : {email}})

          if( user) {
            const resetToken =  crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hr 


            await prisma.passwordResetToken.create({
                data : {token : resetToken, userId : user.id, expiresAt}
            })


            await  resend.emails.send({
                from : "onboarding@resend.dev",
                to : email,
                subject : " Reset Your DesignReview password",
                html : `<p> Click to reset your password : <a href="http://localhost:3000/reset-password?token=${resetToken}"> Reset Password </a></p>  <p> This link expires in 1 hour. </p>`

            })
          }

          return res.status(200).json({
            message : "If an account exists with taht email, a reset link has been sent. ",

          })


    } 
    catch(err) {
        console.log(err)
        return res.status(500).json({ error : "Something went wrong"})
    }
}

export async function resetPassword( req : Request, res : Response) {
    const { token , newPassword} = req.body
  

    try {
        const resetToken = await prisma.passwordResetToken.findUnique({ where : {token} })
        
    
        if (!resetToken || resetToken.expiresAt < new Date()) {
            return res.status(400).json({ error : "Invalid or expired reset token "})
        }

        const passwordHash = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where : {id : resetToken.userId},
            data : {passwordHash}
        })
  
        await prisma.passwordResetToken.delete({where : {id : resetToken.id}})

        await prisma.refreshToken.deleteMany({where : {userId : resetToken.userId}})


        return res.status(200).json({
            message : "Password reset Succesfully !"
        })

    }
    catch(err) {
        console.log(err)
        return res.status(500).json({ error : "Something went Wrong "})
    }
}


// REAL GOOGLE LOGIN SCREEN APPEARED AFTE RTHIS CONTROLLER WORKS  
export async function googleLogin(req : Request, res : Response) {
    const authorizedUrl = googleClient.generateAuthUrl({
        access_type : "offline",
        scope : ["profile", "email"]
    });
    res.redirect(authorizedUrl)
    
}

//  cALLback 
export async function googleCallback(req: Request, res: Response) {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({ error: "No authorization code provided" });
  }

  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token as string,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Could not retrieve profile from Google" });
    }

    let user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || "Google User",
          googleId: payload.sub,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: "15m" });

    const refreshTokenValue = crypto.randomBytes(40).toString("hex");
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId: user.id, expiresAt: refreshTokenExpiry },
    });

    return res.status(200).json({
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
}


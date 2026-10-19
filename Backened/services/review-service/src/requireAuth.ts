import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined
    const token = req.cookies?.access_token ?? bearer

    if (!token) {
        return res.status(401).json({ error: "Login required" })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string, {
            algorithms: ["HS256"],
        }) as { userId: string }
        res.locals.userId = payload.userId
        next()
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" })
    }
}      
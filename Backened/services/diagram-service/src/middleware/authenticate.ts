import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"


export interface authRequest extends Request {
    userId?: string;
}
export function authenticate(req: authRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.access_token ??  (header && header.startsWith("Bearer ") ? header.split(" ")[1] : undefined)

  if (!token ) {
    return res.status(401).json({ error: "No token provided" });
  }

 
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
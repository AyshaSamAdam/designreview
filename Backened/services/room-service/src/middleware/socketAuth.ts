import { Socket } from "socket.io";
import jwt from "jsonwebtoken"


export async function socketAuth(socket : Socket, next : (err? : Error) => void) {
     
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("No token provided"))
    }

    try{

        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {userId : string}
        socket.data.userId  =   payload.userId
        next()
    }
    catch(err) {
        next(new Error("Invalid or expired token"))
    }
}
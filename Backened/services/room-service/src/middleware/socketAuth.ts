import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { parse  as parseCookie} from "cookie";


export function socketAuth(socket: Socket, next: (err?: Error) => void) {


  const cookies = parseCookie(socket.handshake.headers.cookie ?? "");
  const token = cookies.access_token ?? socket.handshake.auth.token;

  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; name?: string};
    socket.data.userId = payload.userId;
    socket.data.name = payload.name?.trim().slice(0, 60) || "Someone"
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
}
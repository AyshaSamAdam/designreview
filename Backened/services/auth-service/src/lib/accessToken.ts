import jwt from "jsonwebtoken";

// TO SHOW NAME ON ROOM PAGE CIRCLE S]LIEK AS KR SO WE ATTACH NAM EAND USERID BOTH WHEN CRETAING ACCESSTOKEN BEFORE ONL USERID 
export function signAccessToken(user: { id: string; name: string | null }) {
  return jwt.sign(
    { userId: user.id, name: user.name ?? "" },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" }
  );
}
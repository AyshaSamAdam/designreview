import {OAuth2Client} from "google-auth-library"


export const googleClient =  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:4001/auth/google/callback"
)
import { OAuth2Client } from "google-auth-library"

const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:4001/auth/google/callback"

export const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
)
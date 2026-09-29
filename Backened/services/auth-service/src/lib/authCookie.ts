import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

const base = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", base);
  res.clearCookie("refresh_token", base);
}

export function setOauthStateCookie(res : Response, state : string) {
    res.cookie("oauth_state", state, {...base, path : "/auth/google", maxAge: 10 * 60 * 1000})
}

export function clearOauthStateCookie(res : Response) {
    res.clearCookie("oauth_state", {...base, path :"/auth/google"})
}
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/room", "/admin", "/prompts"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const hasSession =
    request.cookies.has("access_token") || request.cookies.has("refresh_token");

    //  if they dont have any cookies and wanna go / dashboard or / room or /admin redirect them to sign in 
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
//   or cookie exists and  NextResponse.next() which means carr on 

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/room/:path*", "/admin/:path*", "/prompts/:path*"],
};


import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isRootPage = pathname === "/";
  const isPublic = isAuthPage || isRootPage || pathname.startsWith("/api/auth");

  // Logged-in users hitting root or auth pages → redirect to dashboard
  if (isLoggedIn && (isAuthPage || isRootPage)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Logged-out users hitting protected routes → redirect to sign-in
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)" ],
};

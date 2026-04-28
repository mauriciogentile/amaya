export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all app routes
    "/(app)/:path*",
    "/dashboard/:path*",
    "/programs/:path*",
    "/library/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/workout/:path*",
    "/exercises/:path*",
    // Run on sign-in and root so we can redirect logged-in users
    "/sign-in",
    "/sign-up",
    "/",
  ],
};

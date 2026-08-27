import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed Middleware → Proxy (same job: runs before each request).
// clerkMiddleware() makes the Clerk session available to Server Components and
// Server Actions via auth()/currentUser(), and keeps session cookies fresh.
export default clerkMiddleware();

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

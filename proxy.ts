import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next.js 16 renamed Middleware → Proxy (same job: runs before each request).
// clerkMiddleware() makes the Clerk session available to Server Components and
// Server Actions via auth()/currentUser(), and keeps session cookies fresh.
//
// Also stamps the current path onto a response header: Server Components have
// no built-in way to read the request pathname, and app/patient/layout.tsx
// needs it to gate incomplete-onboarding patients to /patient/onboarding
// without looping when they're already there.
export default clerkMiddleware((_auth, req) => {
  // Must be set on the *request* headers (not just the response) — only
  // request headers are forwarded into the Server Component render, which is
  // where app/patient/layout.tsx reads x-pathname via headers(). Setting it
  // only on the outgoing response (the previous version of this file) meant
  // that read always came back empty, so the onboarding gate could never
  // tell it was already on /patient/onboarding.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

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

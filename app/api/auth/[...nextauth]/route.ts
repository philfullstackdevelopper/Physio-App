// NOT YET WIRED INTO THE LIVE APP (Scalingo migration, Phase 2).
//
// Temporarily stubbed out (2026-09-11): importing `@/auth` here made Next.js
// crash the whole build ("Cannot destructure property 'GET' of 'n.handlers'
// as it is undefined") — something in auth.ts's import chain (likely
// lib/db/pool.ts opening a real Postgres pool at module scope) throws during
// Next's page-data collection, well before this scaffold is ever meant to
// run. Reverting to `export const { GET, POST } = handlers` from "@/auth"
// is the fix once Phase 2 actually resumes and that chain is made safe to
// import at build time.
export async function GET() {
  return new Response("Not implemented", { status: 501 });
}

export async function POST() {
  return new Response("Not implemented", { status: 501 });
}

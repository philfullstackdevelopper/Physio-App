import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { withUserContext } from "@/lib/db/withUserContext";
import { verifyPassword } from "@/lib/auth/password";

// NOT YET WIRED INTO THE LIVE APP (Scalingo migration, Phase 2). Replaces
// Supabase Auth. JWT session strategy — Credentials providers can't use
// Auth.js's database-session strategy, and this also drops the DB round-trip
// lib/supabase/middleware.ts made on every request today.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Normal email + password login (app/login/actions.ts).
    Credentials({
      id: "password",
      name: "Mot de passe",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // auth_service, not authenticated: nobody is logged in yet, so the
        // normal "own row" policy on auth.users would (correctly) refuse a
        // lookup by email. See migration 0017 section 4 for why this
        // narrow exception exists.
        return withUserContext(
          null,
          async (client) => {
            const { rows } = await client.query(
              `select id, email, password_hash, role from auth.users where email = $1`,
              [email],
            );
            const user = rows[0];
            if (!user?.password_hash) return null;
            const valid = await verifyPassword(password, user.password_hash);
            if (!valid) return null;
            return { id: user.id as string, email: user.email as string, role: user.role as string };
          },
          "auth_service",
        );
      },
    }),
    // One-time invite/reset/confirm links (app/auth/confirm/actions.ts),
    // e.g. /auth/confirm?token_hash=...&type=reset — same URL contract the
    // app already uses today. Consuming the token here (and marking it
    // used) is what lets the holder reach /auth/set-password already
    // "logged in enough" to set their password, exactly like today.
    Credentials({
      id: "token",
      name: "Lien",
      credentials: { token_hash: {}, type: {} },
      async authorize(creds) {
        const tokenHash = String(creds?.token_hash ?? "");
        const type = String(creds?.type ?? "");
        if (!tokenHash || !type) return null;

        return withUserContext(
          null,
          async (client) => {
            const { rows } = await client.query(
              `select t.user_id, t.expires_at, t.used_at, u.email, u.role
               from public.auth_tokens t
               join auth.users u on u.id = t.user_id
               where t.token_hash = $1 and t.type = $2`,
              [tokenHash, type],
            );
            const token = rows[0];
            if (!token || token.used_at) return null;
            if (new Date(token.expires_at as string) < new Date()) return null;

            await client.query(
              `update public.auth_tokens set used_at = now() where token_hash = $1`,
              [tokenHash],
            );
            return {
              id: token.user_id as string,
              email: token.email as string,
              role: token.role as string,
            };
          },
          "auth_service",
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string; role?: string }).id =
          token.id as string;
        (session.user as typeof session.user & { id: string; role?: string }).role =
          token.role as string | undefined;
      }
      return session;
    },
  },
});

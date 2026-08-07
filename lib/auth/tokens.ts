import { randomBytes, createHash } from "node:crypto";

// NOT YET WIRED INTO THE LIVE APP (Scalingo migration, Phase 2).
//
// Backs invite/reset/confirm links, e.g. /auth/confirm?token_hash=...&type=reset
// (same URL contract app/auth/confirm already uses today, kept on purpose).
// Only the hash goes to the database (public.auth_tokens.token_hash) — the
// raw token exists only in the URL sent by email, never stored anywhere.
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

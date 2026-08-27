import { auth, clerkClient } from "@clerk/nextjs/server";

/** Revokes the current Clerk session, if any. Shared by every sign-out path
 *  (plain sign-out, account deletion) so the revoke logic exists once instead
 *  of being hand-copied per caller. */
export async function revokeCurrentSession(): Promise<void> {
  const { sessionId } = await auth();
  if (sessionId) {
    const client = await clerkClient();
    await client.sessions.revokeSession(sessionId);
  }
}

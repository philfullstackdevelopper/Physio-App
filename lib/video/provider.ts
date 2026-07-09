// Swappable video-provider layer. Today it targets Jitsi (open source) via a
// configurable domain: default `meet.jit.si` for development. For production we
// point NEXT_PUBLIC_JITSI_DOMAIN at a SELF-HOSTED Jitsi on HDS-certified EU
// infrastructure — same code, only the domain changes, so no rewrite is needed
// to reach compliance. Swapping to another provider means replacing this file.

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

/** Full URL of a room, used both to embed the call and to open it in a new tab. */
export function roomUrl(roomName: string): string {
  return `https://${JITSI_DOMAIN}/${encodeURIComponent(roomName)}`;
}

/** A fresh, hard-to-guess room name for a new call. */
export function newRoomName(): string {
  return `physioapp-${crypto.randomUUID()}`;
}

// Chemin de retour (?next=…) : n'accepter qu'une page DE CE SITE.
// `startsWith("/") && !startsWith("//")` ne suffisait pas (audit du
// 2026-10-08) : « /\evil.com » passait, et le navigateur le lit comme
// https://evil.com — un lien piégé pouvait renvoyer vers un faux site.

const BASE = "https://easyphysio.invalid";

export function safeInternalPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Barre oblique inversée ou caractère de contrôle : jamais dans un vrai chemin du site.
  if (/[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

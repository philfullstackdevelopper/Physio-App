// =============================================================================
// Shared "what kind of link is this" detection for exercise demo media, so a
// YouTube link renders as a playable embed everywhere it appears (guided
// session, exercise management) instead of only in one of those places.
// =============================================================================

/** Extracts the 11-character video id from a youtu.be/youtube.com link, or
 *  null if the URL isn't a recognizable YouTube link. */
export function getYoutubeEmbedId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? match[1] : null;
}

export function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(url);
}

export function isImageFileUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(url);
}

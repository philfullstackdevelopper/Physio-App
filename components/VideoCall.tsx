"use client";

import { roomUrl } from "@/lib/video/provider";

// Embeds the live video room. Uses the swappable provider's room URL. If the
// embed is blocked (some public Jitsi instances restrict iframing), the user can
// open the same room in a new tab.
export default function VideoCall({
  roomName,
  displayName,
}: {
  roomName: string;
  displayName?: string;
}) {
  const base = roomUrl(roomName);
  const embedUrl = displayName
    ? `${base}#userInfo.displayName=%22${encodeURIComponent(displayName)}%22&config.prejoinPageEnabled=false`
    : base;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
        <iframe
          src={embedUrl}
          title="Appel télésoin"
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <a
        href={base}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm font-medium text-teal-700 hover:underline"
      >
        L&apos;appel ne s&apos;affiche pas ? Ouvrir dans un nouvel onglet ↗
      </a>
    </div>
  );
}

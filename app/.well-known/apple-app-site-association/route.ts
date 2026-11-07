import { NextResponse } from "next/server";
import { APP_BUNDLE_ID, APP_LINK_PATHS } from "@/lib/app/appLinks";

// Fichier lu par l'iPhone pour ouvrir les liens easyphysio.fr dans l'appli
// (voir lib/app/appLinks.ts).
export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  if (!team) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${team}.${APP_BUNDLE_ID}`],
            components: APP_LINK_PATHS.map((path) => ({ "/": path })),
          },
        ],
      },
      webcredentials: { apps: [`${team}.${APP_BUNDLE_ID}`] },
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

import { NextResponse } from "next/server";
import { APP_BUNDLE_ID } from "@/lib/app/appLinks";

// Fichier lu par Android pour ouvrir les liens easyphysio.fr dans l'appli
// (voir lib/app/appLinks.ts).
export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (prints.length === 0) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: APP_BUNDLE_ID, sha256_cert_fingerprints: prints },
      },
    ],
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

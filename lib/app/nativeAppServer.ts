import "server-only";
import { headers } from "next/headers";
import { nativePlatformFromUserAgent, type NativePlatform } from "./nativeApp";

/** Plateforme de l'appli mobile qui affiche cette page, ou null dans un navigateur. */
export async function nativeAppPlatform(): Promise<NativePlatform | null> {
  return nativePlatformFromUserAgent((await headers()).get("user-agent"));
}

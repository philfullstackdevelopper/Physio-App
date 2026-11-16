"use client";

import { useEffect } from "react";
import { startCatchingInstallPrompt } from "@/lib/pwa/installPrompt";

// Monté une fois dans app/layout.tsx : attrape la proposition d'installation
// d'Android dès le chargement du site (voir lib/pwa/installPrompt.ts).
export default function InstallPromptCatcher() {
  useEffect(() => startCatchingInstallPrompt(), []);
  return null;
}

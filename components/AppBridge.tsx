"use client";

// Passerelle entre le site et l'appli mobile (dossier mobile/, Philippe,
// 2026-11-07). Dans un navigateur ordinaire, ce composant ne fait rien.
// Dans l'appli :
//   - il annonce à l'appli que la page est prête ; l'appli répond avec le
//     jeton de notifications du téléphone (événement « ep-native ») ;
//   - connecté : il enregistre ce jeton pour le compte (/api/push/register) ;
//   - déconnecté (quel que soit le bouton utilisé) : il le retire
//     (/api/push/unregister), pour que ce téléphone ne reçoive plus rien.

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type NativeBridge = { postMessage: (message: string) => void };
type NativeEvent = { type: "push-token"; token: string; platform: "ios" | "android" };

declare global {
  interface Window {
    ReactNativeWebView?: NativeBridge;
  }
}

const STORAGE_KEY = "ep-push-token";

export default function AppBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const [push, setPush] = useState<{ token: string; platform: "ios" | "android" } | null>(null);

  useEffect(() => {
    const bridge = window.ReactNativeWebView;
    if (!bridge) return;
    const onNative = (e: Event) => {
      const detail = (e as CustomEvent<NativeEvent>).detail;
      if (detail?.type === "push-token" && detail.token) setPush({ token: detail.token, platform: detail.platform });
    };
    window.addEventListener("ep-native", onNative);
    bridge.postMessage(JSON.stringify({ type: "ready", path: window.location.pathname }));
    return () => window.removeEventListener("ep-native", onNative);
  }, []);

  useEffect(() => {
    if (!push || !isLoaded) return;
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : on renvoie simplement */
    }
    const state = `${isSignedIn ? "in" : "out"}:${push.token}`;
    if (last === state) return;
    const url = isSignedIn ? "/api/push/register" : "/api/push/unregister";
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: push.token, platform: push.platform }),
    })
      .then((res) => {
        if (res.ok) {
          try {
            sessionStorage.setItem(STORAGE_KEY, state);
          } catch {
            /* rien */
          }
        }
      })
      .catch(() => {
        /* hors connexion : on réessaiera à la prochaine page */
      });
  }, [push, isLoaded, isSignedIn]);

  return null;
}

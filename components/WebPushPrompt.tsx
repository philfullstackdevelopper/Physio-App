"use client";

// Notifications du site installé sur l'écran d'accueil (Philippe, 2026-11-16).
// Ne fait rien dans un navigateur ordinaire, ni dans l'appli mobile (qui a ses
// propres notifications, components/AppBridge.tsx). Dans le site installé :
//   - connecté, notifications pas encore demandées : petit bandeau « Activer »
//     (l'iPhone exige que la demande parte d'un geste de la personne) ;
//   - autorisées : abonne ce téléphone et l'enregistre pour le compte
//     (/api/push/register, plateforme « web », migration 0092) ;
//   - déconnexion : désabonne ce téléphone (/api/push/unregister).

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Bell, X } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const SENT_KEY = "ep-web-push";
const LATER_KEY = "ep-web-push-later";
const LATER_DAYS = 7;

function supported(): boolean {
  if (typeof window === "undefined" || !VAPID_PUBLIC_KEY) return false;
  if ((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function storage(kind: "session" | "local", key: string, value?: string): string | null {
  try {
    const s = kind === "session" ? sessionStorage : localStorage;
    if (value === undefined) return s.getItem(key);
    s.setItem(key, value);
  } catch {
    /* stockage indisponible : sans conséquence */
  }
  return null;
}

async function subscribeAndRegister(): Promise<boolean> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  if (storage("session", SENT_KEY) === json.endpoint) return true;
  const res = await fetch("/api/push/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ platform: "web", subscription: json }),
  });
  if (res.ok && json.endpoint) storage("session", SENT_KEY, json.endpoint);
  return res.ok;
}

export default function WebPushPrompt() {
  const t = useTranslations("common.webPush");
  const { isLoaded, isSignedIn } = useAuth();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoaded || !supported()) return;
    if (!isSignedIn) {
      // Déconnecté : ce téléphone ne doit plus recevoir les notifications du compte.
      setAsk(false);
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) return;
        const json = sub.toJSON();
        await sub.unsubscribe().catch(() => {});
        storage("session", SENT_KEY, "");
        fetch("/api/push/unregister", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ platform: "web", subscription: json }),
        }).catch(() => {});
      });
      return;
    }
    if (Notification.permission === "granted") {
      subscribeAndRegister().catch((e) => console.warn("[push] abonnement impossible", e));
    } else if (Notification.permission === "default") {
      const later = Number(storage("local", LATER_KEY) ?? 0);
      if (Date.now() - later > LATER_DAYS * 86_400_000) setAsk(true);
    }
  }, [isLoaded, isSignedIn]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") await subscribeAndRegister();
    } catch (e) {
      console.warn("[push] activation impossible", e);
    } finally {
      setBusy(false);
      setAsk(false);
    }
  }, []);

  if (!ask) return null;
  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed inset-x-3 z-50 mx-auto max-w-sm rounded-2xl border border-line bg-surface p-3 shadow-soft bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Bell className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t("title")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("text")}</p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={enable}
              className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {t("enable")}
            </button>
            <button
              type="button"
              onClick={() => {
                storage("local", LATER_KEY, String(Date.now()));
                setAsk(false);
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              {t("later")}
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("later")}
          onClick={() => {
            storage("local", LATER_KEY, String(Date.now()));
            setAsk(false);
          }}
          className="text-muted hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

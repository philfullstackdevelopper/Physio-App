// Installation de l'appli sur l'écran d'accueil (Philippe, 2026-11-16).
//
// Android / Chrome envoie UNE seule fois par chargement de page l'événement
// « beforeinstallprompt », souvent avant que la personne n'arrive sur la page
// où se trouve le bouton. On l'attrape donc dès le chargement du site
// (InstallPromptCatcher, monté dans app/layout.tsx) et on le garde ici, dans
// une variable partagée par toutes les pages.
//
// L'iPhone n'a pas cet événement : Apple ne permet pas d'installer depuis un
// bouton. Le bouton y affiche donc les deux gestes à faire dans Safari.

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

let started = false;
export function startCatchingInstallPrompt() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde la main : c'est notre bouton qui l'ouvrira
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallState = "installed" | "prompt" | "ios" | "manual";

/** Déjà ouverte depuis l'icône de l'écran d'accueil ? */
function runningAsApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac : on les reconnaît au tactile.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function getInstallState(): InstallState {
  if (installed || runningAsApp()) return "installed";
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  return "manual";
}

/** Ouvre la fenêtre d'installation d'Android. Renvoie true si acceptée. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null; // l'événement ne sert qu'une fois
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
  return outcome === "accepted";
}

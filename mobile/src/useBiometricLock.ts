import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { LOCK_AFTER_MS } from "./config";

// Verrouillage par Face ID / empreinte (données de santé) : au lancement, puis
// après LOCK_AFTER_MS en arrière-plan. Seulement si le téléphone a Face ID ou
// une empreinte enregistrée ; sinon l'appli ne se verrouille pas. Le code du
// téléphone reste accepté en secours.
export function useBiometricLock() {
  const [available, setAvailable] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const ok = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      setAvailable(ok);
      if (ok) setLocked(true);
    })();
  }, []);

  useEffect(() => {
    if (!available) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") backgroundAt.current = Date.now();
      if (state === "active" && backgroundAt.current && Date.now() - backgroundAt.current > LOCK_AFTER_MS) setLocked(true);
      if (state === "active") backgroundAt.current = null;
    });
    return () => sub.remove();
  }, [available]);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Déverrouiller EasyPhysio",
      cancelLabel: "Annuler",
      fallbackLabel: "Utiliser le code",
    });
    if (res.success) setLocked(false);
  }, []);

  return { locked: available && locked, unlock };
}

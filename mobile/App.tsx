import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { BackHandler, Linking, Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { START_URL, USER_AGENT_MARK } from "./src/config";
import { opensInApp, toSiteUrl } from "./src/links";
import { getPushToken, notificationUrl } from "./src/push";
import { useBiometricLock } from "./src/useBiometricLock";
import { LockScreen, OfflineScreen } from "./src/Screens";

// Appli EasyPhysio : le site easyphysio.fr, mêmes écrans téléphone, dans une
// vraie appli (voir src/config.ts et README.md).

SplashScreen.preventAutoHideAsync().catch(() => {});

const USER_AGENT = `${USER_AGENT_MARK}/${Application.nativeApplicationVersion ?? "1.0.0"} (${Platform.OS})`;

function Shell() {
  const webRef = useRef<ComponentRef<typeof WebView>>(null);
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState(START_URL);
  const [offline, setOffline] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const pushToken = useRef<string | null>(null);
  const askedPush = useRef(false);
  const { locked, unlock } = useBiometricLock();

  const open = useCallback((raw: string | null | undefined) => {
    const target = toSiteUrl(raw);
    if (target) setUrl(`${target}${target.includes("?") ? "&" : "?"}_=${Date.now()}`);
  }, []);

  // Lien d'invitation / QR code (« universal link ») qui a ouvert l'appli, et
  // notification touchée alors que l'appli était fermée.
  useEffect(() => {
    Linking.getInitialURL().then(open);
    Notifications.getLastNotificationResponseAsync().then((r) => open(notificationUrl(r)));
    const linkSub = Linking.addEventListener("url", (e) => open(e.url));
    const notifSub = Notifications.addNotificationResponseReceivedListener((r) => open(notificationUrl(r)));
    return () => {
      linkSub.remove();
      notifSub.remove();
    };
  }, [open]);

  // Hors connexion : écran natif (le bouton « Réessayer » recharge la page).
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        if (s.isConnected === false) setOffline(true);
      }),
    [],
  );

  // Bouton « retour » d'Android : page précédente du site.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const sendTokenToPage = useCallback(() => {
    if (!pushToken.current) return;
    const detail = JSON.stringify({ type: "push-token", token: pushToken.current, platform: Platform.OS });
    webRef.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent("ep-native",{detail:${detail}}));true;`);
  }, []);

  // Messages du site (components/AppBridge.tsx).
  const onMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      let msg: { type?: string; path?: string } = {};
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type !== "ready") return;
      // Autorisation des notifications demandée une fois, quand la personne est
      // dans son espace (pas sur la page de connexion).
      if (!pushToken.current && !askedPush.current && /^\/(patient|dashboard)/.test(msg.path ?? "")) {
        askedPush.current = true;
        pushToken.current = await getPushToken();
      }
      sendTokenToPage();
    },
    [sendTokenToPage],
  );

  // Liens hors du site (Stripe, Google, documentation…) : navigateur du téléphone.
  const onShouldStart = useCallback((req: WebViewNavigation & { isTopFrame?: boolean }) => {
    if (req.isTopFrame === false) return true;
    if (opensInApp(req.url)) return true;
    if (/^(mailto|tel|sms):/.test(req.url)) Linking.openURL(req.url).catch(() => {});
    else WebBrowser.openBrowserAsync(req.url).catch(() => {});
    return false;
  }, []);

  const retry = useCallback(() => {
    setOffline(false);
    webRef.current?.reload();
  }, []);

  return (
    <View style={[styles.root, Platform.OS === "android" && { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      <WebView
        ref={webRef}
        source={{ uri: url }}
        applicationNameForUserAgent={USER_AGENT}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStart}
        onOpenWindow={(e: { nativeEvent: { targetUrl: string } }) => {
          const target = e.nativeEvent.targetUrl;
          if (opensInApp(target)) setUrl(target);
          else WebBrowser.openBrowserAsync(target).catch(() => {});
        }}
        onNavigationStateChange={(s: WebViewNavigation) => setCanGoBack(s.canGoBack)}
        onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
        onError={() => {
          setOffline(true);
          SplashScreen.hideAsync().catch(() => {});
        }}
        // Session (Clerk) conservée entre deux ouvertures de l'appli.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        // Vidéos d'exercices lues dans la page, sans plein écran forcé.
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        // Le site gère lui-même les marges des encoches (env(safe-area-inset-*)).
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        pullToRefreshEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        // Envoi de photos / vidéos (exercices filmés par le kiné).
        mediaCapturePermissionGrantType="prompt"
        style={styles.web}
      />
      {offline && <OfflineScreen onRetry={retry} />}
      {locked && <LockScreen onUnlock={unlock} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f7fb" },
  web: { flex: 1, backgroundColor: "#f5f7fb" },
});

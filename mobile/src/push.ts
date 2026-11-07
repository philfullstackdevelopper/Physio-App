import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Notifications : nouveau message (kiné ⇄ patient) et rappel de séance. Le
// téléphone obtient un « jeton » auprès d'Expo ; l'appli le transmet au site,
// qui l'enregistre pour la personne connectée (components/AppBridge.tsx →
// /api/push/register). Le contenu des messages n'est jamais affiché dans la
// notification (données de santé sur l'écran verrouillé).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Demande l'autorisation (une seule fois) et renvoie le jeton du téléphone, ou null. */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulateur : pas de notifications
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "EasyPhysio",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null; // « eas init » pas encore fait
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Page à ouvrir quand on touche une notification. */
export function notificationUrl(response: Notifications.NotificationResponse | null): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === "string" ? url : null;
}

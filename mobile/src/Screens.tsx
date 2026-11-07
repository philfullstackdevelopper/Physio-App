import { Image, Pressable, StyleSheet, Text, View } from "react-native";

// Écrans natifs de l'appli, aux couleurs du site (app/globals.css) : hors
// connexion, et verrouillé (Face ID / empreinte).

const COLORS = { bg: "#f5f7fb", ink: "#0f172a", muted: "#64748b", brand: "#155dfc", surface: "#ffffff" };

function Card({ title, text, action, onPress }: { title: string; text: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Card
      title="Pas de connexion"
      text="EasyPhysio a besoin d'Internet pour afficher votre programme. Vérifiez votre Wi-Fi ou vos données mobiles."
      action="Réessayer"
      onPress={onRetry}
    />
  );
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <Card
      title="EasyPhysio est verrouillé"
      text="Vos données de santé sont protégées. Déverrouillez avec Face ID, votre empreinte ou le code du téléphone."
      action="Déverrouiller"
      onPress={onUnlock}
    />
  );
}

const styles = StyleSheet.create({
  page: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: "center" },
  logo: { width: 56, height: 56, borderRadius: 14, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "600", color: COLORS.ink, textAlign: "center" },
  text: { marginTop: 8, fontSize: 15, lineHeight: 21, color: COLORS.muted, textAlign: "center" },
  button: { marginTop: 20, backgroundColor: COLORS.brand, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 28 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});

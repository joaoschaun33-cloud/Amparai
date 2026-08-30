import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

export default function Landing() {
  const { loginWithGoogle, loading, user } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setBusy(true);
    try {
      await loginWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  if (loading || user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="landing-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="heart" size={22} color={colors.onBrand} />
          </View>
          <Text style={styles.brand}>Amparai</Text>
        </View>

        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/hero.webp")}
            style={styles.heroImage}
            contentFit="cover"
          />
        </View>

        <Text style={styles.title}>Quem ama,{"\n"}ampara.</Text>
        <Text style={styles.subtitle}>
          Um lugar calmo para a família organizar o cuidado de quem ama.
        </Text>

        <View style={styles.pillars}>
          <View style={styles.pillar}>
            <View style={[styles.pillarIcon, { backgroundColor: colors.olive }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.onOlive} />
            </View>
            <Text style={styles.pillarText}>Agir — emergência a um toque e informações importantes reunidas.</Text>
          </View>
          <View style={styles.pillar}>
            <View style={[styles.pillarIcon, { backgroundColor: colors.brand }]}>
              <Ionicons name="people" size={18} color={colors.onBrand} />
            </View>
            <Text style={styles.pillarText}>Organizar — escala, remédios, saúde e custos.</Text>
          </View>
          <View style={styles.pillar}>
            <View style={[styles.pillarIcon, { backgroundColor: colors.amber }]}>
              <Ionicons name="sparkles" size={18} color={colors.onAmber} />
            </View>
            <Text style={styles.pillarText}>Apoiar — cuidadores, enfermeiro e uma IA discreta.</Text>
          </View>
        </View>

        <Pressable
          testID="google-login-button"
          onPress={handleLogin}
          disabled={busy}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.onBrand} />
              <Text style={styles.ctaText}>Entrar com Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footnote}>
          Ao entrar, você organiza o cuidado de quem você ama — junto com a família.{"\n"}Seus dados são protegidos.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  logoMark: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  brand: { fontFamily: type.serif, fontSize: 24, color: colors.onSurface, fontWeight: "600" },
  hero: {
    borderRadius: radius.lg, overflow: "hidden", height: 260, marginBottom: spacing.xl,
    backgroundColor: colors.surfaceTertiary,
  },
  heroImage: { width: "100%", height: "100%" },
  title: { fontFamily: type.serif, fontSize: 40, lineHeight: 46, color: colors.onSurface, fontWeight: "600" },
  subtitle: {
    fontFamily: type.sans, fontSize: 17, lineHeight: 24,
    color: colors.onSurfaceSoft, marginTop: spacing.md, marginBottom: spacing.xl,
  },
  pillars: { gap: spacing.md, marginBottom: spacing.xl },
  pillar: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  pillarIcon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  pillarText: { flex: 1, fontFamily: type.sans, fontSize: 15, color: colors.onSurface, lineHeight: 20 },
  cta: {
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    ...shadow.card,
  },
  ctaText: { fontFamily: type.sans, fontSize: 17, fontWeight: "700", color: colors.onBrand },
  footnote: { fontFamily: type.sans, fontSize: 13, color: colors.onSurfaceSoft, textAlign: "center", marginTop: spacing.lg, lineHeight: 19 },
});

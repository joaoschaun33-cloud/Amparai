import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing, radius, type, shadow } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ConvitePublic() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, loading, authFetch, loginWithGoogle, refreshOnboarding } = useAuth();
  const [info, setInfo] = useState<{ invitation: { name: string; role: string; owner_name?: string; accepted: boolean }; elder_name: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAccept, setPendingAccept] = useState(false);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const r = await fetch(`${BACKEND}/api/invitations/${code}`);
        if (r.ok) setInfo(await r.json());
        else setNotFound(true);
      } catch { setNotFound(true); }
    })();
  }, [code]);

  const doAccept = useCallback(async () => {
    setAccepting(true);
    setError(null);
    try {
      const r = await authFetch(`/api/invitations/${code}/accept`, { method: "POST" });
      if (r.status === 201 || r.ok) {
        await refreshOnboarding?.();
        router.replace("/(tabs)/hoje");
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.detail || "Não consegui entrar no círculo agora.");
    } catch {
      setError("Não consegui entrar no círculo agora.");
    }
    setAccepting(false);
  }, [authFetch, code, refreshOnboarding, router]);

  const onCta = async () => {
    if (!user) { setPendingAccept(true); await loginWithGoogle(); return; }
    await doAccept();
  };

  // Fluxo "Entrar com Google" a partir do convite: depois do login, aceita sozinho.
  useEffect(() => {
    if (user && pendingAccept) { setPendingAccept(false); doAccept(); }
  }, [user, pendingAccept, doAccept]);

  if (notFound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.md, marginTop: spacing.xxl }}>
          <Ionicons name="alert-circle" size={48} color={colors.onSurfaceSoft} />
          <Text style={styles.title}>Convite inválido</Text>
          <Text style={styles.subtitle}>Este código não foi encontrado ou já expirou.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!info || loading) {
    return <View style={styles.container}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} testID="convite-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Ionicons name="heart" size={16} color={colors.onBrand} /></View>
          <Text style={styles.brand}>Amparai</Text>
        </View>

        <View style={styles.hero}>
          <Ionicons name="mail-open" size={48} color={colors.brand} />
        </View>

        <Text style={styles.title}>Oi, {info.invitation.name} 💛</Text>
        <Text style={styles.body}>
          Você foi convidado(a) para o <Text style={styles.bold}>círculo de cuidado de {info.elder_name}</Text> no Amparai.
        </Text>
        <Text style={styles.body}>
          Aqui a família se organiza junta: escala, remédios, saúde e custos — sem grupo caótico de WhatsApp.
        </Text>

        <View style={styles.roleCard}>
          <Text style={styles.roleLabel}>Seu papel no círculo</Text>
          <Text style={styles.roleValue}>{roleName(info.invitation.role)}</Text>
          <Text style={styles.roleDesc}>{roleDesc(info.invitation.role)}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={styles.cta}
          onPress={onCta}
          disabled={accepting}
          testID="accept-invite"
        >
          {accepting ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.ctaText}>{user ? "Entrar no círculo" : "Entrar com Google"}</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>Código: <Text style={styles.code}>{code}</Text></Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function roleName(r: string) {
  if (r === "coordenador") return "Coordenador(a)";
  if (r === "irmao") return "Irmão / irmã";
  if (r === "cuidador") return "Cuidador(a)";
  if (r === "profissional") return "Profissional de saúde";
  return r;
}
function roleDesc(r: string) {
  if (r === "coordenador") return "Você vê e decide tudo do cuidado.";
  if (r === "irmao") return "Você acompanha a escala e divide os custos.";
  if (r === "cuidador") return "Você registra remédios e confirma plantão.";
  if (r === "profissional") return "Você acessa os dados clínicos e a linha do tempo de saúde.";
  return "";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  logo: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  brand: { fontFamily: type.serif, fontSize: 18, color: colors.onSurface, fontWeight: "700" },
  hero: { alignSelf: "center", width: 96, height: 96, borderRadius: radius.pill, backgroundColor: "#FFF3EA", alignItems: "center", justifyContent: "center", marginVertical: spacing.lg },
  title: { fontFamily: type.serif, fontSize: 32, color: colors.onSurface, fontWeight: "600" },
  subtitle: { fontFamily: type.sans, fontSize: 15, color: colors.onSurfaceSoft, textAlign: "center" },
  body: { fontFamily: type.sans, fontSize: 16, color: colors.onSurface, lineHeight: 24, marginTop: spacing.md },
  bold: { fontWeight: "700", color: colors.brand },
  roleCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.xl },
  roleLabel: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  roleValue: { fontFamily: type.serif, fontSize: 22, color: colors.onSurface, fontWeight: "700", marginTop: 4 },
  roleDesc: { fontFamily: type.sans, fontSize: 14, color: colors.onSurfaceSoft, marginTop: 4 },
  cta: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16, alignItems: "center", marginTop: spacing.xl, ...shadow.card },
  ctaText: { fontFamily: type.sans, fontSize: 17, color: colors.onBrand, fontWeight: "700" },
  footer: { fontFamily: type.sans, fontSize: 12, color: colors.onSurfaceSoft, textAlign: "center", marginTop: spacing.xl },
  code: { fontFamily: type.serif, letterSpacing: 3, color: colors.brand, fontWeight: "700" },
  error: { fontFamily: type.sans, fontSize: 14, color: colors.clayRed, marginTop: spacing.md, textAlign: "center" },
});
